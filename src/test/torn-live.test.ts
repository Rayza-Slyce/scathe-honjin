import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type {
  TornFactionMembersResponseDto,
  TornFactionWarsResponseDto,
} from '../api/torn/contracts'
import {
  normaliseTornFactionRoster,
  normaliseTornRankedWar,
} from '../api/torn/normalise'
import { createHonjinRuntime } from '../app/runtime'
import { deriveAvailability } from '../intel/availability'

const observedAt = 1_800_000_000

const warResponse: TornFactionWarsResponseDto = {
  wars: {
    ranked: {
      war_id: 777,
      start: observedAt - 60,
      end: null,
      target: 7_500,
      winner: null,
      factions: [
        {
          id: 202,
          name: 'Enemy Faction',
          score: 900,
          chain: 12,
        },
        {
          id: 101,
          name: 'SCATHE',
          score: 1_200,
          chain: 23,
        },
      ],
    },
  },
}

const membersResponse: TornFactionMembersResponseDto = {
  members: [
    {
      id: 9001,
      name: 'Available Target',
      level: 42,
      position: 'Member',
      status: {
        description: 'Okay',
        details: '',
        plane_image_type: null,
        state: 'Okay',
        until: null,
      },
      last_action: {
        relative: '1 minute ago',
        status: 'Online',
        timestamp: observedAt - 60,
      },
    },
    {
      id: 9002,
      name: 'Hospital Target',
      level: 50,
      position: 'Member',
      status: {
        description: 'Hospital for 5 mins',
        details: '',
        plane_image_type: null,
        state: 'Hospital',
        until: observedAt + 300,
      },
      last_action: null,
    },
  ],
}

describe('live Torn war normalisation', () => {
  it('normalises the current Ranked War by faction ID rather than array order', () => {
    expect(
      normaliseTornRankedWar(
        101,
        warResponse,
        observedAt,
      ),
    ).toEqual({
      warId: 777,
      ownFaction: {
        id: 101,
        name: 'SCATHE',
        score: 1_200,
        chain: 23,
      },
      enemyFaction: {
        id: 202,
        name: 'Enemy Faction',
        score: 900,
        chain: 12,
      },
      status: 'active',
      targetScore: 7_500,
      startsAt: observedAt - 60,
      endsAt: null,
      observedAt,
    })
  })

  it('represents no current Ranked War explicitly as null', () => {
    expect(
      normaliseTornRankedWar(
        101,
        {
          wars: {
            ranked: null,
          },
        },
        observedAt,
      ),
    ).toBeNull()
  })

  it('rejects a malformed Ranked War that does not include the current faction', () => {
    expect(() =>
      normaliseTornRankedWar(
        303,
        warResponse,
        observedAt,
      ),
    ).toThrow(
      'Ranked War response does not include the current faction.',
    )
  })

  it('normalises one roster observation without inventing health data', () => {
    const roster =
      normaliseTornFactionRoster(
        202,
        membersResponse,
        observedAt,
      )

    expect(roster.factionId).toBe(202)
    expect(roster.observedAt).toBe(
      observedAt,
    )
    expect(roster.members).toHaveLength(2)
    expect(roster.members[1]?.status).toMatchObject({
      state: 'hospital',
      hospitalUntil: observedAt + 300,
    })
    expect(
      'life' in roster.members[0]!,
    ).toBe(false)
  })
})

describe('authoritative availability', () => {
  const okayStatus =
    normaliseTornFactionRoster(
      202,
      membersResponse,
      observedAt,
    ).members[0]!.status
  const hospitalStatus =
    normaliseTornFactionRoster(
      202,
      membersResponse,
      observedAt,
    ).members[1]!.status

  it('treats a sufficiently fresh Okay observation as attackable', () => {
    expect(
      deriveAvailability(
        okayStatus,
        observedAt,
        observedAt + 20,
        30,
      ),
    ).toBe('attackable')
  })

  it('keeps a fresh Hospital observation unavailable even after its countdown timestamp', () => {
    expect(
      deriveAvailability(
        hospitalStatus,
        observedAt,
        observedAt + 400,
        600,
      ),
    ).toBe('unavailable')
  })

  it('degrades stale authoritative status to unknown instead of assuming availability', () => {
    expect(
      deriveAvailability(
        okayStatus,
        observedAt,
        observedAt + 31,
        30,
      ),
    ).toBe('unknown')
  })
})

describe('HONJIN live runtime', () => {
  it('fetches and normalises war and roster through central logical cache keys', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL) => {
        const url = input.toString()

        if (url.endsWith('/faction/101/wars')) {
          return new Response(
            JSON.stringify(warResponse),
            { status: 200 },
          )
        }

        if (
          url.endsWith(
            '/faction/202/members',
          )
        ) {
          return new Response(
            JSON.stringify(membersResponse),
            { status: 200 },
          )
        }

        return new Response('{}', {
          status: 404,
        })
      },
    ) as typeof fetch

    const runtime = createHonjinRuntime(
      '1234567890ABCDEF',
      {
        fetchImpl,
        now: () => observedAt * 1000,
      },
    )

    const [firstWar, secondWar] =
      await Promise.all([
        runtime.loadCurrentWar(101),
        runtime.loadCurrentWar(101),
      ])

    expect(firstWar).toEqual(secondWar)
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    const snapshot =
      await runtime.loadWarBoardSnapshot(101)

    expect(snapshot.war).toEqual(firstWar)
    expect(
      snapshot.enemyRoster?.factionId,
    ).toBe(202)
    expect(
      snapshot.enemyRoster?.observedAt,
    ).toBe(observedAt)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not request an enemy roster when there is no current Ranked War', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            wars: {
              ranked: null,
            },
          }),
          { status: 200 },
        ),
    ) as typeof fetch

    const runtime = createHonjinRuntime(
      '1234567890ABCDEF',
      {
        fetchImpl,
        now: () => observedAt * 1000,
      },
    )

    await expect(
      runtime.loadWarBoardSnapshot(101),
    ).resolves.toEqual({
      war: null,
      enemyRoster: null,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
