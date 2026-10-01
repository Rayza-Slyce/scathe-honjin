import type { SharedTravelObservation } from '../../api/honjin-intel/live'
import {
  inferTravelMethod,
  parseTravelRoute,
  type PropertyTravelEvidence,
  type TravelRoute,
  type TravelStatusSample,
} from './inference'
import {
  type ActiveTravelObservation,
  type PlayerTravelObservationState,
} from './observation-state'
import { estimateTravelEta } from './timing'

const MAX_SHARED_OBSERVATION_SKEW_SECONDS = 180

function sameRoute(left: TravelRoute, right: TravelRoute): boolean {
  return (
    left.direction === right.direction &&
    left.origin === right.origin &&
    left.destination === right.destination
  )
}

function windowWidth(
  active: ActiveTravelObservation | null,
): number {
  const window = active?.departureWindow
  return window === null || window === undefined
    ? Number.POSITIVE_INFINITY
    : Math.max(0, window.latestAt - window.earliestAt)
}

export function mergeSharedTravelObservation(input: {
  state: PlayerTravelObservationState
  current: TravelStatusSample
  shared: SharedTravelObservation | null
  propertyEvidence?: PropertyTravelEvidence | null
}): {
  state: PlayerTravelObservationState
  usedSharedDeparture: boolean
  sharedTransitionKind: SharedTravelObservation['transitionKind']
} {
  const shared = input.shared

  if (
    shared === null ||
    input.current.state !== 'travelling' ||
    shared.state !== 'travelling' ||
    shared.departureWindow === null ||
    shared.route === null ||
    Math.abs(input.current.observedAt - shared.observedAt) >
      MAX_SHARED_OBSERVATION_SKEW_SECONDS
  ) {
    return {
      state: input.state,
      usedSharedDeparture: false,
      sharedTransitionKind: null,
    }
  }

  const currentRoute = parseTravelRoute(input.current)
  if (
    currentRoute.direction === 'unknown' ||
    !sameRoute(currentRoute, shared.route)
  ) {
    return {
      state: input.state,
      usedSharedDeparture: false,
      sharedTransitionKind: null,
    }
  }

  const method = inferTravelMethod(
    input.current.planeImageType ?? shared.planeImageType,
    input.propertyEvidence ?? null,
  )
  const timing = estimateTravelEta({
    destination:
      currentRoute.direction === 'inbound'
        ? currentRoute.origin
        : currentRoute.destination,
    method: method.method,
    departureWindow: shared.departureWindow,
    observedAt: input.current.observedAt,
  })
  const sharedActive: ActiveTravelObservation = {
    route: currentRoute,
    departureWindow: shared.departureWindow,
    originalMethod: method,
    originalTiming: timing,
  }

  const localActive = input.state.activeJourney
  if (
    localActive?.departureWindow &&
    sameRoute(localActive.route, currentRoute)
  ) {
    const earliestAt = Math.max(
      localActive.departureWindow.earliestAt,
      shared.departureWindow.earliestAt,
    )
    const latestAt = Math.min(
      localActive.departureWindow.latestAt,
      shared.departureWindow.latestAt,
    )

    if (earliestAt <= latestAt) {
      const departureWindow = { earliestAt, latestAt }
      const intersectedActive: ActiveTravelObservation = {
        route: currentRoute,
        departureWindow,
        originalMethod: method,
        originalTiming: estimateTravelEta({
          destination:
            currentRoute.direction === 'inbound'
              ? currentRoute.origin
              : currentRoute.destination,
          method: method.method,
          departureWindow,
          observedAt: input.current.observedAt,
        }),
      }

      if (windowWidth(intersectedActive) < windowWidth(localActive)) {
        return {
          state: {
            ...input.state,
            activeJourney: intersectedActive,
          },
          usedSharedDeparture: true,
          sharedTransitionKind: shared.transitionKind,
        }
      }
    }
  }

  if (windowWidth(input.state.activeJourney) <= windowWidth(sharedActive)) {
    return {
      state: input.state,
      usedSharedDeparture: false,
      sharedTransitionKind: null,
    }
  }

  return {
    state: {
      ...input.state,
      activeJourney: sharedActive,
    },
    usedSharedDeparture: true,
    sharedTransitionKind: shared.transitionKind,
  }
}
