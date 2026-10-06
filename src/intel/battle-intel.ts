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

const HOUR_SECONDS = 60 * 60
const DAY_SECONDS = 24 * HOUR_SECONDS

/**
 * Initial field-calibrated public-BSS age policy.
 *
 * HIGH / MEDIUM are the only confidence bands eligible for automatic WAR
 * recommendation. LOW remains visible context but is never auto-promoted.
 * Evidence older than seven days is additionally marked stale.
 */
export const DEFAULT_BATTLE_INTEL_ASSESSMENT_POLICY:
  BattleIntelAssessmentPolicy = {
    highConfidenceMaxAgeSeconds: DAY_SECONDS,
    mediumConfidenceMaxAgeSeconds: 3 * DAY_SECONDS,
    usableMaxAgeSeconds: 7 * DAY_SECONDS,
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
