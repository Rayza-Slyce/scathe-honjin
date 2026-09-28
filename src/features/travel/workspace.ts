import type { HonjinRuntime } from '../../app/runtime'
import type { TravelObservationStore } from '../../storage/travel-observation'
import type { TravelPropertyEvidence } from '../../types'
import { observePlayerTravel, type PlayerTravelObservationState } from './observation-state'
import type { PropertyTravelEvidence } from './inference'
import type { TravelTargetView, TravelView } from './live-travel'

export interface LiveTravelTarget extends TravelTargetView {
  observation: PlayerTravelObservationState
  timingLabel: string
  timingConfidence: string
  timingSource: 'observed-transition' | 'none'
  eta: { earliestAt: number; latestAt: number } | null
  reasoning: readonly string[]
}

export interface LiveTravelWorkspace {
  activeWar: boolean
  warTargetsOnly: boolean
  targets: readonly LiveTravelTarget[]
  message: string | null
}

function propertyEvidence(value: TravelPropertyEvidence, observedAt: number): PropertyTravelEvidence {
  return {
    propertyType: value.propertyType,
    airstripPresent: value.airstripPresent,
    pilotPresent: value.pilotPresent,
    checkedAt: value.checkedAt,
    fresh: observedAt - value.checkedAt <= 300,
  }
}

export async function refreshLiveTravelWorkspace(input: {
  userId: number
  view: TravelView
  runtime: HonjinRuntime
  store: TravelObservationStore
}): Promise<LiveTravelWorkspace> {
  const results = await Promise.all(input.view.targets.map(async (target) => {
    let evidence: PropertyTravelEvidence | null = null
    let evidenceMessage: string | null = null
    if (target.state === 'travelling' && target.planeImageType === 'light_aircraft') {
      try {
        evidence = propertyEvidence(
          await input.runtime.loadTravelPropertyEvidence(target.id, 'optional'),
          target.statusObservedAt,
        )
      } catch (error) {
        evidenceMessage = error instanceof Error ? error.message : 'Property evidence unavailable.'
      }
    }

    const previous = await input.store.load(input.userId, target.id)
    const observation = observePlayerTravel({
      state: previous,
      sample: {
        state: target.state,
        description: target.travelDescription,
        planeImageType: target.planeImageType,
        observedAt: target.statusObservedAt,
      },
      propertyEvidence: evidence,
    })
    await input.store.save(input.userId, observation)

    if (target.state !== 'travelling' && target.state !== 'abroad') return { target: null, message: evidenceMessage }
    const active = observation.activeJourney
    const method = active?.originalMethod ?? target.method
    const timing = active?.originalTiming ?? null
    return {
      target: {
        ...target,
        method,
        observation,
        timingLabel: timing?.label ?? (target.state === 'abroad' ? 'No active ETA' : 'ETA unavailable'),
        timingConfidence: timing?.confidence ?? 'unknown',
        timingSource: timing?.source ?? 'none',
        eta: timing?.eta ?? null,
        reasoning: [
          ...method.reasoning,
          ...(timing?.reasoning ?? [target.state === 'abroad' ? 'Timing: player is observed abroad, not currently airborne' : 'Timing: unavailable']),
          ...(target.statusUntil != null && target.state === 'travelling'
            ? ['Candidate Torn status.until captured for validation; it is not used as ETA evidence yet']
            : []),
        ],
      } satisfies LiveTravelTarget,
      message: evidenceMessage,
    }
  }))

  const messages = results.flatMap((result) => result.message ? [result.message] : [])
  return {
    activeWar: input.view.activeWar,
    warTargetsOnly: input.view.warTargetsOnly,
    targets: results.flatMap((result) => result.target ? [result.target] : []),
    message: messages.length ? `Some property evidence is unavailable: ${messages[0]}` : null,
  }
}
