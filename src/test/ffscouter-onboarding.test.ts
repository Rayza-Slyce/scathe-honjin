import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  FfScouterApiError,
  checkFfScouterRegistration,
  registerFfScouter,
} from '../api/ffscouter/onboarding'

const TEST_KEY = '1234567890ABCDEF'

function checkKeyResponse(
  registered: boolean,
): object {
  return {
    key: '[redacted in test fixture]',
    is_registered: registered,
    registered_at: null,
    last_used: null,
    policy_version: null,
    policy_update_required: false,
    is_premium: false,
    premium_expires_at: null,
    faction_id: null,
    faction_premium_expires_at: null,
    premium_entitlement_source: 'none',
    elimination_team: null,
  }
}

describe('FFScouter onboarding', () => {
  it('normalises the observed check-key response', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify(
            checkKeyResponse(true),
          ),
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
      checkFfScouterRegistration(
        TEST_KEY,
        fetchImpl,
      ),
    ).resolves.toEqual({
      registered: true,
      policyUpdateRequired: false,
    })
  })

  it('requires explicit consent before registration', async () => {
    const fetchImpl =
      vi.fn() as unknown as typeof fetch

    await expect(
      registerFfScouter(
        TEST_KEY,
        false,
        fetchImpl,
      ),
    ).rejects.toMatchObject({
      name: 'FfScouterApiError',
      kind: 'consent-required',
    } satisfies Partial<FfScouterApiError>)

    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('posts the verified registration payload then confirms through check-key', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(
        async (
          input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          expect(String(input)).toBe(
            'https://ffscouter.com/api/v1/register',
          )

          expect(init?.method).toBe('POST')

          expect(
            JSON.parse(
              String(init?.body),
            ),
          ).toEqual({
            key: TEST_KEY,
            agree_to_data_policy: true,
            signup_source: 'ScatheHonjin',
          })

          return new Response(
            JSON.stringify({
              success: true,
            }),
            {
              status: 200,
              headers: {
                'Content-Type':
                  'application/json',
              },
            },
          )
        },
      )
      .mockImplementationOnce(
        async (
          input: RequestInfo | URL,
        ) => {
          const url =
            new URL(String(input))

          expect(url.pathname).toBe(
            '/api/v1/check-key',
          )

          expect(
            url.searchParams.get('key'),
          ).toBe(TEST_KEY)

          return new Response(
            JSON.stringify(
              checkKeyResponse(true),
            ),
            {
              status: 200,
              headers: {
                'Content-Type':
                  'application/json',
              },
            },
          )
        },
      ) as unknown as typeof fetch

    await expect(
      registerFfScouter(
        TEST_KEY,
        true,
        fetchImpl,
      ),
    ).resolves.toEqual({
      registered: true,
      policyUpdateRequired: false,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('treats an already-registered response as success after confirming status', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              code: 8,
              error:
                'API key is already registered',
            }),
            {
              status: 409,
              headers: {
                'Content-Type':
                  'application/json',
              },
            },
          ),
      )
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify(
              checkKeyResponse(true),
            ),
            {
              status: 200,
              headers: {
                'Content-Type':
                  'application/json',
              },
            },
          ),
      ) as unknown as typeof fetch

    await expect(
      registerFfScouter(
        TEST_KEY,
        true,
        fetchImpl,
      ),
    ).resolves.toEqual({
      registered: true,
      policyUpdateRequired: false,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('preserves FFScouter retry-after information on throttling', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            code: 21,
            error:
              'Rate limit exceeded. Please retry shortly.',
            retry_after_seconds: 28,
          }),
          {
            status: 429,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        ),
    ) as typeof fetch

    await expect(
      registerFfScouter(
        TEST_KEY,
        true,
        fetchImpl,
      ),
    ).rejects.toMatchObject({
      name: 'FfScouterApiError',
      kind: 'http',
      httpStatus: 429,
      code: 21,
      retryAfterSeconds: 28,
    } satisfies Partial<FfScouterApiError>)
  })
})
