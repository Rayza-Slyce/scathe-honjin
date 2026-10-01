import type { HonjinRuntime } from '../../app/runtime'
import type { SharedTravelObservation } from '../../api/honjin-intel/live'
import type { TravelObservationStore } from '../../storage/travel-observation'
import type { FactionRosterSnapshot, TravelPropertyEvidence } from '../../types'
import { observePlayerTravel, type PlayerTravelObservationState } from './observation-state'
import { mergeSharedTravelObservation } from './shared-observation'
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
    checkedAt: value.checkedAt,
    fresh: observedAt - value.checkedAt <= 300,
  }
}

export async function refreshLiveTravelWorkspace(input: {
  userId: number
  view: TravelView
  runtime: HonjinRuntime
  store: TravelObservationStore
  sharedObservations?: ReadonlyMap<number, SharedTravelObservation>
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

    const sample = {
      state: target.state,
      description: target.travelDescription,
      planeImageType: target.planeImageType,
      observedAt: target.statusObservedAt,
    }
    const previous = await input.store.load(input.userId, target.id)
    let observation = observePlayerTravel({
      state: previous,
      sample,
      propertyEvidence: evidence,
    })
    const sharedMerge = mergeSharedTravelObservation({
      state: observation,
      current: sample,
      shared: input.sharedObservations?.get(target.id) ?? null,
      propertyEvidence: evidence,
    })
    observation = sharedMerge.state
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
          ...(sharedMerge.usedSharedDeparture
            ? [
                `Timing evidence: HONJIN observed departure within a ${Math.max(0, (active?.departureWindow?.latestAt ?? 0) - (active?.departureWindow?.earliestAt ?? 0))}-second window`,
                ...(sharedMerge.sharedTransitionKind === 'travel-route-change'
                  ? ['Timing evidence: direct travelling → travelling route change bounded the new-leg departure']
                  : []),
              ]
            : []),
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


export interface TeamTravelTimingObservation {
  eta: { earliestAt: number; latestAt: number }
  confidence: string
}

export async function refreshTeamTravelTiming(input: {
  userId: number
  roster: FactionRosterSnapshot
  store: TravelObservationStore
  sharedObservations?: ReadonlyMap<number, SharedTravelObservation>
}): Promise<ReadonlyMap<number, TeamTravelTimingObservation>> {
  const timings = new Map<number, TeamTravelTimingObservation>()

  await Promise.all(
    input.roster.members.map(async (player) => {
      const previous = await input.store.load(
        input.userId,
        player.id,
      )
      const sample = {
        state: player.status.state,
        description: player.status.description,
        planeImageType: player.status.planeImageType,
        statusUntil: player.status.statusUntil ?? null,
        lastActionAt: player.status.lastAction.at,
        observedAt: input.roster.observedAt,
      }
      let observation = observePlayerTravel({
        state: previous,
        sample,
        // TEAM deliberately does not fan out into one Torn property request
        // per member. Existing canonical travel evidence can carry forward;
        // otherwise an under-evidenced ETA remains unavailable.
        propertyEvidence: null,
      })
      observation = mergeSharedTravelObservation({
        state: observation,
        current: sample,
        shared: input.sharedObservations?.get(player.id) ?? null,
        propertyEvidence: null,
      }).state

      await input.store.save(input.userId, observation)

      const timing = observation.activeJourney?.originalTiming
      if (
        player.status.state === 'travelling' &&
        timing?.status === 'available' &&
        timing.eta !== null
      ) {
        timings.set(player.id, {
          eta: timing.eta,
          confidence: timing.confidence,
        })
      }
    }),
  )

  return timings
}
