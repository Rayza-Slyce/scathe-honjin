import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  normaliseTornFactionSearchResult,
  normaliseTornUserProfile,
  normaliseTornUserSearchResult,
} from '../api/torn/normalise'
import { createHonjinRuntime } from '../app/runtime'

const now = 1_800_000_000

const profileResponse = {
  profile: {
    id: 9001,
    name: 'ReconTarget',
    level: 42,
    faction_id: 777,
    status: {
      description: 'Okay',
      details: '',
      plane_image_type: null,
      state: 'Okay',
      until: null,
    },
    last_action: {
      relative: '2 minutes ago',
      status: 'Online',
      timestamp: now - 120,
    },
    life: {
      current: 620,
      maximum: 4_500,
    },
  },
}

describe('Torn Spy Room normalisation', () => {
  it('normalises player search identity without inventing faction context', () => {
    expect(
      normaliseTornUserSearchResult({
        id: 9001,
        name: 'ReconTarget',
        level: 42,
        online: 'Offline',
        faction_id: 777,
      }),
    ).toEqual({
      id: 9001,
      name: 'ReconTarget',
      level: 42,
      factionId: 777,
    })

    expect(
      normaliseTornUserSearchResult({
        id: 9002,
        name: 'NoFaction',
        level: 10,
        online: 'Offline',
        faction_id: 0,
      }).factionId,
    ).toBeNull()
  })

  it('normalises faction search identity', () => {
    expect(
      normaliseTornFactionSearchResult({
        id: 777,
        name: 'Recon Faction',
        respect: 1_234_567,
        members: 55,
        is_destroyed: false,
        is_recruiting: false,
      }),
    ).toEqual({
      id: 777,
      name: 'Recon Faction',
      members: 55,
      respect: 1_234_567,
    })
  })

  it('preserves explicit-profile life separately from status and battle intel', () => {
    const recon = normaliseTornUserProfile(
      profileResponse,
      now,
    )

    expect(recon.player).toMatchObject({
      id: 9001,
      name: 'ReconTarget',
      status: {
        state: 'okay',
      },
    })
    expect(recon.factionId).toBe(777)
    expect(recon.health).toEqual({
      current: 620,
      maximum: 4_500,
      observedAt: now,
    })
  })
})

describe('HONJIN Spy Room runtime', () => {
  it('searches players and factions through explicit scheduler work', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL) => {
        const url = new URL(input.toString())

        if (
          url.pathname === '/v2/user/search'
        ) {
          expect(
            url.searchParams.get('name'),
          ).toBe('Recon')

          return new Response(
            JSON.stringify({
              search: [
                {
                  id: 9001,
                  name: 'ReconTarget',
                  level: 42,
                  online: 'Offline',
                  faction_id: 777,
                  icons: {},
                },
              ],
            }),
            { status: 200 },
          )
        }

        if (
          url.pathname ===
          '/v2/faction/search'
        ) {
          expect(
            url.searchParams.get('name'),
          ).toBe('Recon')

          return new Response(
            JSON.stringify({
              search: [
                {
                  id: 777,
                  name: 'Recon Faction',
                  respect: 1_234_567,
                  members: 55,
                  is_destroyed: false,
                  is_recruiting: false,
                },
              ],
            }),
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
        now: () => now * 1000,
      },
    )

    await expect(
      runtime.searchPlayers('Recon'),
    ).resolves.toEqual([
      {
        id: 9001,
        name: 'ReconTarget',
        level: 42,
        factionId: 777,
      },
    ])

    await expect(
      runtime.searchFactions('Recon'),
    ).resolves.toEqual([
      {
        id: 777,
        name: 'Recon Faction',
        members: 55,
        respect: 1_234_567,
      },
    ])
  })

  it('loads one explicit player profile with current/max life', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL) => {
        const url = new URL(input.toString())

        expect(url.pathname).toBe(
          '/v2/user/9001/profile',
        )

        return new Response(
          JSON.stringify(profileResponse),
          { status: 200 },
        )
      },
    ) as typeof fetch

    const runtime = createHonjinRuntime(
      '1234567890ABCDEF',
      {
        fetchImpl,
        now: () => now * 1000,
      },
    )

    const recon =
      await runtime.loadPlayerRecon(
        9001,
        'explicit',
      )

    expect(recon.health).toEqual({
      current: 620,
      maximum: 4_500,
      observedAt: now,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('deduplicates identical live searches through the central cache', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ search: [] }),
          { status: 200 },
        ),
    ) as typeof fetch

    const runtime = createHonjinRuntime(
      '1234567890ABCDEF',
      {
        fetchImpl,
        now: () => now * 1000,
      },
    )

    await Promise.all([
      runtime.searchPlayers('Same Name'),
      runtime.searchPlayers('same name'),
    ])

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
