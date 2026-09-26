import { describe, expect, it } from 'vitest'
import { emptyPlayerTravelObservationState, observePlayerTravel } from '../features/travel/observation-state'
import { createMemoryTravelObservationStore, normaliseTravelObservationState } from '../storage/travel-observation'

const groundedProperty = {
  propertyType: 'Private Island',
  airstripPresent: true,
  pilotPresent: true,
  checkedAt: 1000,
  fresh: true,
} as const

describe('travel observation lifecycle', () => {
  it('does not invent take-off timing when first observed already airborne', () => {
    const state = observePlayerTravel({
      state: emptyPlayerTravelObservationState(7),
      sample: { state: 'travelling', description: 'Traveling to Mexico', planeImageType: 'light_aircraft', observedAt: 2000 },
      propertyEvidence: groundedProperty,
    })

    expect(state.activeJourney?.departureWindow).toBeNull()
    expect(state.activeJourney?.originalTiming.label).toBe('ETA unavailable · take-off not observed')
  })

  it('preserves the original inference across later airborne observations', () => {
    let state = observePlayerTravel({
      state: emptyPlayerTravelObservationState(7),
      sample: { state: 'okay', description: null, planeImageType: null, observedAt: 1000 },
    })
    state = observePlayerTravel({
      state,
      sample: { state: 'travelling', description: 'Traveling to Mexico', planeImageType: 'light_aircraft', observedAt: 1030 },
      propertyEvidence: groundedProperty,
    })
    const original = state.activeJourney

    state = observePlayerTravel({
      state,
      sample: { state: 'travelling', description: 'Traveling to Mexico', planeImageType: 'airliner', observedAt: 1100 },
      propertyEvidence: null,
    })

    expect(state.activeJourney).toEqual(original)
  })

  it('repairs an unknown persisted route when a later sample is parseable', () => {
    let state = observePlayerTravel({
      state: emptyPlayerTravelObservationState(7),
      sample: { state: 'okay', description: null, planeImageType: null, observedAt: 1000 },
    })
    state = observePlayerTravel({
      state,
      sample: { state: 'travelling', description: 'En route', planeImageType: 'airliner', observedAt: 1030 },
    })

    expect(state.activeJourney?.route.direction).toBe('unknown')
    expect(state.activeJourney?.originalTiming.label).toBe('ETA unavailable · route unknown')

    state = observePlayerTravel({
      state,
      sample: { state: 'travelling', description: 'Traveling from Torn to Canada', planeImageType: 'airliner', observedAt: 1100 },
    })

    expect(state.activeJourney?.route).toEqual({
      origin: 'Torn',
      destination: 'Canada',
      direction: 'outbound',
    })
    expect(state.activeJourney?.originalTiming.label).not.toBe('ETA unavailable · route unknown')
    expect(state.activeJourney?.originalMethod.method).toBe('airline')
  })

  it('starts a new inbound journey when a missed turnaround changes the observed route', () => {
    let state = observePlayerTravel({
      state: emptyPlayerTravelObservationState(7),
      sample: { state: 'travelling', description: 'Traveling from Torn to United Kingdom', planeImageType: 'airliner', observedAt: 1000 },
    })

    expect(state.activeJourney?.route.direction).toBe('outbound')

    state = observePlayerTravel({
      state,
      sample: { state: 'travelling', description: 'Traveling from United Kingdom to Torn', planeImageType: 'airliner', observedAt: 5000 },
    })

    expect(state.activeJourney?.route).toEqual({
      origin: 'United Kingdom',
      destination: 'Torn',
      direction: 'inbound',
    })
    expect(state.activeJourney?.departureWindow).toBeNull()
    expect(state.activeJourney?.originalTiming.label).toBe('ETA unavailable · take-off not observed')
  })

  it('keeps a broad offline departure gap as a window rather than elapsed flight time', () => {
    let state = observePlayerTravel({
      state: emptyPlayerTravelObservationState(7),
      sample: { state: 'okay', description: null, planeImageType: null, observedAt: 1000 },
    })
    state = observePlayerTravel({
      state,
      sample: { state: 'travelling', description: 'Traveling to Mexico', planeImageType: 'light_aircraft', observedAt: 4000 },
      propertyEvidence: groundedProperty,
    })

    expect(state.activeJourney?.departureWindow).toEqual({ earliestAt: 1000, latestAt: 4000 })
    expect(state.activeJourney?.originalTiming.label).toBe('ETA unavailable · departure window too broad')
  })

  it('records a completed journey only when both departure and arrival were observed', () => {
    let state = observePlayerTravel({
      state: emptyPlayerTravelObservationState(7),
      sample: { state: 'okay', description: null, planeImageType: null, observedAt: 1000 },
    })
    state = observePlayerTravel({
      state,
      sample: { state: 'travelling', description: 'Traveling to Mexico', planeImageType: 'light_aircraft', observedAt: 1030 },
      propertyEvidence: groundedProperty,
    })
    state = observePlayerTravel({
      state,
      sample: { state: 'abroad', description: 'In Mexico', planeImageType: null, observedAt: 2100 },
    })

    expect(state.activeJourney).toBeNull()
    expect(state.history).toHaveLength(1)
    expect(state.history[0].originalMethod).toBe('airstrip')
  })

  it('does not manufacture completed history for a journey first seen airborne', () => {
    let state = observePlayerTravel({
      state: emptyPlayerTravelObservationState(7),
      sample: { state: 'travelling', description: 'Traveling to Mexico', planeImageType: 'airliner', observedAt: 1000 },
    })
    state = observePlayerTravel({
      state,
      sample: { state: 'abroad', description: 'In Mexico', planeImageType: null, observedAt: 2000 },
    })

    expect(state.history).toHaveLength(0)
  })

  it('ignores an older sample so persisted observations cannot move backwards', () => {
    const state = observePlayerTravel({
      state: emptyPlayerTravelObservationState(7),
      sample: { state: 'okay', description: null, planeImageType: null, observedAt: 2000 },
    })
    expect(observePlayerTravel({
      state,
      sample: { state: 'travelling', description: 'Traveling to Japan', planeImageType: 'airliner', observedAt: 1999 },
    })).toEqual(state)
  })
})

describe('travel observation persistence', () => {
  it('round-trips observation state per current user and opponent', async () => {
    const store = createMemoryTravelObservationStore()
    const state = observePlayerTravel({
      state: emptyPlayerTravelObservationState(7),
      sample: { state: 'travelling', description: 'Traveling to Japan', planeImageType: 'airliner', observedAt: 2000 },
    })

    await store.save(42, state)
    expect(await store.load(42, 7)).toEqual(state)
    expect(await store.load(43, 7)).toEqual(emptyPlayerTravelObservationState(7))
  })

  it('rejects malformed persisted timing evidence instead of repairing it', () => {
    expect(normaliseTravelObservationState(7, {
      playerId: 7,
      previousSample: { state: 'travelling', observedAt: 'yesterday' },
      history: [],
    })).toEqual(emptyPlayerTravelObservationState(7))
  })
})
