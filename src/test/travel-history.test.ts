import { describe, expect, it } from 'vitest'
import {
  completeTravelHistory,
  deriveArrivalObservationWindow,
  validateObservedArrival,
} from '../features/travel/history'
import type {
  TravelMethodInference,
  TravelStatusSample,
} from '../features/travel/inference'
import type { TravelTimingEstimate } from '../features/travel/timing'

function sample(
  state: TravelStatusSample['state'],
  observedAt: number,
): TravelStatusSample {
  return {
    state,
    description: null,
    planeImageType: null,
    observedAt,
  }
}

const originalMethod: TravelMethodInference = {
  method: 'airstrip',
  label: 'Likely Airstrip',
  confidence: 'high',
  reasoning: ['Inference: original evidence'],
}

const originalTiming: TravelTimingEstimate = {
  status: 'available',
  eta: { earliestAt: 2_000, latestAt: 2_100 },
  confidence: 'high',
  label: 'ETA window',
  reasoning: ['Timing: original evidence'],
}

describe('travel arrival observation', () => {
  it('bounds arrival from the last airborne observation to the first non-travelling observation', () => {
    expect(
      deriveArrivalObservationWindow(
        sample('travelling', 2_000),
        sample('abroad', 2_030),
      ),
    ).toEqual({ earliestAt: 2_000, latestAt: 2_030 })
  })

  it('does not invent arrival timing when no airborne-to-arrived transition was observed', () => {
    expect(
      deriveArrivalObservationWindow(null, sample('abroad', 2_030)),
    ).toBeNull()
    expect(
      deriveArrivalObservationWindow(
        sample('abroad', 2_000),
        sample('abroad', 2_030),
      ),
    ).toBeNull()
  })
})

describe('completed travel validation', () => {
  it('records support when observed arrival overlaps the original ETA', () => {
    expect(
      validateObservedArrival(
        { earliestAt: 2_050, latestAt: 2_120 },
        originalTiming,
      ),
    ).toMatchObject({ validation: 'supports' })
  })

  it('records contradiction when arrival is outside the original ETA', () => {
    expect(
      validateObservedArrival(
        { earliestAt: 2_150, latestAt: 2_180 },
        originalTiming,
      ),
    ).toEqual({
      validation: 'contradicts',
      reasoning: [
        'Validation: observed arrival completed after the original ETA window',
      ],
    })
  })

  it('does not judge the method when the original journey had no ETA', () => {
    const unavailable: TravelTimingEstimate = {
      status: 'unavailable',
      eta: null,
      confidence: 'unknown',
      label: 'ETA unavailable · take-off not observed',
      reasoning: ['Timing: no observed transition into travelling'],
    }

    expect(
      validateObservedArrival(
        { earliestAt: 2_050, latestAt: 2_120 },
        unavailable,
      ),
    ).toMatchObject({ validation: 'insufficient-evidence' })
  })

  it('preserves the original inference instead of rewriting history after arrival', () => {
    const entry = completeTravelHistory({
      route: {
        origin: 'Torn',
        destination: 'Mexico',
        direction: 'outbound',
      },
      departureWindow: { earliestAt: 1_000, latestAt: 1_030 },
      arrivalWindow: { earliestAt: 2_150, latestAt: 2_180 },
      originalMethod,
      originalTiming,
    })

    expect(entry).toMatchObject({
      originalMethod: 'airstrip',
      originalMethodLabel: 'Likely Airstrip',
      originalMethodConfidence: 'high',
      originalEta: { earliestAt: 2_000, latestAt: 2_100 },
      validation: 'contradicts',
    })
    expect(entry.originalMethodReasoning).toEqual([
      'Inference: original evidence',
    ])
  })
})
