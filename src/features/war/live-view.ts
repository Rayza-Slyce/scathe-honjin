import type {
  Availability,
  BattleIntelSnapshot,
  BattleIntelSource,
  Confidence,
  CurrentUser,
  EpochSeconds,
  PlayerState,
  Suitability,
  WarBoardSnapshot,
  WarState,
} from '../../types'
import type {
  IntelFreshness,
  StrengthFit,
} from '../../recommendations/policy'
import {
  assessLiveWarTargets,
  type LiveWarEvidencePolicy,
  type LiveWarTargetAssessment,
} from '../../recommendations/live'

export type WarBoardPhase =
  | 'loading'
  | 'ready'
  | 'no-war'
  | 'error'

export type WarTargetSuitabilityLabel =
  | 'HIT NOW'
  | 'GOOD'
  | 'VIABLE'
  | 'RISKY'
  | 'AVOID'
  | 'UNKNOWN'

export type WarRecommendationLabel =
  | 'GOOD FIT'
  | 'LOWER-STRENGTH OPTION'

export interface WarTargetView {
  id: number
  name: string
  battleStats: string
  battleStatsValue: number | null
  fairFight: string
  fairFightValue: number | null
  suitability: WarTargetSuitabilityLabel
  confidence: string
  confidenceValue: Confidence
  freshness: IntelFreshness
  availability: Availability
  status: string
  state: PlayerState
  recommendation?: WarRecommendationLabel
  attackable: boolean
  ratio: number | null
  strengthFit: StrengthFit
  source: BattleIntelSource
  intelUpdatedAt: EpochSeconds | null
  statusObservedAt: EpochSeconds
  hospitalUntil?: EpochSeconds | null
  healthObservedAt: EpochSeconds | null
}

export interface WarBoardView {
  phase: WarBoardPhase
  stale: boolean
  message: string | null
  war: WarState | null
  targets: readonly WarTargetView[]
  recommendations: readonly WarTargetView[]
  observedAt: EpochSeconds | null
}

const loadingView: WarBoardView = {
  phase: 'loading',
  stale: false,
  message: null,
  war: null,
  targets: [],
  recommendations: [],
  observedAt: null,
}

export function createLoadingWarBoardView(): WarBoardView {
  return loadingView
}

export function createErrorWarBoardView(
  message: string,
): WarBoardView {
  return {
    phase: 'error',
    stale: false,
    message,
    war: null,
    targets: [],
    recommendations: [],
    observedAt: null,
  }
}

function formatCompactNumber(
  value: number | null,
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return 'UNKNOWN'
  }

  const absolute = Math.abs(value)

  if (absolute >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}b`
  }

  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}m`
  }

  if (absolute >= 1_000) {
    return `${(value / 1_000).toFixed(2)}k`
  }

  return Math.round(value).toString()
}

function formatFairFight(
  value: number | null,
): string {
  return value === null || !Number.isFinite(value)
    ? '—'
    : value.toFixed(2)
}

function suitabilityLabel(
  suitability: Suitability,
): WarTargetSuitabilityLabel {
  switch (suitability) {
    case 'hit-now':
      return 'HIT NOW'
    case 'good':
      return 'GOOD'
    case 'viable':
      return 'VIABLE'
    case 'risky':
      return 'RISKY'
    case 'avoid':
      return 'AVOID'
    default:
      return 'UNKNOWN'
  }
}

function recommendationLabel(
  assessment: LiveWarTargetAssessment,
): WarRecommendationLabel | undefined {
  switch (
    assessment.assessment.recommendationReason
  ) {
    case 'good-fit':
      return 'GOOD FIT'
    case 'lower-strength-option':
      return 'LOWER-STRENGTH OPTION'
    default:
      return undefined
  }
}

function formatHospitalCountdown(
  until: EpochSeconds | null,
  now: EpochSeconds,
): string {
  if (until === null) {
    return 'Hospital'
  }

  const remaining = until - now

  if (remaining <= 0) {
    return 'Hospital · awaiting refresh'
  }

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor(
    (remaining % 3600) / 60,
  )
  const seconds = remaining % 60

  const clock =
    hours > 0
      ? `${hours}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`
      : `${minutes
          .toString()
          .padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`

  return `Hospital · ${clock}`
}

function formatStatus(
  target: LiveWarTargetAssessment,
  rosterObservedAt: EpochSeconds,
  now: EpochSeconds,
): string {
  const status = target.player.status

  switch (status.state) {
    case 'hospital':
      return formatHospitalCountdown(
        status.hospitalUntil,
        now,
      )
    case 'okay': {
      const description =
        status.description?.trim() || 'Okay'
      const activity =
        status.lastAction.relative?.trim()

      return activity
        ? `${description} · ${activity}`
        : description
    }
    case 'travelling':
      return (
        status.description?.trim() ||
        'Travelling'
      )
    case 'abroad':
      return (
        status.description?.trim() ||
        'Abroad'
      )
    default:
      return rosterObservedAt <= now
        ? 'Status unknown'
        : 'Status unavailable'
  }
}

