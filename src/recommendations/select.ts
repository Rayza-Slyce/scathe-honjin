import type {
  Availability,
  Confidence,
  PlayerId,
  Suitability,
} from '../types/domain'
import {
  calculateBsRatio,
  classifySuitability,
} from '../suitability/classify'
import {
  DEFAULT_RECOMMENDATION_POLICY,
} from './policy'
import type {
  IntelFreshness,
  RecommendationPolicy,
  StrengthFit,
} from './policy'

export interface WarCandidateInput {
  playerId: PlayerId
  enemyBattleStats: number | null
  availability: Availability
  confidence: Confidence
  freshness: IntelFreshness
}

export type RecommendationReason =
  | 'good-fit'
  | 'lower-strength-option'

export interface WarCandidateAssessment {
  playerId: PlayerId
  ratio: number | null
  suitability: Suitability
  strengthFit: StrengthFit
  availability: Availability
  confidence: Confidence
  freshness: IntelFreshness
  eligible: boolean
  recommendationReason:
    | RecommendationReason
    | null
}

export interface WarRecommendationSelectionOptions {
  requireAttackable?: boolean
  requireUsableIntel?: boolean
  includeUndermatchedFallback?: boolean
}

export function classifyStrengthFit(
  ratio: number | null,
  policy:
    RecommendationPolicy =
      DEFAULT_RECOMMENDATION_POLICY,
): StrengthFit {
  if (
    ratio === null ||
    !Number.isFinite(ratio) ||
    ratio <= 0
  ) {
    return 'unknown'
  }

  if (
    ratio <=
    policy.undermatchedMaxRatio
  ) {
    return 'undermatched'
  }

  if (
    ratio <=
    policy.largerMarginMaxRatio
  ) {
    return 'useful-larger-margin'
  }

  if (
    ratio <=
    policy.smallerMarginMaxRatio
  ) {
    return 'useful-smaller-margin'
  }

  if (
    ratio <=
    policy.closeMaxRatio
  ) {
    return 'close'
  }

  return 'above-own'
}

function hasUsableConfidence(
  confidence: Confidence,
): boolean {
  return (
    confidence === 'high' ||
    confidence === 'medium'
  )
}

function isAutomaticFit(
  fit: StrengthFit,
  includeUndermatchedFallback: boolean,
): boolean {
  return (
    fit === 'useful-larger-margin' ||
    fit === 'useful-smaller-margin' ||
    (includeUndermatchedFallback &&
      fit === 'undermatched')
  )
}

export function assessWarCandidate(
  ownBattleStats: number,
  candidate: WarCandidateInput,
  policy:
    RecommendationPolicy =
      DEFAULT_RECOMMENDATION_POLICY,
  options: WarRecommendationSelectionOptions = {},
): WarCandidateAssessment {
  const ratio =
    candidate.enemyBattleStats === null
      ? null
      : calculateBsRatio(
          ownBattleStats,
          candidate.enemyBattleStats,
        )

  const suitability =
    classifySuitability(ratio)

  const strengthFit =
    classifyStrengthFit(
      ratio,
      policy,
    )

  const requireAttackable =
    options.requireAttackable ?? true
  const requireUsableIntel =
    options.requireUsableIntel ?? true
  const includeUndermatchedFallback =
    options.includeUndermatchedFallback ?? true
  const intelEligible =
    !requireUsableIntel ||
    (candidate.freshness === 'usable' &&
      hasUsableConfidence(
        candidate.confidence,
      ))
  const eligible =
    (!requireAttackable ||
      candidate.availability ===
        'attackable') &&
    intelEligible &&
    isAutomaticFit(
      strengthFit,
      includeUndermatchedFallback,
    )

  const recommendationReason =
    eligible
      ? strengthFit ===
        'undermatched'
        ? 'lower-strength-option'
        : 'good-fit'
      : null

  return {
    playerId: candidate.playerId,
    ratio,
    suitability,
    strengthFit,
    availability:
      candidate.availability,
    confidence:
      candidate.confidence,
    freshness:
      candidate.freshness,
    eligible,
    recommendationReason,
  }
}

function priorityGroup(
  assessment:
    WarCandidateAssessment,
): number {
  switch (
    assessment.strengthFit
  ) {
    case 'useful-smaller-margin':
      return 0
    case 'useful-larger-margin':
      return 1
    case 'undermatched':
      return 2
    default:
      return 99
  }
}

function compareCandidates(
  left:
    WarCandidateAssessment,
  right:
    WarCandidateAssessment,
): number {
  const groupDifference =
    priorityGroup(left) -
    priorityGroup(right)

  if (
    groupDifference !== 0
  ) {
    return groupDifference
  }

  const leftRatio =
    left.ratio ?? -Infinity
  const rightRatio =
    right.ratio ?? -Infinity

  if (leftRatio !== rightRatio) {
    return rightRatio - leftRatio
  }

  return (
    left.playerId -
    right.playerId
  )
}

export function selectWarRecommendations(
  _currentUserId: PlayerId,
  ownBattleStats: number,
  candidates:
    readonly WarCandidateInput[],
  policy:
    RecommendationPolicy =
      DEFAULT_RECOMMENDATION_POLICY,
  options: WarRecommendationSelectionOptions = {},
): readonly WarCandidateAssessment[] {
  return candidates
    .map((candidate) =>
      assessWarCandidate(
        ownBattleStats,
        candidate,
        policy,
        options,
      ),
    )
    .filter(
      (assessment) =>
        assessment.eligible,
    )
    .sort(compareCandidates)
    .slice(
      0,
      policy.limit,
    )
}
