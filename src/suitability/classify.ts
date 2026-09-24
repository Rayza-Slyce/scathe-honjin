import type {
  Suitability,
} from '../types/domain'

export function calculateBsRatio(
  ownBattleStats: number,
  enemyBattleStats: number,
): number | null {
  if (
    !Number.isFinite(ownBattleStats) ||
    !Number.isFinite(enemyBattleStats) ||
    ownBattleStats <= 0 ||
    enemyBattleStats <= 0
  ) {
    return null
  }

  return enemyBattleStats / ownBattleStats
}

export function classifySuitability(
  ratio: number | null,
): Suitability {
  if (
    ratio === null ||
    !Number.isFinite(ratio) ||
    ratio <= 0
  ) {
    return 'unknown'
  }

  if (ratio <= 0.5) {
    return 'hit-now'
  }

  if (ratio <= 0.75) {
    return 'good'
  }

  if (ratio <= 1) {
    return 'viable'
  }

  if (ratio <= 1.25) {
    return 'risky'
  }

  return 'avoid'
}