function availabilityRank(
  availability: Availability,
): number {
  switch (availability) {
    case 'attackable':
      return 0
    case 'unknown':
      return 1
    default:
      return 2
  }
}

function fitRank(
  fit: StrengthFit,
): number {
  switch (fit) {
    case 'useful-larger-margin':
      return 0
    case 'useful-smaller-margin':
      return 1
    case 'undermatched':
      return 2
    case 'close':
      return 3
    case 'above-own':
      return 4
    default:
      return 5
  }
}

function confidenceRank(
  confidence: Confidence,
): number {
  switch (confidence) {
    case 'high':
      return 0
    case 'medium':
      return 1
    case 'low':
      return 2
    default:
      return 3
  }
}

export function compareBestForMe(
  left: WarTargetView,
  right: WarTargetView,
): number {
  const availabilityDifference =
    availabilityRank(left.availability) -
    availabilityRank(right.availability)

  if (availabilityDifference !== 0) {
    return availabilityDifference
  }

  const fitDifference =
    fitRank(left.strengthFit) -
    fitRank(right.strengthFit)

  if (fitDifference !== 0) {
    return fitDifference
  }

  const confidenceDifference =
    confidenceRank(
      left.confidenceValue,
    ) -
    confidenceRank(
      right.confidenceValue,
    )

  if (confidenceDifference !== 0) {
    return confidenceDifference
  }

  return left.id - right.id
}

export function buildWarBoardView(
  currentUser: CurrentUser,
  snapshot: WarBoardSnapshot,
  intel: BattleIntelSnapshot,
  now: EpochSeconds,
  policy: LiveWarEvidencePolicy,
): WarBoardView {
  if (
    snapshot.war === null ||
    snapshot.enemyRoster === null
  ) {
    return {
      phase: 'no-war',
      stale: false,
      message: null,
      war: null,
      targets: [],
      recommendations: [],
      observedAt: snapshot.war?.observedAt ?? null,
    }
  }

  if (
    snapshot.enemyRoster.factionId !==
    snapshot.war.enemyFaction.id
  ) {
    throw new Error(
      'War roster does not belong to the current enemy faction.',
    )
  }

  const assessment = assessLiveWarTargets(
    currentUser,
    snapshot.enemyRoster,
    intel,
    now,
    policy,
  )
  const recommendationIds = new Map(
    assessment.recommendations.map(
      (item, index) => [
        item.playerId,
        index,
      ],
    ),
  )

  const targets = assessment.targets.map(
    (target): WarTargetView => ({
      id: target.player.id,
      name: target.player.name,
      battleStats: formatCompactNumber(
        target.intel.estimatedBattleStats,
      ),
      battleStatsValue:
        target.intel.estimatedBattleStats,
      fairFight: formatFairFight(
        target.intel.fairFight,
      ),
      fairFightValue:
        target.intel.fairFight,
      suitability: suitabilityLabel(
        target.assessment.suitability,
      ),
      confidence:
        target.assessment.confidence.toUpperCase(),
      confidenceValue:
        target.assessment.confidence,
      freshness:
        target.assessment.freshness,
      availability:
        target.assessment.availability,
      status: formatStatus(
        target,
        snapshot.enemyRoster!.observedAt,
        now,
      ),
      state: target.player.status.state,
      recommendation:
        recommendationLabel(target),
      attackable:
        target.assessment.availability ===
        'attackable',
      ratio: target.assessment.ratio,
      strengthFit:
        target.assessment.strengthFit,
      source: target.intel.source,
      intelUpdatedAt:
        target.intel.updatedAt,
      statusObservedAt:
        snapshot.enemyRoster!.observedAt,
      hospitalUntil:
        target.player.status.hospitalUntil,
      healthObservedAt: null,
    }),
  )

  const recommendationTargets = targets
    .filter((target) =>
      recommendationIds.has(target.id),
    )
    .sort(
      (left, right) =>
        recommendationIds.get(left.id)! -
        recommendationIds.get(right.id)!,
    )

  return {
    phase: 'ready',
    stale: false,
    message: null,
    war: snapshot.war,
    targets: [...targets].sort(
      compareBestForMe,
    ),
    recommendations:
      recommendationTargets,
    observedAt: Math.min(
      snapshot.war.observedAt,
      snapshot.enemyRoster.observedAt,
      intel.observedAt,
    ),
  }
}

export function markWarBoardViewStale(
  view: WarBoardView,
  message: string,
): WarBoardView {
  if (
    view.phase !== 'ready' ||
    view.war === null
  ) {
    return createErrorWarBoardView(
      message,
    )
  }

  return {
    ...view,
    stale: true,
    message,
    recommendations: [],
    targets: view.targets.map(
      (target) => ({
        ...target,
        availability: 'unknown',
        attackable: false,
        status: target.status.endsWith(
          ' · STALE',
        )
          ? target.status
          : `${target.status} · STALE`,
        recommendation: undefined,
      }),
    ),
  }
}
