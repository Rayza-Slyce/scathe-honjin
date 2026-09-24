export type StrengthFit =
  | 'undermatched'
  | 'useful-larger-margin'
  | 'useful-smaller-margin'
  | 'close'
  | 'above-own'
  | 'unknown'

export type IntelFreshness =
  | 'usable'
  | 'stale'
  | 'unknown'

export interface RecommendationPolicy {
  undermatchedMaxRatio: number
  largerMarginMaxRatio: number
  smallerMarginMaxRatio: number
  closeMaxRatio: number
  ratioBucketWidth: number
  limit: number
}

export const DEFAULT_RECOMMENDATION_POLICY:
  RecommendationPolicy = {
    undermatchedMaxRatio: 0.25,
    largerMarginMaxRatio: 0.5,
    smallerMarginMaxRatio: 0.75,
    closeMaxRatio: 1,
    ratioBucketWidth: 0.05,
    limit: 3,
  }
