import type { PlayerId } from '../../types'
import {
  deriveDepartureObservationWindow,
  inferTravelMethod,
  parseTravelRoute,
  type DepartureObservationWindow,
  type PropertyTravelEvidence,
  type TravelMethodInference,
  type TravelRoute,
  type TravelStatusSample,
} from './inference'
import {
  completeTravelHistory,
  deriveArrivalObservationWindow,
  type CompletedTravelHistoryEntry,
} from './history'
import { estimateTravelEta, type TravelTimingEstimate } from './timing'

export interface ActiveTravelObservation {
  route: TravelRoute
  departureWindow: DepartureObservationWindow | null
  originalMethod: TravelMethodInference
  originalTiming: TravelTimingEstimate
}

export interface PlayerTravelObservationState {
  playerId: PlayerId
  previousSample: TravelStatusSample | null
  activeJourney: ActiveTravelObservation | null
  history: readonly CompletedTravelHistoryEntry[]
}

export function emptyPlayerTravelObservationState(
  playerId: PlayerId,
): PlayerTravelObservationState {
  return { playerId, previousSample: null, activeJourney: null, history: [] }
}

function beginJourney(input: {
  previous: TravelStatusSample | null
  current: TravelStatusSample
  propertyEvidence: PropertyTravelEvidence | null
}): ActiveTravelObservation {
  const route = parseTravelRoute(input.current)
  const departureWindow = deriveDepartureObservationWindow(input.previous, input.current)
  const originalMethod = inferTravelMethod(
    input.current.planeImageType,
    input.propertyEvidence,
  )
  const originalTiming = estimateTravelEta({
    destination: route.direction === 'inbound' ? route.origin : route.destination,
    method: originalMethod.method,
    departureWindow,
    observedAt: input.current.observedAt,
  })

  return { route, departureWindow, originalMethod, originalTiming }
}

export function observePlayerTravel(input: {
  state: PlayerTravelObservationState
  sample: TravelStatusSample
  propertyEvidence?: PropertyTravelEvidence | null
}): PlayerTravelObservationState {
  const previous = input.state.previousSample
  const current = input.sample

  if (previous !== null && current.observedAt < previous.observedAt) {
    return input.state
  }

  let activeJourney = input.state.activeJourney
  let history = input.state.history

  if (current.state === 'travelling' && activeJourney === null) {
    activeJourney = beginJourney({
      previous,
      current,
      propertyEvidence: input.propertyEvidence ?? null,
    })
  } else if (current.state === 'travelling' && activeJourney !== null) {
    const parsedRoute = parseTravelRoute(current)

    // Reconcile the current live route with persisted journey state. A
    // route change can mean HONJIN missed arrival/turnaround while closed.
    const routeChanged =
      parsedRoute.direction !== 'unknown' &&
      activeJourney.route.direction !== 'unknown' &&
      (parsedRoute.direction !== activeJourney.route.direction ||
        parsedRoute.origin !== activeJourney.route.origin ||
        parsedRoute.destination !== activeJourney.route.destination)

    if (routeChanged) {
      // HONJIN may miss the arrival/turnaround while the PWA is closed. A
      // newly observed route is a new journey, but its take-off was not
      // observed, so never carry the old route or departure timing forward.
      activeJourney = beginJourney({
        previous: null,
        current,
        propertyEvidence: input.propertyEvidence ?? null,
      })
    } else if (
      activeJourney.route.direction === 'unknown' &&
      parsedRoute.direction !== 'unknown'
    ) {
      activeJourney = {
        ...activeJourney,
        route: parsedRoute,
        originalTiming: estimateTravelEta({
          destination:
            parsedRoute.direction === 'inbound'
              ? parsedRoute.origin
              : parsedRoute.destination,
          method: activeJourney.originalMethod.method,
          departureWindow: activeJourney.departureWindow,
          observedAt: current.observedAt,
        }),
      }
    }

    if (
      input.propertyEvidence &&
      current.planeImageType === 'light_aircraft'
    ) {
      const refinedMethod = inferTravelMethod(
        current.planeImageType,
        input.propertyEvidence,
      )

      if (refinedMethod.method === 'airstrip') {
        activeJourney = {
          ...activeJourney,
          originalMethod: refinedMethod,
          originalTiming: estimateTravelEta({
            destination:
              activeJourney.route.direction === 'inbound'
                ? activeJourney.route.origin
                : activeJourney.route.destination,
            method: refinedMethod.method,
            departureWindow: activeJourney.departureWindow,
            observedAt: current.observedAt,
          }),
        }
      }
    }
  } else if (current.state !== 'travelling' && activeJourney !== null) {
    const arrivalWindow = deriveArrivalObservationWindow(previous, current)

    if (arrivalWindow !== null && activeJourney.departureWindow !== null) {
      history = [
        ...history,
        completeTravelHistory({
          route: activeJourney.route,
          departureWindow: activeJourney.departureWindow,
          arrivalWindow,
          originalMethod: activeJourney.originalMethod,
          originalTiming: activeJourney.originalTiming,
        }),
      ]
    }

    activeJourney = null
  }

  return {
    playerId: input.state.playerId,
    previousSample: { ...current },
    activeJourney,
    history,
  }
}
