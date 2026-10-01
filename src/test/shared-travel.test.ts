import { describe, expect, it, vi } from 'vitest'
import {
  loadSharedTravelObservations,
  type SharedTravelObservation,
} from '../api/honjin-intel/live'
import { emptyPlayerTravelObservationState } from '../features/travel/observation-state'
import { mergeSharedTravelObservation } from '../features/travel/shared-observation'

const shared: SharedTravelObservation = {
  playerId: 7,
  factionId: 8317,
  observedAt: 2_000,
  state: 'travelling',
  description: 'Traveling from Torn to Japan',
  planeImageType: 'light_aircraft',
  statusUntil: null,
  lastActionAt: 1_990,
  departureWindow: { earliestAt: 1_940, latestAt: 2_000 },
  transitionKind: 'travel-start',
  route: { origin: 'Torn', destination: 'Japan', direction: 'outbound' },
}

describe('shared travel intel', () => {
  it('normalises the read-only public response by player ID', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      observations: [shared],
    }), { status: 200 })) as unknown as typeof fetch

    const result = await loadSharedTravelObservations([7, 7], fetcher)

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.get(7)).toEqual(shared)
  })

  it('fills a missing local departure window from a fresh matching shared observation', () => {
    const result = mergeSharedTravelObservation({
      state: emptyPlayerTravelObservationState(7),
      current: {
        state: 'travelling',
        description: 'Traveling from Torn to Japan',
        planeImageType: 'light_aircraft',
        observedAt: 2_030,
      },
      shared,
      propertyEvidence: {
        propertyType: 'Private Island',
        airstripPresent: true,
        checkedAt: 2_020,
        fresh: true,
      },
    })

    expect(result.usedSharedDeparture).toBe(true)
    expect(result.state.activeJourney).toMatchObject({
      departureWindow: { earliestAt: 1_940, latestAt: 2_000 },
      originalMethod: { method: 'airstrip' },
      originalTiming: { status: 'available', source: 'observed-transition' },
    })
  })


  it('intersects compatible local and shared departure windows to tighten timing evidence', () => {
    const state = emptyPlayerTravelObservationState(7)
    state.activeJourney = {
      route: { origin: 'Torn', destination: 'Japan', direction: 'outbound' },
      departureWindow: { earliestAt: 1_900, latestAt: 1_980 },
      originalMethod: {
        method: 'airstrip',
        label: 'Likely Airstrip',
        confidence: 'high',
        reasoning: [],
      },
      originalTiming: {
        status: 'available',
        source: 'observed-transition',
        eta: { earliestAt: 10_000, latestAt: 10_600 },
        confidence: 'high',
        label: 'ETA window',
        reasoning: [],
      },
    }

    const result = mergeSharedTravelObservation({
      state,
      current: {
        state: 'travelling',
        description: 'Traveling from Torn to Japan',
        planeImageType: 'light_aircraft',
        observedAt: 2_030,
      },
      shared: {
        ...shared,
        departureWindow: { earliestAt: 1_940, latestAt: 2_000 },
      },
      propertyEvidence: {
        propertyType: 'Private Island',
        airstripPresent: true,
        checkedAt: 2_020,
        fresh: true,
      },
    })

    expect(result.usedSharedDeparture).toBe(true)
    expect(result.state.activeJourney?.departureWindow).toEqual({
      earliestAt: 1_940,
      latestAt: 1_980,
    })
  })

  it('does not use shared timing evidence for a different current route', () => {
    const result = mergeSharedTravelObservation({
      state: emptyPlayerTravelObservationState(7),
      current: {
        state: 'travelling',
        description: 'Traveling from Torn to China',
        planeImageType: 'light_aircraft',
        observedAt: 2_030,
      },
      shared,
    })

    expect(result.usedSharedDeparture).toBe(false)
    expect(result.state.activeJourney).toBeNull()
  })
})
