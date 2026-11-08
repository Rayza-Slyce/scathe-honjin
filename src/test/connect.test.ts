import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  HonjinConnectionError,
  connectHonjin,
} from '../app/connect'

const TEST_KEY = '1234567890ABCDEF'

function jsonResponse(
  body: object,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type':
          'application/json',
      },
    },
  )
}

function keyInfo(
  options: {
    userSelections?: string[]
    factionSelections?: string[]
    factionId?: number
  } = {},
): object {
  return {
    info: {
      selections: {
        user:
          options.userSelections ?? [
            'basic',
            'battlestats',
            'property',
            'attacks',
            'hof',
          ],
        faction:
          options.factionSelections ?? [
            'wars',
            'chain',
            'members',
          ],
      },
      user: {
        id: 123456,
        faction_id:
          options.factionId ?? 48572,
        company_id: 0,
      },
    },
  }
}

function createFetch(
  options: {
    factionName?: string
    profileFactionId?: number | null
    keyFactionId?: number
    ffRegistered?: boolean
    ffPolicyUpdateRequired?: boolean
    ffUnavailable?: boolean
    deniedTornPath?: string
  } = {},
): typeof fetch {
  return vi.fn(
    async (
      input: RequestInfo | URL,
    ) => {
      const url =
        new URL(String(input))

      if (
        options.deniedTornPath ===
        url.pathname
      ) {
        return jsonResponse({
          error: {
            code: 16,
            error:
              'Access level of this key is not high enough',
          },
        })
      }

      if (
        url.pathname ===
        '/v2/key/info'
      ) {
        return jsonResponse(keyInfo({ factionId: options.keyFactionId }))
      }

      if (
        url.pathname ===
        '/v2/user/basic'
      ) {
        return jsonResponse({
          profile: {
            id: 123456,
            name: 'Rayza',
          },
        })
      }

      if (
        url.pathname ===
        '/v2/user/battlestats'
      ) {
        return jsonResponse({
          battlestats: {
            total: 8_675,
          },
        })
      }

      if (
        url.pathname ===
          '/v2/faction/48572/wars' ||
        url.pathname ===
          '/v2/faction/48572/members'
      ) {
        return jsonResponse({})
      }

      if (
        url.pathname ===
        '/v2/faction/48572/basic'
      ) {
        return jsonResponse({
          basic: {
            id: 48572,
            name:
              options.factionName ??
              'SCATHE',
          },
        })
      }

      if (
        url.pathname ===
          '/v2/user/search' ||
        url.pathname ===
          '/v2/faction/search'
      ) {
        return jsonResponse({
          search: [],
        })
      }

      if (
        url.pathname ===
        '/v2/user/123456/profile'
      ) {
        return jsonResponse({
          profile: {
            id: 123456,
            name: 'Rayza',
            level: 100,
            faction_id: options.profileFactionId === undefined ? 48572 : options.profileFactionId,
            status: {
              state: 'Okay',
              description: 'Okay',
              details: null,
              plane_image_type: null,
              until: null,
            },
            last_action: {
              status: 'Online',
              relative: '1 minute ago',
              timestamp: 1_800_000_000,
            },
            life: {
              current: 4_250,
              maximum: 5_000,
            },
          },
        })
      }

      if (
        url.pathname ===
        '/api/v1/check-key'
      ) {
        if (options.ffUnavailable) {
          throw new Error(
            'Synthetic FFScouter outage',
          )
        }

        return jsonResponse({
          key: '[redacted]',
          is_registered:
            options.ffRegistered ??
            true,
          registered_at: null,
          last_used: null,
          policy_version: null,
          policy_update_required:
            options
              .ffPolicyUpdateRequired ??
            false,
          is_premium: false,
          premium_expires_at: null,
          faction_id: null,
          faction_premium_expires_at:
            null,
          premium_entitlement_source:
            'none',
          elimination_team: null,
        })
      }

      throw new Error(
        `Unexpected synthetic URL: ${url.pathname}`,
      )
    },
  ) as unknown as typeof fetch
}

