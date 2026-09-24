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
          options.factionId ?? 654321,
        company_id: 0,
      },
    },
  }
}

function createFetch(
  options: {
    factionName?: string
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
        return jsonResponse(keyInfo())
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
          '/v2/faction/654321/wars' ||
        url.pathname ===
          '/v2/faction/654321/members'
      ) {
        return jsonResponse({})
      }

      if (
        url.pathname ===
        '/v2/faction/654321/basic'
      ) {
        return jsonResponse({
          basic: {
            id: 654321,
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
        return jsonResponse({})
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

  it('connects a SCATHE member using human-readable faction identity', async () => {
    const result =
      await connectHonjin(
        TEST_KEY,
        'device',
        createFetch(),
      )

    expect(result).toEqual({
      user: {
        id: 123456,
        name: 'Rayza',
        faction: {
          id: 654321,
          name: 'SCATHE',
        },
        battleStatsTotal: 8_675,
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

  it('rejects another faction by name and never stores the key', async () => {
    await expect(
      connectHonjin(
        TEST_KEY,
        'device',
        createFetch({
          factionName:
            'OTHER FACTION',
        }),
      ),
    ).rejects.toMatchObject({
      name: 'HonjinConnectionError',
      kind: 'wrong-faction',
    } satisfies Partial<HonjinConnectionError>)

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
