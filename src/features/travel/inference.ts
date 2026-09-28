import type {
  Confidence,
  EpochSeconds,
  PlaneImageType,
  PlayerState,
  TravelDirection,
  TravelMethod,
  TravelPropertyEvidence,
} from '../../types'

export interface TravelStatusSample {
  state: PlayerState
  description: string | null
  planeImageType: PlaneImageType | null
  statusUntil?: EpochSeconds | null
  lastActionAt?: EpochSeconds | null
  observedAt: EpochSeconds
}

export interface TravelRoute {
  origin: string | null
  destination: string | null
  direction: TravelDirection
}

export interface DepartureObservationWindow {
  earliestAt: EpochSeconds
  latestAt: EpochSeconds
}

export type PropertyTravelEvidence = Omit<
  TravelPropertyEvidence,
  'playerId'
> & {
  fresh: boolean
}

export interface TravelMethodInference {
  method: TravelMethod
  label: string
  confidence: Confidence
  reasoning: readonly string[]
}

function placeFromDescription(
  description: string | null,
  pattern: RegExp,
): string | null {
  const match = description?.trim().match(pattern)
  const place = match?.[1]?.trim()
  return place ? place : null
}

export function parseTravelRoute(
  sample: Pick<TravelStatusSample, 'state' | 'description'>,
): TravelRoute {
  if (sample.state === 'travelling') {
    const between = sample.description
      ?.trim()
      .match(/^travell?ing from\s+(.+?)\s+to\s+(.+)$/i)

    if (between) {
      const origin = between[1]?.trim() || null
      const destination = between[2]?.trim() || null

      if (origin !== null && destination !== null) {
        return {
          origin,
          destination,
          direction:
            origin.toLowerCase() === 'torn'
              ? 'outbound'
              : destination.toLowerCase() === 'torn'
                ? 'inbound'
                : 'unknown',
        }
      }
    }

    const destination = placeFromDescription(
      sample.description,
      /^travell?ing to\s+(.+)$/i,
    )
    if (destination !== null) {
      return {
        origin: 'Torn',
        destination,
        direction: 'outbound',
      }
    }

    const returningToTorn = sample.description
      ?.trim()
      .match(/^returning\s+to\s+torn(?:\s+city)?\s+from\s+(.+)$/i)

    if (returningToTorn) {
      const origin = returningToTorn[1]?.trim() || null
      if (origin !== null) {
        return {
          origin,
          destination: 'Torn',
          direction: 'inbound',
        }
      }
    }

    const origin = placeFromDescription(
      sample.description,
      /^returning from\s+(.+)$/i,
    )
    if (origin !== null) {
      return {
        origin,
        destination: 'Torn',
        direction: 'inbound',
      }
    }
  }

  if (sample.state === 'abroad') {
    const destination = placeFromDescription(
      sample.description,
      /^in\s+(.+)$/i,
    )
    return {
      origin: null,
      destination,
      direction: 'unknown',
    }
  }

  return {
    origin: null,
    destination: null,
    direction: 'unknown',
  }
}

export function deriveDepartureObservationWindow(
  previous: TravelStatusSample | null,
  current: TravelStatusSample,
): DepartureObservationWindow | null {
  if (current.state !== 'travelling') {
    return null
  }

  if (previous === null || previous.state === 'travelling') {
    return null
  }

  if (previous.observedAt > current.observedAt) {
    return null
  }

  return {
    earliestAt: previous.observedAt,
    latestAt: current.observedAt,
  }
}

function propertyReasoning(
  evidence: PropertyTravelEvidence | null,
): string[] {
  if (evidence === null) {
    return ['Current property evidence: unavailable']
  }

  return [
    `Current property: ${evidence.propertyType ?? 'unknown'}`,
    `Airstrip modification: ${evidence.airstripPresent === true ? 'present' : evidence.airstripPresent === false ? 'absent' : 'unknown'}`,
    `Pilot staff: ${evidence.pilotPresent === true ? 'present' : evidence.pilotPresent === false ? 'absent' : 'unknown'}`,
    `Property evidence: ${evidence.fresh ? 'fresh' : 'stale'}`,
  ]
}

export function inferTravelMethod(
  planeImageType: PlaneImageType | null,
  propertyEvidence: PropertyTravelEvidence | null,
): TravelMethodInference {
  const aircraft = planeImageType ?? 'unknown'
  const reasoning = [
    `Aircraft image: ${aircraft}`,
    ...propertyReasoning(propertyEvidence),
  ]

  if (aircraft === 'airliner') {
    return {
      method: 'airline',
      label: 'Airline travel · Standard/BCT unclear',
      confidence: 'medium',
      reasoning: [
        ...reasoning,
        'Inference: airline image cannot distinguish Standard from Business Class',
      ],
    }
  }

  if (aircraft === 'private_jet') {
    return {
      method: 'private',
      label: 'Private travel · exact method unclear',
      confidence: 'medium',
      reasoning: [
        ...reasoning,
        'Inference: private-jet image observed; exact opponent method remains unverified',
      ],
    }
  }

  if (aircraft === 'light_aircraft') {
    const hasAirstrip = propertyEvidence?.airstripPresent === true
    const hasPilot = propertyEvidence?.pilotPresent === true
    const propertyFresh = propertyEvidence?.fresh === true

    if (hasAirstrip && hasPilot && propertyFresh) {
      return {
        method: 'airstrip',
        label: 'Likely Airstrip',
        confidence: 'high',
        reasoning: [
          ...reasoning,
          'Inference: light-aircraft image agrees with fresh Airstrip and Pilot evidence',
        ],
      }
    }

    if (hasAirstrip || hasPilot) {
      return {
        method: 'airstrip',
        label: 'Likely Airstrip',
        confidence: 'medium',
        reasoning: [
          ...reasoning,
          propertyFresh
            ? 'Inference: light-aircraft image has only partial Airstrip/Pilot support'
            : 'Inference: light-aircraft image has stale or partial property support',
        ],
      }
    }
  }

  return {
    method: 'unknown',
    label: 'Method unknown',
    confidence: 'low',
    reasoning: [
      ...reasoning,
      'Inference: available evidence does not support a more specific method',
    ],
  }
}
