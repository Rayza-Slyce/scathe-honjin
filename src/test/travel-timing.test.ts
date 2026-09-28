import { describe, expect, it } from 'vitest'
import {
  canonicalTravelDestination,
  estimateTravelEta,
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

  it('keeps airline Standard/BCT ambiguity in the ETA window', () => {
    const result = estimateTravelEta({
      destination: 'Mexico',
      method: 'airline',
      departureWindow: { earliestAt: 1_000, latestAt: 1_030 },
      observedAt: 1_030,
    })

    expect(result.status).toBe('available')
    expect(result.confidence).toBe('medium')
    expect(result.eta).toEqual({
      earliestAt: 1_407,
      latestAt: 2_514,
    })
    expect(result.reasoning).toContain('Timing methods: standard/business')
  })

  it('keeps private-jet timing broad instead of assuming WLT', () => {
    const result = estimateTravelEta({
      destination: 'Mexico',
      method: 'private',
      departureWindow: { earliestAt: 1_000, latestAt: 1_030 },
      observedAt: 1_030,
    })

    expect(result.status).toBe('available')
    expect(result.confidence).toBe('low')
    expect(result.reasoning).toContain(
      'Timing methods: standard/airstrip/wlt/business',
    )
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
    expect(result.confidence).toBe('low')
    expect(result.label).toBe('Broad ETA')
  })
})