describe('connectHonjin', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('does not require key-info faction AA data or an exact faction name', async () => {
    const fetcher = createFetch({ keyFactionId: 0, factionName: 'A renamed SCATHE' })
    const result = await connectHonjin(TEST_KEY, 'session', fetcher)
    expect(result.user.faction.id).toBe(48572)
    expect(vi.mocked(fetcher).mock.calls.filter(([input]) => new URL(String(input)).pathname === '/v2/user/123456/profile')).toHaveLength(1)
  })

  it('connects a current member of faction 48572 using their own profile', async () => {
    const result =
      await connectHonjin(
        TEST_KEY,
        'device',
        createFetch(),
      )

    expect(result).toEqual({
      membershipVerifiedAt: expect.any(Number),
      user: {
        id: 123456,
        name: 'Rayza',
        faction: {
          id: 48572,
          name: 'SCATHE',
        },
        battleStatsTotal: 8_675,
        life: {
          current: 4_250,
          maximum: 5_000,
          observedAt: expect.any(Number),
        },
      },
      ffscouter: {
        status: 'registered',
      },
    })

    expect(
      localStorage.getItem(
        'scathe-honjin:torn-api-key',
      ),
    ).toBe(TEST_KEY)

    expect(sessionStorage.length).toBe(0)
  })

  it('does not store a key when required selections are missing', async () => {
    const fetchImpl = vi.fn(
      async (
        input: RequestInfo | URL,
      ) => {
        const url =
          new URL(String(input))

        if (
          url.pathname ===
          '/v2/key/info'
        ) {
          return jsonResponse(
            keyInfo({
              userSelections: [
                'basic',
                'battlestats',
              ],
            }),
          )
        }

        throw new Error(
          'No dependent request should occur.',
        )
      },
    ) as unknown as typeof fetch

    await expect(
      connectHonjin(
        TEST_KEY,
        'device',
        fetchImpl,
      ),
    ).rejects.toMatchObject({
      name: 'HonjinConnectionError',
      kind: 'missing-selections',
    } satisfies Partial<HonjinConnectionError>)

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)

    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it.each([
    {
      path: '/v2/user/search',
      scope: 'user',
      selection: 'search',
    },
    {
      path: '/v2/user/123456/profile',
      scope: 'user',
      selection: 'profile',
    },
    {
      path: '/v2/faction/search',
      scope: 'faction',
      selection: 'search',
    },
  ] as const)(
    'rejects a key missing live recon capability $scope.$selection',
    async ({
      path,
      scope,
      selection,
    }) => {
      await expect(
        connectHonjin(
          TEST_KEY,
          'device',
          createFetch({
            deniedTornPath: path,
          }),
        ),
      ).rejects.toMatchObject({
        name: 'HonjinConnectionError',
        kind: 'missing-selections',
        missingSelections: [
          {
            scope,
            selection,
          },
        ],
      } satisfies Partial<HonjinConnectionError>)

      expect(localStorage.length).toBe(0)
      expect(sessionStorage.length).toBe(0)
    },
  )

  it('rejects another faction ID even if its name is SCATHE and never stores the key', async () => {
    await expect(
      connectHonjin(
        TEST_KEY,
        'device',
        createFetch({
          profileFactionId: 12345,
        }),
      ),
    ).rejects.toMatchObject({
      name: 'MembershipDeniedError',
    })

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('reports FFScouter registration requirement without blocking Torn connection', async () => {
    const result =
      await connectHonjin(
        TEST_KEY,
        'session',
        createFetch({
          ffRegistered: false,
        }),
      )

    expect(
      result.ffscouter.status,
    ).toBe(
      'registration-required',
    )

    expect(
      sessionStorage.getItem(
        'scathe-honjin:torn-api-key',
      ),
    ).toBe(TEST_KEY)
  })

  it('reports policy update requirement separately', async () => {
    const result =
      await connectHonjin(
        TEST_KEY,
        'session',
        createFetch({
          ffRegistered: true,
          ffPolicyUpdateRequired: true,
        }),
      )

    expect(
      result.ffscouter.status,
    ).toBe(
      'policy-update-required',
    )
  })

  it('degrades cleanly when FFScouter is unavailable', async () => {
    const result =
      await connectHonjin(
        TEST_KEY,
        'session',
        createFetch({
          ffUnavailable: true,
        }),
      )

    expect(
      result.ffscouter,
    ).toMatchObject({
      status: 'unavailable',
    })

    expect(
      sessionStorage.getItem(
        'scathe-honjin:torn-api-key',
      ),
    ).toBe(TEST_KEY)
  })
})
