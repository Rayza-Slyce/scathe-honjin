import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  TornApiError,
  requestTornJson,
} from '../api/torn/client'
import type {
  TornFactionBasicResponseDto,
  TornKeyInfoResponseDto,
  TornUserBasicResponseDto,
  TornUserBattlestatsResponseDto,
} from '../api/torn/onboarding-contracts'
import {
  getMissingRequiredTornSelections,
  normaliseCurrentUser,
  normaliseCurrentUserBattleStats,
} from '../api/torn/onboarding'

const TEST_KEY = '1234567890ABCDEF'

function ownFaction(): TornFactionBasicResponseDto {
  return {
    basic: {
      id: 654321,
      name: 'SCATHE',
    },
  }
}

function completeKeyInfo(): TornKeyInfoResponseDto {
  return {
    info: {
      selections: {
        user: [
          'basic',
          'battlestats',
          'property',
          'attacks',
          'hof',
        ],
        faction: [
          'chain',
        ],
      },
      user: {
        id: 123456,
        faction_id: 654321,
        company_id: 0,
      },
    },
  }
}

describe('Torn onboarding', () => {
  it('does not require public faction wars or members as explicit grants', () => {
    const response = completeKeyInfo()

    response.info.selections.faction = [
      'chain',
    ]

    expect(
      getMissingRequiredTornSelections(
        response,
      ),
    ).toEqual([])
  })

  it('detects exactly which required selections are missing', () => {
    const response = completeKeyInfo()

    response.info.selections.user = [
      'basic',
      'battlestats',
      'property',
      'hof',
    ]

    response.info.selections.faction = [
      'wars',
      'members',
    ]

    expect(
      getMissingRequiredTornSelections(
        response,
      ),
    ).toEqual([
      {
        scope: 'user',
        selection: 'attacks',
      },
      {
        scope: 'faction',
        selection: 'chain',
      },
    ])
  })

  it('preserves Torn v2 battlestat modifier evidence without applying arithmetic', () => {
    const snapshot = normaliseCurrentUserBattleStats(
      {
        battlestats: {
          total: 10_000,
          strength: {
            value: 4_000,
            modifier: 25,
            modifiers: [
              {
                effect: 'Vicodin',
                type: 'Drug',
                value: 25,
              },
            ],
          },
          defense: {
            value: 3_000,
            modifier: -5,
            modifiers: [
              {
                effect: 'Addiction',
                type: 'Passive',
                value: -5,
              },
            ],
          },
          speed: {
            value: 2_000,
            modifier: 0,
            modifiers: [],
          },
          dexterity: {
            value: 1_000,
            modifier: 10,
            modifiers: [
              {
                effect: 'Education',
                type: 'Passive',
                value: 10,
              },
            ],
          },
        },
      },
      1_800_000_000,
    )

    expect(snapshot).toEqual({
      total: 10_000,
      strength: {
        value: 4_000,
        modifier: 25,
        modifiers: [
          {
            effect: 'Vicodin',
            type: 'Drug',
            value: 25,
          },
        ],
      },
      defense: {
        value: 3_000,
        modifier: -5,
        modifiers: [
          {
            effect: 'Addiction',
            type: 'Passive',
            value: -5,
          },
        ],
      },
      speed: {
        value: 2_000,
        modifier: 0,
        modifiers: [],
      },
      dexterity: {
        value: 1_000,
        modifier: 10,
        modifiers: [
          {
            effect: 'Education',
            type: 'Passive',
            value: 10,
          },
        ],
      },
      observedAt: 1_800_000_000,
    })
  })

  it('falls back when the detailed Torn battlestat shape is incomplete', () => {
    expect(
      normaliseCurrentUserBattleStats(
        {
          battlestats: {
            total: 10_000,
          },
        },
        1_800_000_000,
      ),
    ).toBeNull()
  })

  it('normalises observed identity and battle stats into CurrentUser', () => {
    const keyInfo = completeKeyInfo()

    const basic: TornUserBasicResponseDto = {
      profile: {
        id: 123456,
        name: 'SCATHE Member',
      },
    }

    const battlestats: TornUserBattlestatsResponseDto =
      {
        battlestats: {
          total: 8_675,
        },
      }

    expect(
      normaliseCurrentUser(
        keyInfo,
        basic,
        battlestats,
        ownFaction(),
      ),
    ).toEqual({
      id: 123456,
      name: 'SCATHE Member',
      faction: {
        id: 654321,
        name: 'SCATHE',
      },
      battleStatsTotal: 8_675,
    })
  })

  it('rejects mismatched faction responses', () => {
    const keyInfo = completeKeyInfo()
    const faction = ownFaction()

    faction.basic.id = 999999

    expect(() =>
      normaliseCurrentUser(
        keyInfo,
        {
          profile: {
            id: 123456,
            name: 'SCATHE Member',
          },
        },
        {
          battlestats: {
            total: 8_675,
          },
        },
        faction,
      ),
    ).toThrow(
      'Torn faction responses did not match.',
    )
  })

  it('rejects mismatched identity responses', () => {
    const keyInfo = completeKeyInfo()

    expect(() =>
      normaliseCurrentUser(
        keyInfo,
        {
          profile: {
            id: 999999,
            name: 'Wrong User',
          },
        },
        {
          battlestats: {
            total: 1,
          },
        },
        ownFaction(),
      ),
    ).toThrow(
      'Torn identity responses did not match.',
    )
  })

  it('sends the key in the Torn Authorization header rather than the URL', async () => {
    const fetchImpl = vi.fn(
      async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        const url = String(input)

        expect(url).toBe(
          'https://api.torn.com/v2/key/info',
        )

        expect(url).not.toContain(TEST_KEY)

        expect(
          new Headers(
            init?.headers,
          ).get('Authorization'),
        ).toBe(`ApiKey ${TEST_KEY}`)

        return new Response(
          JSON.stringify(completeKeyInfo()),
          {
            status: 200,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        )
      },
    ) as typeof fetch

    await requestTornJson(
      'key/info',
      TEST_KEY,
      fetchImpl,
    )

    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('treats HTTP 200 plus a Torn error object as failure', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 16,
              error:
                'Access level of this key is not high enough',
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        ),
    ) as typeof fetch

    await expect(
      requestTornJson(
        'user/battlestats',
        TEST_KEY,
        fetchImpl,
      ),
    ).rejects.toMatchObject({
      name: 'TornApiError',
      kind: 'permission',
      code: 16,
      httpStatus: 200,
    } satisfies Partial<TornApiError>)
  })

  it('rejects malformed keys before making a request', async () => {
    const fetchImpl =
      vi.fn() as unknown as typeof fetch

    await expect(
      requestTornJson(
        'key/info',
        'not-a-key',
        fetchImpl,
      ),
    ).rejects.toMatchObject({
      kind: 'invalid-key',
    })

    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
