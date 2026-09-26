import type { Confidence, EpochSeconds, PlaneImageType, PlayerState } from '../../types'
import type { SpyTargetView } from '../targets/live-spy'
import type { WarBoardView, WarTargetSuitabilityLabel, WarTargetView } from '../war/live-view'
import { inferTravelMethod, parseTravelRoute, type PropertyTravelEvidence, type TravelMethodInference } from './inference'

export type TravelSource = 'war' | 'spy-individual' | 'spy-faction'

export interface TravelTargetView {
  id: number
  name: string
  level: number | null
  battleStats: string
  battleStatsValue: number | null
  fairFight: string
  fairFightValue: number | null
  suitability: WarTargetSuitabilityLabel
  confidence: string
  confidenceValue: Confidence
  state: PlayerState
  travelDescription: string | null
  planeImageType: PlaneImageType | null
  statusObservedAt: EpochSeconds
  isWarTarget: boolean
  sources: readonly TravelSource[]
  sourceLabel: 'WAR TARGET' | 'NON-WAR'
  route: ReturnType<typeof parseTravelRoute>
  method: TravelMethodInference
}

export interface TravelView {
  activeWar: boolean
  warTargetsOnly: boolean
  targets: readonly TravelTargetView[]
}

interface Candidate {
  target: WarTargetView | SpyTargetView
  source: TravelSource
  isWarTarget: boolean
}

function candidateFromWar(target: WarTargetView): Candidate {
  return { target, source: 'war', isWarTarget: true }
}

function candidateFromSpy(target: SpyTargetView, source: Exclude<TravelSource, 'war'>): Candidate {
  return { target, source, isWarTarget: false }
}

function isTravelRelevant(state: PlayerState): boolean {
  return state === 'travelling' || state === 'abroad'
}

export function buildTravelView(input: {
  war: WarBoardView
  individualTargets: readonly SpyTargetView[]
  factionTargets: readonly SpyTargetView[]
  includeNonWar: boolean
  propertyEvidenceByPlayerId?: ReadonlyMap<number, PropertyTravelEvidence>
  includeNonTravel?: boolean
}): TravelView {
  const activeWar = input.war.phase === 'ready' && input.war.war !== null
  const warTargetsOnly = activeWar && !input.includeNonWar
  const byPlayerId = new Map<number, Candidate[]>()

  const add = (candidate: Candidate) => {
    const existing = byPlayerId.get(candidate.target.id) ?? []
    existing.push(candidate)
    byPlayerId.set(candidate.target.id, existing)
  }

  input.war.targets.forEach((target) => add(candidateFromWar(target)))
  if (!warTargetsOnly) {
    input.individualTargets.forEach((target) => add(candidateFromSpy(target, 'spy-individual')))
    input.factionTargets.forEach((target) => add(candidateFromSpy(target, 'spy-faction')))
  }

  const targets = [...byPlayerId.values()].flatMap((candidates) => {
    const freshest = [...candidates].sort((left, right) =>
      right.target.statusObservedAt - left.target.statusObservedAt ||
      Number(right.isWarTarget) - Number(left.isWarTarget),
    )[0]
    if (!input.includeNonTravel && !isTravelRelevant(freshest.target.state)) return []

    const sources = [...new Set(candidates.map((candidate) => candidate.source))]
    const isWarTarget = candidates.some((candidate) => candidate.isWarTarget)
    const sample = {
      state: freshest.target.state,
      description: freshest.target.travelDescription ?? null,
      planeImageType: freshest.target.planeImageType ?? null,
      observedAt: freshest.target.statusObservedAt,
    }

    return [{
      id: freshest.target.id,
      name: freshest.target.name,
      level: freshest.target.level,
      battleStats: freshest.target.battleStats,
      battleStatsValue: freshest.target.battleStatsValue,
      fairFight: freshest.target.fairFight,
      fairFightValue: freshest.target.fairFightValue,
      suitability: freshest.target.suitability,
      confidence: freshest.target.confidence,
      confidenceValue: freshest.target.confidenceValue,
      state: freshest.target.state,
      travelDescription: freshest.target.travelDescription ?? null,
      planeImageType: freshest.target.planeImageType ?? null,
      statusObservedAt: freshest.target.statusObservedAt,
      isWarTarget,
      sources,
      sourceLabel: isWarTarget ? 'WAR TARGET' : 'NON-WAR',
      route: parseTravelRoute(sample),
      method: inferTravelMethod(
        freshest.target.planeImageType ?? null,
        input.propertyEvidenceByPlayerId?.get(freshest.target.id) ?? null,
      ),
    } satisfies TravelTargetView]
  }).sort((left, right) => left.id - right.id)

  return { activeWar, warTargetsOnly, targets }
}
