import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  buildIndividualSpyTarget,
  createEmptySpyRoomView,
  expireSpyRoomStatus,
  sortSpyTargets,
  type SpyTargetView,
} from '../features/targets/live-spy'

const now = 1_800_000_000
const user = {
  id: 101,
  name: 'Rayza',
  faction: {
    id: 501,
    name: 'SCATHE',
  },
  battleStatsTotal: 10_000,
}
function spyTarget(
  overrides: Partial<SpyTargetView> &
    Pick<SpyTargetView, 'id' | 'name'>,
): SpyTargetView {
  return {
    level: 1,
    factionId: 777,
    battleStats: 'UNKNOWN',
    battleStatsValue: null,
    fairFight: '—',
    fairFightValue: null,
    suitability: 'UNKNOWN',
    confidence: 'UNKNOWN',
    confidenceValue: 'unknown',
    freshness: 'unknown',
    availability: 'unknown',
    status: 'Status unknown',
    statusStale: false,
    state: 'unknown',
    healthObservedAt: null,
    attackable: false,
    ratio: null,
    strengthFit: 'unknown',
    source: 'unavailable',
    intelUpdatedAt: null,
    statusObservedAt: now,
    ...overrides,
  }
}

const recon = {
  player: {
    id: 9001,
    name: 'ReconTarget',
    level: 42,
    factionPosition: null,
    status: {
      state: 'okay' as const,
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
  factionId: 777,
  health: {
    current: 620,
    maximum: 4_500,
    observedAt: now,
  },
  observedAt: now,
}

describe('live Spy Room target view', () => {
  it('keeps explicit profile HP separate from BS suitability', () => {
    const target = buildIndividualSpyTarget(
      user,
      recon,
      {
        callerPlayerId: 101,
        observedAt: now,
        intel: [
          {
            playerId: 9001,
            estimatedBattleStats: 4_000,
            publicBss: 4_100,
            fairFight: 2.12,
            updatedAt: now - 60,
            source:
              'ffscouter-public-bss' as const,
          },
        ],
      },
      now,
      {
        statusMaxAgeSeconds: 30,
      },
    )

    expect(target.health).toBe(
      '620 / 4.50k · 14%',
    )
    expect(target.suitability).toBe(
      'HIT NOW',
    )
    expect(target.ratio).toBe(0.4)
    expect(target.confidence).toBe(
      'UNKNOWN',
    )
  })

  it('expires explicit status locally without inferring renewed availability', () => {
    const target = buildIndividualSpyTarget(
      user,
      recon,
      {
        callerPlayerId: 101,
        observedAt: now,
        intel: [],
      },
      now,
      {
        statusMaxAgeSeconds: 30,
      },
    )
    const view = {
      ...createEmptySpyRoomView(),
      individualTargets: [target],
    }

    const expired = expireSpyRoomStatus(
      view,
      now + 31,
      30,
    )

    expect(
      expired.individualTargets[0],
    ).toMatchObject({
      availability: 'unknown',
      attackable: false,
      statusStale: true,
      health: undefined,
    })
  })
})

describe('Spy Room sorting', () => {
  const targets = [
    spyTarget({
      id: 3,
      name: 'Zulu',
      battleStats: 'UNKNOWN',
      battleStatsValue: null,
      fairFight: '—',
      fairFightValue: null,
      availability: 'unknown',
      state: 'unknown',
    }),
    spyTarget({
      id: 1,
      name: 'Alpha',
      battleStats: '5.00k',
      battleStatsValue: 5_000,
      fairFight: '2.30',
      fairFightValue: 2.3,
      availability: 'attackable',
      attackable: true,
      state: 'okay',
    }),
    spyTarget({
      id: 2,
      name: 'Bravo',
      battleStats: '2.00k',
      battleStatsValue: 2_000,
      fairFight: '1.70',
      fairFightValue: 1.7,
      availability: 'unavailable',
      state: 'hospital',
    }),
  ]

  it('sorts BS and FF in both directions while keeping unknown values last', () => {
    expect(
      sortSpyTargets(targets, 'bs-asc').map(
        (target) => target.id,
      ),
    ).toEqual([2, 1, 3])

    expect(
      sortSpyTargets(targets, 'bs-desc').map(
        (target) => target.id,
      ),
    ).toEqual([1, 2, 3])

    expect(
      sortSpyTargets(targets, 'ff-asc').map(
        (target) => target.id,
      ),
    ).toEqual([2, 1, 3])

    expect(
      sortSpyTargets(targets, 'ff-desc').map(
        (target) => target.id,
      ),
    ).toEqual([1, 2, 3])
  })

  it('sorts actionable or blocked statuses first without promoting stale observations', () => {
    const stale = spyTarget({
      id: 4,
      name: 'Stale',
      availability: 'unknown',
      state: 'okay',
      statusStale: true,
    })
    const withStale = [...targets, stale]

    expect(
      sortSpyTargets(
        withStale,
        'status-ready',
      ).map((target) => target.id),
    ).toEqual([1, 2, 3, 4])

    expect(
      sortSpyTargets(
        withStale,
        'status-blocked',
      ).map((target) => target.id),
    ).toEqual([2, 1, 3, 4])
  })

  it('sorts names deterministically and preserves default provider order', () => {
    expect(
      sortSpyTargets(targets, 'name-asc').map(
        (target) => target.name,
      ),
    ).toEqual(['Alpha', 'Bravo', 'Zulu'])

    expect(
      sortSpyTargets(targets, 'default'),
    ).toBe(targets)
  })
})
