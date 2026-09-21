import type {
  BattleIntel,
  EpochSeconds,
  PlayerId,
} from '../../types'
import type { FfScouterStatsRowDto } from './contracts'

function finiteNumberOrNull(
  value: number | null | undefined,
): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null
}

/**
 * HONJIN-01 verified that last_updated exists but did not capture its live
 * runtime type. Only a safe integer epoch value is promoted into the domain.
 *
 * Do not infer string/date semantics here without observed evidence.
 */
function normaliseObservedEpochSeconds(
  value: unknown,
): EpochSeconds | null {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null
}

export function normaliseFfScouterBattleIntel(
  playerId: PlayerId,
  row: FfScouterStatsRowDto,
): BattleIntel {
  const bss = row.available_estimates?.bss

  if (!bss) {
    return {
      playerId,
      estimatedBattleStats: null,
      publicBss: null,
      fairFight: null,
      updatedAt: null,
      source: 'unavailable',
    }
  }

  return {
    playerId,
    estimatedBattleStats: finiteNumberOrNull(
      bss.bs_estimate,
    ),
    publicBss: finiteNumberOrNull(
      bss.bss_public,
    ),
    fairFight: finiteNumberOrNull(
      bss.fair_fight,
    ),
    updatedAt: normaliseObservedEpochSeconds(
      bss.last_updated,
    ),
    source: 'ffscouter-public-bss',
  }
}
