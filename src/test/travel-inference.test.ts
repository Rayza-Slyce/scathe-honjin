import { describe, expect, it } from 'vitest'
import {
  deriveDepartureObservationWindow,
  inferTravelMethod,
  parseTravelRoute,
  type TravelStatusSample,
} from '../features/travel/inference'

function sample(
  overrides: Partial<TravelStatusSample> = {},
): TravelStatusSample {
  return {
    state: 'okay',
    description: 'Okay',
    planeImageType: null,
    observedAt: 1_000,
    ...overrides,
  }
}

describe('travel route parsing', () => {
  it('parses outbound and inbound Torn travel descriptions', () => {
    expect(
      parseTravelRoute(
        sample({
          state: 'travelling',
          description: 'Traveling to China',
        }),
      ),
    ).toEqual({
      origin: 'Torn',
      destination: 'China',
      direction: 'outbound',
    })

    expect(
      parseTravelRoute(
        sample({
          state: 'travelling',
          description: 'Returning from China',
        }),
      ),
    ).toEqual({
      origin: 'China',
      destination: 'Torn',
      direction: 'inbound',
    })


    expect(
      parseTravelRoute(
        sample({
          state: 'travelling',
          description: 'Traveling from Canada to Torn',
        }),
      ),
    ).toEqual({
      origin: 'Canada',
      destination: 'Torn',
      direction: 'inbound',
    })

    expect(
      parseTravelRoute(
        sample({
          state: 'travelling',
          description: 'Traveling from Torn to Argentina',
        }),
      ),
    ).toEqual({
      origin: 'Torn',
      destination: 'Argentina',
      direction: 'outbound',
    })

    expect(
      parseTravelRoute(
        sample({
          state: 'travelling',
          description: 'Returning to Torn from Mexico',
        }),
      ),
    ).toEqual({
      origin: 'Mexico',
      destination: 'Torn',
      direction: 'inbound',
    })
  })

  it('does not invent a route from an unrecognised description', () => {
    expect(
      parseTravelRoute(
        sample({
          state: 'travelling',
          description: 'Traveling',
        }),
      ),
    ).toEqual({
      origin: null,
      destination: null,
      direction: 'unknown',
    })
  })
})

describe('travel departure observation', () => {
  it('uses genuine before/after observations as the departure window', () => {
    expect(
      deriveDepartureObservationWindow(
        sample({ observedAt: 1_000 }),
        sample({
          state: 'travelling',
          description: 'Traveling to China',
          observedAt: 1_060,
        }),
      ),
    ).toEqual({
      earliestAt: 1_000,
      latestAt: 1_060,
    })
  })

  it('does not invent take-off timing when first observed already airborne', () => {
    expect(
      deriveDepartureObservationWindow(
        null,
        sample({
          state: 'travelling',
          observedAt: 1_060,
        }),
      ),
    ).toBeNull()
  })

  it('does not create another departure window from two airborne samples', () => {
    expect(
      deriveDepartureObservationWindow(
        sample({
          state: 'travelling',
          observedAt: 1_000,
        }),
        sample({
          state: 'travelling',
          observedAt: 1_060,
        }),
      ),
    ).toBeNull()
  })
})

describe('deterministic travel-method inference', () => {
  it('requires agreeing fresh Airstrip and Pilot evidence for high confidence', () => {
    expect(
      inferTravelMethod('light_aircraft', {
        propertyType: 'Private Island',
        airstripPresent: true,
        pilotPresent: true,
        checkedAt: 990,
        fresh: true,
      }),
    ).toMatchObject({
      method: 'airstrip',
      label: 'Likely Airstrip',
      confidence: 'high',
    })
  })

  it('reduces Airstrip confidence when property support is partial or stale', () => {
    expect(
      inferTravelMethod('light_aircraft', {
        propertyType: 'Private Island',
        airstripPresent: true,
        pilotPresent: false,
        checkedAt: 900,
        fresh: true,
      }).confidence,
    ).toBe('medium')

    expect(
      inferTravelMethod('light_aircraft', {
        propertyType: 'Private Island',
        airstripPresent: true,
        pilotPresent: true,
        checkedAt: 100,
        fresh: false,
      }).confidence,
    ).toBe('medium')
  })

  it('preserves Standard/BCT ambiguity for airliner evidence', () => {
    expect(
      inferTravelMethod('airliner', null),
    ).toMatchObject({
      method: 'airline',
      label: 'Airline travel · Standard/BCT unclear',
      confidence: 'medium',
    })
  })

  it('keeps private-jet method semantics explicitly unverified', () => {
    expect(
      inferTravelMethod('private_jet', null),
    ).toMatchObject({
      method: 'private',
      label: 'Private travel · exact method unclear',
      confidence: 'medium',
    })
  })

  it('falls back without forcing a method when evidence is missing', () => {
    expect(inferTravelMethod(null, null)).toMatchObject({
      method: 'unknown',
      label: 'Method unknown',
      confidence: 'low',
    })
  })
})
