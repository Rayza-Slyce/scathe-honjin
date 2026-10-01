import { describe, expect, it } from 'vitest'
import {
  createMemoryTeamSnapshotStore,
  normaliseTeamSnapshotState,
} from '../storage/team-snapshot'
import type { TeamSnapshotState } from '../storage/team-snapshot'

const snapshot: TeamSnapshotState = {
  factionId: 501,
  roster: {
    factionId: 501,
    observedAt: 1_800_000_000,
    members: [
      {
        id: 101,
        name: 'Rayza',
        level: 50,
        factionPosition: 'Co-leader',
        status: {
          state: 'okay',
          description: 'Okay',
          details: null,
          planeImageType: null,
          hospitalUntil: null,
          lastAction: {
            status: 'Online',
            relative: '1 minute ago',
            at: 1_799_999_940,
          },
        },
      },
    ],
  },
  battleIntel: {
    callerPlayerId: 101,
    observedAt: 1_800_000_000,
    intel: [
      {
        playerId: 101,
        estimatedBattleStats: 43_738,
        publicBss: 43_738,
        fairFight: 1,
        updatedAt: 1_799_999_900,
        source: 'ffscouter-public-bss',
      },
    ],
  },
  savedAt: 1_800_000_000,
}

describe('Team snapshot persistence', () => {
  it('round-trips the last successful roster and enrichment per user', async () => {
    const store = createMemoryTeamSnapshotStore()

    await store.save(101, snapshot)

    expect(await store.load(101, 501)).toEqual(snapshot)
    expect(await store.load(102, 501)).toBeNull()
  })

  it('rejects a snapshot from a different faction', () => {
    expect(normaliseTeamSnapshotState(999, snapshot)).toBeNull()
  })
})
