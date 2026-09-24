import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  buildIndividualSpyTarget,
  createEmptySpyRoomView,
  expireSpyRoomStatus,
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
