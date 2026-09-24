import { describe, expect, it } from 'vitest'
import type { FfScouterStatsRowDto } from '../api/ffscouter/contracts'
import { normaliseFfScouterBattleIntel } from '../api/ffscouter/normalise'

describe('normaliseFfScouterBattleIntel', () => {
  it('normalises the free public BSS bucket into HONJIN battle intel', () => {
    const row: FfScouterStatsRowDto = {
      player_id: 123456,
      source: 'bss',
      available_estimates: {
        bss: {
          bss_public: 4_900,
          bs_estimate: 5_130,
          bs_estimate_human: '5.13k',
          last_updated: 1_800_000_000,
          fair_fight: 1.4,
        },
      },
    }

    expect(
      normaliseFfScouterBattleIntel(row),
    ).toEqual({
      playerId: 123456,
      estimatedBattleStats: 5_130,
      publicBss: 4_900,
      fairFight: 1.4,
      updatedAt: 1_800_000_000,
      source: 'ffscouter-public-bss',
    })
  })

  it('uses available_estimates.bss rather than merged or premium data', () => {
    const row: FfScouterStatsRowDto & {
      bs_estimate: number
      fair_fight: number
    } = {
      player_id: 234567,
      source: 'premium',
      bs_estimate: 999_999_999,
      fair_fight: 9.99,
      available_estimates: {
        bss: {
          bss_public: 7_500,
          bs_estimate: 8_000,
          bs_estimate_human: '8k',
          last_updated: 1_800_000_100,
          fair_fight: 1.55,
        },
        premium: {
          bs_estimate: 1,
          fair_fight: 8.88,
        },
        spies: {
          bs_estimate: 2,
        },
      },
    }

    const intel =
      normaliseFfScouterBattleIntel(row)

    expect(intel.estimatedBattleStats).toBe(8_000)
    expect(intel.publicBss).toBe(7_500)
    expect(intel.fairFight).toBe(1.55)
    expect(intel.source).toBe(
      'ffscouter-public-bss',
    )
  })

  it('returns unavailable intel when the public BSS bucket is absent', () => {
    const row: FfScouterStatsRowDto = {
      player_id: 345678,
      source: 'premium',
      available_estimates: {
        premium: {
          some: 'data',
        },
      },
    }

    expect(
      normaliseFfScouterBattleIntel(row),
    ).toEqual({
      playerId: 345678,
      estimatedBattleStats: null,
      publicBss: null,
      fairFight: null,
      updatedAt: null,
      source: 'unavailable',
    })
  })

  it('keeps caller-specific Fair Fight attached to the provider player ID', () => {
    const first: FfScouterStatsRowDto = {
      player_id: 456789,
      available_estimates: {
        bss: {
          bss_public: 10_000,
          bs_estimate: 11_000,
          bs_estimate_human: '11k',
          last_updated: null,
          fair_fight: 1.3,
        },
      },
    }

    const second: FfScouterStatsRowDto = {
      player_id: 567890,
      available_estimates: {
        bss: {
          bss_public: 20_000,
          bs_estimate: 21_000,
          bs_estimate_human: '21k',
          last_updated: null,
          fair_fight: 2.1,
        },
      },
    }

    const firstIntel =
      normaliseFfScouterBattleIntel(first)

    const secondIntel =
      normaliseFfScouterBattleIntel(second)

    expect(firstIntel).toMatchObject({
      playerId: 456789,
      fairFight: 1.3,
    })

    expect(secondIntel).toMatchObject({
      playerId: 567890,
      fairFight: 2.1,
    })
  })

  it('does not accept malformed timestamp data despite the documented number contract', () => {
    const row: FfScouterStatsRowDto = {
      player_id: 678901,
      available_estimates: {
        bss: {
          bss_public: 1_000,
          bs_estimate: 1_100,
          bs_estimate_human: '1.1k',
          last_updated:
            '2026-09-18T12:00:00Z' as unknown as number,
          fair_fight: 1.2,
        },
      },
    }

    expect(
      normaliseFfScouterBattleIntel(
        row,
      ).updatedAt,
    ).toBeNull()
  })

  it('rejects an invalid provider player ID instead of joining by array position', () => {
    const row: FfScouterStatsRowDto = {
      player_id: 0,
      available_estimates: null,
    }

    expect(() =>
      normaliseFfScouterBattleIntel(row),
    ).toThrow(
      'FFScouter returned an invalid player ID.',
    )
  })
})
