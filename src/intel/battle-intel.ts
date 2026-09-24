import type {
  BattleIntel,
  Confidence,
  EpochSeconds,
} from '../types'
import type {
  IntelFreshness,
} from '../recommendations/policy'

export interface BattleIntelAssessmentPolicy {
  highConfidenceMaxAgeSeconds: number
  mediumConfidenceMaxAgeSeconds: number
  usableMaxAgeSeconds: number
}

export interface BattleIntelAssessment {
  confidence: Confidence
  freshness: IntelFreshness
  ageSeconds: number | null
}

function isValidThreshold(
  value: number,
): boolean {
  return (
    Number.isFinite(value) &&
    value >= 0
  )
}

function assertPolicy(
  policy: BattleIntelAssessmentPolicy,
): void {
  if (
    !isValidThreshold(
      policy.highConfidenceMaxAgeSeconds,
    ) ||
    !isValidThreshold(
      policy.mediumConfidenceMaxAgeSeconds,
    ) ||
    !isValidThreshold(
      policy.usableMaxAgeSeconds,
    ) ||
    policy.highConfidenceMaxAgeSeconds >
      policy.mediumConfidenceMaxAgeSeconds ||
    policy.mediumConfidenceMaxAgeSeconds >
      policy.usableMaxAgeSeconds
  ) {
    throw new Error(
      'Battle-intel age thresholds must be non-negative and ordered high <= medium <= usable.',
    )
  }
}

export function assessBattleIntel(
  intel: BattleIntel,
  now: EpochSeconds,
  policy: BattleIntelAssessmentPolicy,
): BattleIntelAssessment {
  assertPolicy(policy)

  if (
    intel.source === 'unavailable' ||
    intel.estimatedBattleStats === null ||
    intel.updatedAt === null ||
    !Number.isFinite(now) ||
    now < intel.updatedAt
  ) {
    return {
      confidence: 'unknown',
      freshness: 'unknown',
      ageSeconds: null,
    }
  }

  const ageSeconds =
    now - intel.updatedAt

  const confidence: Confidence =
    ageSeconds <=
    policy.highConfidenceMaxAgeSeconds
      ? 'high'
      : ageSeconds <=
          policy.mediumConfidenceMaxAgeSeconds
        ? 'medium'
        : 'low'

  return {
    confidence,
    freshness:
      ageSeconds <=
      policy.usableMaxAgeSeconds
        ? 'usable'
        : 'stale',
    ageSeconds,
  }
}
