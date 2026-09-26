import type { Confidence, EpochSeconds, TravelMethod } from '../../types'
import type {
  DepartureObservationWindow,
  TravelMethodInference,
  TravelRoute,
  TravelStatusSample,
} from './inference'
import type { TravelTimingEstimate } from './timing'

export interface ArrivalObservationWindow {
  earliestAt: EpochSeconds
  latestAt: EpochSeconds
}

export type TravelInferenceValidation =
  | 'supports'
  | 'contradicts'
  | 'insufficient-evidence'

export interface CompletedTravelHistoryEntry {
  route: TravelRoute
  departureWindow: DepartureObservationWindow
  arrivalWindow: ArrivalObservationWindow
  originalMethod: TravelMethod
  originalMethodLabel: string
  originalMethodConfidence: Confidence
  originalMethodReasoning: readonly string[]
  originalTimingLabel: string
  originalTimingConfidence: Confidence
  originalEta: TravelTimingEstimate['eta']
  validation: TravelInferenceValidation
  validationReasoning: readonly string[]
}

export function deriveArrivalObservationWindow(
  previous: TravelStatusSample | null,
  current: TravelStatusSample,
): ArrivalObservationWindow | null {
  if (
    previous === null ||
    previous.state !== 'travelling' ||
    current.state === 'travelling' ||
    previous.observedAt > current.observedAt
  ) {
    return null
  }

  return {
    earliestAt: previous.observedAt,
    latestAt: current.observedAt,
  }
}

export function validateObservedArrival(
  arrivalWindow: ArrivalObservationWindow,
  originalTiming: TravelTimingEstimate,
): {
  validation: TravelInferenceValidation
  reasoning: readonly string[]
} {
  if (originalTiming.status !== 'available' || originalTiming.eta === null) {
    return {
      validation: 'insufficient-evidence',
      reasoning: [
        'Validation: original journey had no ETA window to test against arrival',
      ],
    }
  }

  const overlapsOriginalEta =
    arrivalWindow.latestAt >= originalTiming.eta.earliestAt &&
    arrivalWindow.earliestAt <= originalTiming.eta.latestAt

  if (overlapsOriginalEta) {
    return {
      validation: 'supports',
      reasoning: [
        'Validation: observed arrival window overlaps the original ETA window',
      ],
    }
  }

  return {
    validation: 'contradicts',
    reasoning: [
      arrivalWindow.latestAt < originalTiming.eta.earliestAt
        ? 'Validation: observed arrival completed before the original ETA window'
        : 'Validation: observed arrival completed after the original ETA window',
    ],
  }
}

export function completeTravelHistory(input: {
  route: TravelRoute
  departureWindow: DepartureObservationWindow
  arrivalWindow: ArrivalObservationWindow
  originalMethod: TravelMethodInference
  originalTiming: TravelTimingEstimate
}): CompletedTravelHistoryEntry {
  const validation = validateObservedArrival(
    input.arrivalWindow,
    input.originalTiming,
  )

  return {
    route: { ...input.route },
    departureWindow: { ...input.departureWindow },
    arrivalWindow: { ...input.arrivalWindow },
    originalMethod: input.originalMethod.method,
    originalMethodLabel: input.originalMethod.label,
    originalMethodConfidence: input.originalMethod.confidence,
    originalMethodReasoning: [...input.originalMethod.reasoning],
    originalTimingLabel: input.originalTiming.label,
    originalTimingConfidence: input.originalTiming.confidence,
    originalEta:
      input.originalTiming.eta === null
        ? null
        : { ...input.originalTiming.eta },
    validation: validation.validation,
    validationReasoning: [...validation.reasoning],
  }
}
