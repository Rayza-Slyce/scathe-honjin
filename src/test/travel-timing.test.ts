import { describe, expect, it } from 'vitest'
import {
  ARRIVAL_STATUS_GRACE_SECONDS,
  canonicalTravelDestination,
  estimateTravelEta,
  formatTravelTimeRemaining,
  TRAVEL_MINUTES,
} from '../features/travel/timing'

describe('current Torn travel-time table', () => {
  it('uses the post-23-June-2026 one-way travel times', () => {
    expect(TRAVEL_MINUTES.Mexico).toEqual({
      standard: 24,
      airstrip: 17,
      wlt: 12,
      business: 7,
    })
    expect(TRAVEL_MINUTES['South Africa']).toEqual({
      standard: 282,
      airstrip: 197,
      wlt: 141,
      business: 85,
    })
  })

  it('normalises country and city route names without guessing unknown routes', () => {
    expect(canonicalTravelDestination('London')).toBe('United Kingdom')
    expect(canonicalTravelDestination('UAE')).toBe('United Arab Emirates')
    expect(canonicalTravelDestination('Atlantis')).toBeNull()
  })
})

describe('observational ETA policy', () => {
  it('refuses to invent an ETA when take-off was not observed', () => {
    expect(
      estimateTravelEta({
        destination: 'China',
        method: 'airstrip',
        departureWindow: null,
        observedAt: 2_000,
      }),
    ).toEqual({
      status: 'unavailable',
      source: 'none',
      eta: null,
      confidence: 'unknown',
      label: 'ETA unavailable · take-off not observed',
      reasoning: ['Timing: no observed transition into travelling'],
    })
  })

  it('produces a bounded high-confidence ETA from a tight Airstrip departure window', () => {
    const result = estimateTravelEta({
      destination: 'China',
      method: 'airstrip',
      departureWindow: { earliestAt: 1_000, latestAt: 1_030 },
      observedAt: 1_030,
    })

    expect(result.status).toBe('available')
    expect(result.source).toBe('observed-transition')
    expect(result.confidence).toBe('high')
    expect(result.eta).toEqual({
      earliestAt: 10_312,
      latestAt: 10_918,
    })
  })

  it('treats an exact-method departure observed within two minutes as high timing confidence', () => {
    const result = estimateTravelEta({
      destination: 'Japan',
      method: 'airstrip',
      departureWindow: { earliestAt: 1_000, latestAt: 1_119 },
      observedAt: 1_119,
    })

    expect(result.status).toBe('available')
    expect(result.confidence).toBe('high')
    expect(result.reasoning).toContain(
      'Timing: take-off was observed within a 119-second window',
    )
  })

  it('treats a departure observed over two and up to five minutes as medium timing confidence', () => {
    const result = estimateTravelEta({
      destination: 'Japan',
      method: 'airstrip',
      departureWindow: { earliestAt: 1_000, latestAt: 1_121 },
      observedAt: 1_121,
    })

    expect(result.status).toBe('available')
    expect(result.confidence).toBe('medium')
    expect(result.reasoning).toContain(
      'Timing: take-off was observed within a 121-second window',
    )
  })

  it('keeps a six-to-ten-minute observed departure window as a low-confidence ETA', () => {
    const result = estimateTravelEta({
      destination: 'China',
      method: 'airstrip',
      departureWindow: { earliestAt: 1_000, latestAt: 1_419 },
      observedAt: 1_419,
    })

    expect(result.status).toBe('available')
    expect(result.confidence).toBe('low')
    expect(result.label).toBe('Broad ETA')
    expect(result.reasoning).toContain(
      'Timing: take-off was observed within a 419-second window',
    )
  })

  it('shows Standard as the primary airline baseline and BCT as a separate alternate', () => {
    const result = estimateTravelEta({
      destination: 'Mexico',
      method: 'airline',
      departureWindow: { earliestAt: 1_000, latestAt: 1_030 },
      observedAt: 1_030,
    })

    expect(result.status).toBe('available')
    expect(result.confidence).toBe('high')
    expect(result.eta).toEqual({
      earliestAt: 2_396,
      latestAt: 2_514,
    })
    expect(result.alternateEta).toEqual({
      earliestAt: 1_407,
      latestAt: 1_463,
    })
    expect(result.alternateLabel).toBe('Business Class alternate')
    expect(result.reasoning).toContain(
      'Timing methods: Standard baseline shown as the primary ETA; Business Class is shown separately as an alternate',
    )
  })

  it('eliminates Business Class once an airliner remains airborne beyond its latest normal arrival', () => {
    const result = estimateTravelEta({
      destination: 'China',
      method: 'airline',
      departureWindow: { earliestAt: 1_000, latestAt: 1_060 },
      observedAt: 5_400,
    })

    expect(result.status).toBe('available')
    expect(result.confidence).toBe('high')
    expect(result.eta).toEqual({
      earliestAt: 14_327,
      latestAt: 15_213,
    })
    expect(result.reasoning).toContain('Timing methods: standard')
    expect(result.alternateEta).toBeNull()
    expect(result.reasoning).toContain(
      'Timing evidence: player remains airborne beyond the latest normal Business Class arrival; ETA narrowed to Standard',
    )
  })

  it('keeps the BCT alternate before the Business Class window has expired', () => {
    const result = estimateTravelEta({
      destination: 'China',
      method: 'airline',
      departureWindow: { earliestAt: 1_000, latestAt: 1_060 },
      observedAt: 4_000,
    })

    expect(result.status).toBe('available')
    expect(result.confidence).toBe('high')
    expect(result.alternateEta).not.toBeNull()
    expect(result.reasoning).toContain(
      'Timing methods: Standard baseline shown as the primary ETA; Business Class is shown separately as an alternate',
    )
  })

  it('uses WLT timing for private-jet evidence', () => {
    const result = estimateTravelEta({
      destination: 'United Kingdom',
      method: 'private',
      departureWindow: { earliestAt: 1_000, latestAt: 1_060 },
      observedAt: 1_060,
    })

    expect(result.status).toBe('available')
    expect(result.confidence).toBe('high')
    expect(result.reasoning).toContain('Timing methods: wlt')
    expect(result.eta).not.toBeNull()

    const width = result.eta!.latestAt - result.eta!.earliestAt
    expect(width).toBeGreaterThan(4 * 60)
    expect(width).toBeLessThan(6 * 60)
  })

  it('scales normal Airstrip ETA width by destination duration', () => {
    const mexico = estimateTravelEta({
      destination: 'Mexico',
      method: 'airstrip',
      departureWindow: { earliestAt: 1_000, latestAt: 1_060 },
      observedAt: 1_060,
    })
    const japan = estimateTravelEta({
      destination: 'Japan',
      method: 'airstrip',
      departureWindow: { earliestAt: 1_000, latestAt: 1_060 },
      observedAt: 1_060,
    })

    expect(mexico.eta).not.toBeNull()
    expect(japan.eta).not.toBeNull()
    const mexicoWidth = mexico.eta!.latestAt - mexico.eta!.earliestAt
    const japanWidth = japan.eta!.latestAt - japan.eta!.earliestAt
    expect(mexicoWidth).toBeLessThan(japanWidth)
    expect(mexicoWidth).toBeLessThanOrEqual(130)
    expect(japanWidth).toBeGreaterThanOrEqual(590)
  })

  it('rejects an offline observation gap when its ETA is not genuinely useful', () => {
    const result = estimateTravelEta({
      destination: 'Mexico',
      method: 'airstrip',
      departureWindow: { earliestAt: 1_000, latestAt: 3_000 },
      observedAt: 3_000,
    })

    expect(result).toMatchObject({
      status: 'unavailable',
      eta: null,
      confidence: 'low',
      label: 'ETA unavailable · departure window too broad',
    })
  })

  it('keeps method confidence independent from timing confidence', () => {
    const result = estimateTravelEta({
      destination: 'Japan',
      method: 'unknown',
      departureWindow: { earliestAt: 1_000, latestAt: 1_020 },
      observedAt: 1_020,
    })

    expect(result.status).toBe('available')
    expect(result.confidence).toBe('high')
    expect(result.label).toBe('ETA window')
  })
  it('rejects a long observed departure interval instead of rendering a huge Airstrip ETA', () => {
    const result = estimateTravelEta({
      destination: 'United Kingdom',
      method: 'airstrip',
      departureWindow: { earliestAt: 1_000, latestAt: 3_700 },
      observedAt: 3_700,
    })

    expect(result).toMatchObject({
      status: 'unavailable',
      eta: null,
      label: 'ETA unavailable · departure window too broad',
    })
    expect(result.reasoning[0]).toBe(
      'Timing: take-off was observed within a 2700-second window',
    )
  })

  it('holds a just-expired Airstrip ETA in a short arrival-status grace', () => {
    const result = estimateTravelEta({
      destination: 'Mexico',
      method: 'airstrip',
      departureWindow: { earliestAt: 1_000, latestAt: 1_120 },
      observedAt: 2_250,
    })

    expect(ARRIVAL_STATUS_GRACE_SECONDS).toBe(120)
    expect(result).toMatchObject({
      status: 'available',
      source: 'observed-transition',
      confidence: 'high',
      label: 'Arrival due · awaiting travel update',
      eta: { earliestAt: 2_171, latestAt: 2_171 },
    })
    expect(result.reasoning).toContain(
      'Timing: latest normal arrival passed 79 seconds before the current travel observation',
    )
  })

  it('declares a timing conflict once the arrival-status grace expires', () => {
    const result = estimateTravelEta({
      destination: 'Mexico',
      method: 'airstrip',
      departureWindow: { earliestAt: 1_000, latestAt: 1_120 },
      observedAt: 2_292,
    })

    expect(result).toMatchObject({
      status: 'unavailable',
      eta: null,
      confidence: 'low',
      label: 'ETA unavailable · timing evidence conflicts',
    })
  })

  it('uses the arrival-status grace after every normal airliner method has expired', () => {
    const result = estimateTravelEta({
      destination: 'Mexico',
      method: 'airline',
      departureWindow: { earliestAt: 1_000, latestAt: 1_030 },
      observedAt: 2_570,
    })

    expect(result).toMatchObject({
      status: 'available',
      confidence: 'high',
      label: 'Arrival due · awaiting travel update',
      eta: { earliestAt: 2_514, latestAt: 2_514 },
      alternateEta: null,
    })
  })

  it('formats ETA windows as timezone-independent time remaining', () => {
    expect(
      formatTravelTimeRemaining(
        { earliestAt: 10_460, latestAt: 10_880 },
        5_000,
      ),
    ).toBe('1h 31m–1h 38m')

    expect(
      formatTravelTimeRemaining(
        { earliestAt: 5_020, latestAt: 5_040 },
        5_000,
      ),
    ).toBe('1m')

    expect(
      formatTravelTimeRemaining(
        { earliestAt: 4_990, latestAt: 4_990 },
        5_000,
      ),
    ).toBe('ARRIVAL DUE · awaiting travel update')
  })

})
