import type {
  BattleIntel,
  EpochSeconds,
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
 * FFScouter documents last_updated as Unix seconds. Keep the domain boundary
 * strict so malformed provider values still degrade to unknown freshness.
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
  row: FfScouterStatsRowDto,
): BattleIntel {
  if (
    !Number.isSafeInteger(row.player_id) ||
    row.player_id <= 0
  ) {
    throw new Error(
      'FFScouter returned an invalid player ID.',
    )
  }

  const playerId = row.player_id
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
