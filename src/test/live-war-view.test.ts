import {
  describe,
  expect,
  it,
} from 'vitest'
import type {
  BattleIntelSnapshot,
  CurrentUser,
  WarBoardSnapshot,
} from '../types'
import {
  buildWarBoardView,
  markWarBoardViewStale,
} from '../features/war/live-view'

const now = 1_800_000_000

const user: CurrentUser = {
  id: 101,
  name: 'Rayza',
  faction: {
    id: 501,
    name: 'SCATHE',
  },
  battleStatsTotal: 10_000,
}

const snapshot: WarBoardSnapshot = {
  war: {
    warId: 900,
    ownFaction: {
      id: 501,
      name: 'SCATHE',
      score: 1_200,
      chain: 20,
    },
    enemyFaction: {
      id: 777,
      name: 'Enemy',
      score: 1_050,
      chain: 12,
    },
    status: 'active',
    targetScore: 2_500,
    startsAt: now - 100,
    endsAt: null,
    observedAt: now,
  },
  enemyRoster: {
    factionId: 777,
    observedAt: now,
    members: [
      {
        id: 9001,
        name: 'Useful Target',
        level: 50,
        factionPosition: 'Member',
        status: {
          state: 'okay',
          description: 'Okay',
          details: '',
          planeImageType: null,
          hospitalUntil: null,
          lastAction: {
            status: 'Online',
            relative: '2 minutes ago',
            at: now - 120,
          },
        },
      },
      {
        id: 9002,
        name: 'Hospital Target',
        level: 60,
        factionPosition: 'Member',
        status: {
          state: 'hospital',
          description: 'Hospital',
          details: '',
          planeImageType: null,
          hospitalUntil: now + 300,
          lastAction: {
            status: null,
            relative: null,
            at: null,
          },
        },
      },
    ],
  },
}

const intel: BattleIntelSnapshot = {
  callerPlayerId: 101,
  observedAt: now,
  intel: [
    {
      playerId: 9001,
      estimatedBattleStats: 4_000,
      publicBss: 4_100,
      fairFight: 2.12,
      updatedAt: now - 60,
      source: 'ffscouter-public-bss',
    },
    {
      playerId: 9002,
      estimatedBattleStats: 3_500,
      publicBss: 3_600,
      fairFight: 2.4,
      updatedAt: now - 60,
      source: 'ffscouter-public-bss',
    },
  ],
}

