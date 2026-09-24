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

describe('HONJIN FFScouter runtime', () => {
  it('deduplicates player IDs, joins rows by player_id and caches per caller', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL) => {
        const url = new URL(
          input.toString(),
        )

        if (
          url.hostname === 'ffscouter.com' &&
          url.pathname ===
            '/api/v1/get-stats'
        ) {
          expect(
            url.searchParams.get(
              'targets',
            ),
          ).toBe('9001,9002')

          return new Response(
            JSON.stringify([
              {
                player_id: 9002,
                source: 'bss',
                available_estimates: {
                  bss: {
                    bss_public: 340_000,
                    bs_estimate: 350_000,
                    bs_estimate_human:
                      '350k',
                    last_updated:
                      observedAt - 60,
                    fair_fight: 1.8,
                  },
                },
              },
              {
                player_id: 9001,
                source: 'bss',
                available_estimates: {
                  bss: {
                    bss_public: 390_000,
                    bs_estimate: 400_000,
                    bs_estimate_human:
                      '400k',
                    last_updated:
                      observedAt - 120,
                    fair_fight: 1.6,
                  },
                },
              },
            ]),
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

    const first =
      await runtime.loadBattleIntel(
        101,
        [9002, 9001, 9002],
        'active-war',
      )

    expect(
      first.intel.map((item) => ({
        playerId: item.playerId,
        estimatedBattleStats:
          item.estimatedBattleStats,
        fairFight: item.fairFight,
      })),
    ).toEqual([
      {
        playerId: 9001,
        estimatedBattleStats: 400_000,
        fairFight: 1.6,
      },
      {
        playerId: 9002,
        estimatedBattleStats: 350_000,
        fairFight: 1.8,
      },
    ])

    const second =
      await runtime.loadBattleIntel(
        101,
        [9001, 9002],
        'active-war',
      )

    expect(second).toEqual(first)
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await runtime.loadBattleIntel(
      102,
      [9001, 9002],
      'active-war',
    )

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('represents a requested player missing from the FFScouter response as unavailable intel', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              player_id: 9001,
              source: 'bss',
              available_estimates: {
                bss: {
                  bss_public: 390_000,
                  bs_estimate: 400_000,
                  bs_estimate_human:
                    '400k',
                  last_updated:
                    observedAt - 120,
                  fair_fight: 1.6,
                },
              },
            },
          ]),
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

    const snapshot =
      await runtime.loadBattleIntel(
        101,
        [9001, 9002],
      )

    expect(snapshot.intel[1]).toEqual({
      playerId: 9002,
      estimatedBattleStats: null,
      publicBss: null,
      fairFight: null,
      updatedAt: null,
      source: 'unavailable',
    })
  })
})

describe('HONJIN FFScouter shared-ID deduplication', () => {
  it('does not request an overlapping player twice across concurrent surfaces', async () => {
    const requestedTargets: string[] = []
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL) => {
        const url = new URL(
          input.toString(),
        )
        const targets =
          url.searchParams.get(
            'targets',
          ) ?? ''

        requestedTargets.push(targets)

        const rows = targets
          .split(',')
          .filter(Boolean)
          .map((value) => {
            const playerId = Number(value)

            return {
              player_id: playerId,
              source: 'bss',
              available_estimates: {
                bss: {
                  bss_public: playerId,
                  bs_estimate: playerId,
                  bs_estimate_human:
                    String(playerId),
                  last_updated:
                    observedAt - 60,
                  fair_fight: 1.5,
                },
              },
            }
          })

        return new Response(
          JSON.stringify(rows),
          { status: 200 },
        )
      },
    ) as typeof fetch

    const runtime = createHonjinRuntime(
      '1234567890ABCDEF',
      {
        fetchImpl,
        now: () => observedAt * 1000,
      },
    )

    const first = runtime.loadBattleIntel(
      101,
      [9001, 9002],
      'active-war',
    )
    const second = runtime.loadBattleIntel(
      101,
      [9002, 9003],
      'visible-spy',
    )

    const [firstResult, secondResult] =
      await Promise.all([
        first,
        second,
      ])

    expect(
      firstResult.intel.map(
        (item) => item.playerId,
      ),
    ).toEqual([9001, 9002])
    expect(
      secondResult.intel.map(
        (item) => item.playerId,
      ),
    ).toEqual([9002, 9003])
    expect(requestedTargets).toEqual([
      '9001,9002',
      '9003',
    ])
  })
})
