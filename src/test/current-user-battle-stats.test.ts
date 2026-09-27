import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  deriveCurrentUserBattleStats,
  selectCurrentUserBattleStats,
} from '../intel/current-user-battle-stats'
import type {
  CurrentUser,
  CurrentUserBattleStats,
} from '../types'

const now = 1_800_000_000

const stats: CurrentUserBattleStats = {
  total: 10_000,
  strength: {
    value: 2_500,
    modifier: 25,
    modifiers: [],
  },
  defense: {
    value: 2_500,
    modifier: 25,
    modifiers: [],
  },
  speed: {
    value: 2_500,
    modifier: 25,
    modifiers: [],
  },
  dexterity: {
    value: 2_500,
    modifier: 25,
    modifiers: [],
  },
  observedAt: now - 15,
}

const user: CurrentUser = {
  id: 101,
  name: 'Rayza',
  faction: {
    id: 501,
    name: 'SCATHE',
  },
  battleStatsTotal: 10_000,
  battleStatsCurrent: stats,
}

describe('current-user battle stats', () => {
  it('derives the adjusted total from Torn per-stat modifiers', () => {
    expect(
      deriveCurrentUserBattleStats(stats),
    ).toEqual({
      baseTotal: 10_000,
      adjustedTotal: 12_500,
      delta: 2_500,
    })
  })

  it('reduces current strength when Torn reports a negative aggregate modifier', () => {
    const negative = deriveCurrentUserBattleStats({
      ...stats,
      strength: { ...stats.strength, modifier: -19 },
      defense: { ...stats.defense, modifier: -19 },
      speed: { ...stats.speed, modifier: -19 },
      dexterity: { ...stats.dexterity, modifier: -19 },
    })

    expect(negative).toEqual({
      baseTotal: 10_000,
      adjustedTotal: 8_100,
      delta: -1_900,
    })
  })

  it('uses a fresh adjusted total for personalised recommendations', () => {
    expect(
      selectCurrentUserBattleStats(
        user,
        now,
      ),
    ).toEqual({
      total: 12_500,
      baseTotal: 10_000,
      adjusted: true,
      observedAt: now - 15,
      ageSeconds: 15,
    })
  })

  it('falls back to base BS when the modifier snapshot is stale', () => {
    expect(
      selectCurrentUserBattleStats(
        user,
        now + 120,
      ),
    ).toEqual({
      total: 10_000,
      baseTotal: 10_000,
      adjusted: false,
      observedAt: now - 15,
      ageSeconds: 135,
    })
  })

  it('rejects a modifier snapshot whose per-stat values do not match Torn total', () => {
    expect(
      deriveCurrentUserBattleStats({
        ...stats,
        total: 20_000,
      }),
    ).toBeNull()
  })
})
