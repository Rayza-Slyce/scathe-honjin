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
): boolean {
  return (
    fit === 'useful-larger-margin' ||
    fit === 'useful-smaller-margin' ||
    fit === 'undermatched'
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
  const eligible =
    (!requireAttackable ||
      candidate.availability ===
        'attackable') &&
    candidate.freshness ===
      'usable' &&
    hasUsableConfidence(
      candidate.confidence,
    ) &&
    isAutomaticFit(
      strengthFit,
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
    case 'useful-larger-margin':
      return 0
    case 'useful-smaller-margin':
      return 1
    case 'undermatched':
      return 2
    default:
      return 99
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

function ratioBucket(
  assessment:
    WarCandidateAssessment,
  policy:
    RecommendationPolicy,
): number {
  if (
    assessment.ratio === null
  ) {
    return Number.MAX_SAFE_INTEGER
  }

  return Math.floor(
    assessment.ratio /
      policy.ratioBucketWidth,
  )
}

function stableUserTieBreak(
  currentUserId: PlayerId,
  enemyPlayerId: PlayerId,
): number {
  const input =
    `${currentUserId}:${enemyPlayerId}`

  let hash = 2166136261

  for (
    let index = 0;
    index < input.length;
    index += 1
  ) {
    hash ^=
      input.charCodeAt(index)

    hash = Math.imul(
      hash,
      16777619,
    )
  }

  return hash >>> 0
}

function compareCandidates(
  currentUserId: PlayerId,
  policy:
    RecommendationPolicy,
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

  const confidenceDifference =
    confidenceRank(
      left.confidence,
    ) -
    confidenceRank(
      right.confidence,
    )

  if (
    confidenceDifference !== 0
  ) {
    return confidenceDifference
  }

  const leftBucket =
    ratioBucket(
      left,
      policy,
    )

  const rightBucket =
    ratioBucket(
      right,
      policy,
    )

  if (
    leftBucket !== rightBucket
  ) {
    if (
      left.strengthFit ===
      'undermatched'
    ) {
      return (
        rightBucket -
        leftBucket
      )
    }

    return (
      leftBucket -
      rightBucket
    )
  }

  const leftTie =
    stableUserTieBreak(
      currentUserId,
      left.playerId,
    )

  const rightTie =
    stableUserTieBreak(
      currentUserId,
      right.playerId,
    )

  if (
    leftTie !== rightTie
  ) {
    return leftTie - rightTie
  }

  return (
    left.playerId -
    right.playerId
  )
}

export function selectWarRecommendations(
  currentUserId: PlayerId,
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
    .sort(
      (left, right) =>
        compareCandidates(
          currentUserId,
          policy,
          left,
          right,
        ),
    )
    .slice(
      0,
      policy.limit,
    )
}
