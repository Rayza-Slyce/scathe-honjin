import type {
  CurrentUser,
  CurrentUserBattleStats,
  EpochSeconds,
} from '../types'

export const DEFAULT_CURRENT_USER_BATTLE_STATS_MAX_AGE_SECONDS = 60

export interface DerivedCurrentUserBattleStats {
  baseTotal: number
  adjustedTotal: number
  delta: number
}

export interface CurrentUserBattleStatsSelection {
  total: number
  baseTotal: number
  adjusted: boolean
  observedAt: EpochSeconds | null
  ageSeconds: number | null
}

export function deriveCurrentUserBattleStats(
  stats: CurrentUserBattleStats | undefined,
): DerivedCurrentUserBattleStats | null {
  if (!stats) {
    return null
  }

  const values = [
    stats.strength,
    stats.defense,
    stats.speed,
    stats.dexterity,
  ] as const

  const baseTotal = values.reduce(
    (sum, stat) => sum + stat.value,
    0,
  )
  const adjustedTotal = values.reduce(
    (sum, stat) =>
      sum + stat.value * (1 + stat.modifier / 100),
    0,
  )

  if (
    !Number.isFinite(baseTotal) ||
    !Number.isFinite(adjustedTotal) ||
    baseTotal <= 0 ||
    adjustedTotal <= 0 ||
    Math.round(baseTotal) !== Math.round(stats.total)
  ) {
    return null
  }

  return {
    baseTotal: Math.round(baseTotal),
    adjustedTotal: Math.round(adjustedTotal),
    delta: Math.round(adjustedTotal - baseTotal),
  }
}

export function selectCurrentUserBattleStats(
  currentUser: CurrentUser,
  now: EpochSeconds,
  maxAgeSeconds = DEFAULT_CURRENT_USER_BATTLE_STATS_MAX_AGE_SECONDS,
): CurrentUserBattleStatsSelection {
  const fallback: CurrentUserBattleStatsSelection = {
    total: currentUser.battleStatsTotal,
    baseTotal: currentUser.battleStatsTotal,
    adjusted: false,
    observedAt:
      currentUser.battleStatsCurrent?.observedAt ?? null,
    ageSeconds: null,
  }
  const stats = currentUser.battleStatsCurrent
  const derived = deriveCurrentUserBattleStats(stats)

  if (
    !stats ||
    !derived ||
    !Number.isFinite(now) ||
    !Number.isFinite(maxAgeSeconds) ||
    maxAgeSeconds < 0 ||
    now < stats.observedAt
  ) {
    return fallback
  }

  const ageSeconds = now - stats.observedAt

  if (ageSeconds > maxAgeSeconds) {
    return {
      ...fallback,
      observedAt: stats.observedAt,
      ageSeconds,
    }
  }

  return {
    total: derived.adjustedTotal,
    baseTotal: derived.baseTotal,
    adjusted: derived.delta !== 0,
    observedAt: stats.observedAt,
    ageSeconds,
  }
}