describe('live WAR view model', () => {
  it('keeps confidence as metadata while WAR recommendations use estimated BS', () => {
    const view = buildWarBoardView(
      user,
      snapshot,
      intel,
      now,
      {
        statusMaxAgeSeconds: 30,
      },
    )

    expect(view.phase).toBe('ready')
    expect(view.targets[0]).toMatchObject({
      id: 9001,
      level: 50,
      suitability: 'EASY',
      confidence: 'UNKNOWN',
      freshness: 'unknown',
      attackable: true,
    })
    expect(
      view.recommendations.map((target) => target.id),
    ).toEqual([9001, 9002])
  })

  it('keeps scheduled-war reconnaissance visible but non-actionable until the war starts', () => {
    const scheduledSnapshot: WarBoardSnapshot = {
      ...snapshot,
      war: {
        ...snapshot.war!,
        status: 'scheduled',
        startsAt: now + 3_600,
      },
    }

    const view = buildWarBoardView(
      user,
      scheduledSnapshot,
      intel,
      now,
      {
        statusMaxAgeSeconds: 30,
        battleIntel: {
          highConfidenceMaxAgeSeconds: 300,
          mediumConfidenceMaxAgeSeconds: 600,
          usableMaxAgeSeconds: 900,
        },
      },
    )

    expect(view.phase).toBe('ready')
    expect(view.war?.status).toBe('scheduled')
    expect(
      new Set(
        view.recommendations.map(
          (target) => target.id,
        ),
      ),
    ).toEqual(new Set([9001, 9002]))
    expect(view.targets[0]).toMatchObject({
      id: 9001,
      availability: 'attackable',
      attackable: false,
      attackDisabledLabel: 'WAR NOT STARTED',
    })
  })

  it('promotes a supported live recommendation only when an explicit intel-age policy is supplied', () => {
    const view = buildWarBoardView(
      user,
      snapshot,
      intel,
      now,
      {
        statusMaxAgeSeconds: 30,
        battleIntel: {
          highConfidenceMaxAgeSeconds: 300,
          mediumConfidenceMaxAgeSeconds: 600,
          usableMaxAgeSeconds: 900,
        },
      },
    )

    expect(
      new Set(
        view.recommendations.map(
          (target) => target.id,
        ),
      ),
    ).toEqual(new Set([9001, 9002]))
    expect(
      view.targets.find(
        (target) => target.id === 9002,
      ),
    ).toMatchObject({
      attackable: false,
      availability: 'unavailable',
      recommendation: 'GOOD FIT',
    })
  })

  it('uses fresh current-user modifiers for suitability and falls back when they are stale', () => {
    const modifierStats = {
      total: 10_000,
      strength: { value: 2_500, modifier: 25, modifiers: [] },
      defense: { value: 2_500, modifier: 25, modifiers: [] },
      speed: { value: 2_500, modifier: 25, modifiers: [] },
      dexterity: { value: 2_500, modifier: 25, modifiers: [] },
      observedAt: now - 15,
    }
    const harderIntel: BattleIntelSnapshot = {
      ...intel,
      intel: intel.intel.map((item) =>
        item.playerId === 9001
          ? {
              ...item,
              estimatedBattleStats: 11_000,
            }
          : item,
      ),
    }

    const modifiedView = buildWarBoardView(
      {
        ...user,
        battleStatsCurrent: modifierStats,
      },
      snapshot,
      harderIntel,
      now,
      {
        statusMaxAgeSeconds: 30,
      },
    )

    expect(
      modifiedView.targets.find(
        (target) => target.id === 9001,
      ),
    ).toMatchObject({
      suitability: 'VIABLE',
      ratio: 0.88,
      ownBattleStatsUsed: 12_500,
      ownBattleStatsAdjusted: true,
    })

    const staleView = buildWarBoardView(
      {
        ...user,
        battleStatsCurrent: {
          ...modifierStats,
          observedAt: now - 120,
        },
      },
      snapshot,
      harderIntel,
      now,
      {
        statusMaxAgeSeconds: 30,
      },
    )

    expect(
      staleView.targets.find(
        (target) => target.id === 9001,
      ),
    ).toMatchObject({
      suitability: 'RISKY',
      ratio: 1.1,
      ownBattleStatsUsed: 10_000,
      ownBattleStatsAdjusted: false,
    })
  })

  it('turns retained data non-actionable when a refresh fails', () => {
    const view = buildWarBoardView(
      user,
      snapshot,
      intel,
      now,
      {
        statusMaxAgeSeconds: 30,
        battleIntel: {
          highConfidenceMaxAgeSeconds: 300,
          mediumConfidenceMaxAgeSeconds: 600,
          usableMaxAgeSeconds: 900,
        },
      },
    )

    const stale = markWarBoardViewStale(
      view,
      'Refresh failed.',
    )

    expect(stale.stale).toBe(true)
    expect(stale.recommendations).toEqual([])
    expect(
      stale.targets.every(
        (target) => !target.attackable,
      ),
    ).toBe(true)
    expect(stale.targets[0]?.status).toMatch(
      /STALE$/,
    )
  })

  it('represents the absence of a current war without fabricating targets', () => {
    const view = buildWarBoardView(
      user,
      {
        war: null,
        enemyRoster: null,
      },
      {
        callerPlayerId: user.id,
        intel: [],
        observedAt: now,
      },
      now,
      {
        statusMaxAgeSeconds: 30,
      },
    )

    expect(view.phase).toBe('no-war')
    expect(view.targets).toEqual([])
  })
})
