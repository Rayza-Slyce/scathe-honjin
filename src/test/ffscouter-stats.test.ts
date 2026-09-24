import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  fetchFfScouterStats,
  FFSCOUTER_STATS_MAX_TARGETS,
} from '../api/ffscouter/stats'
import {
  FfScouterApiError,
} from '../api/ffscouter/onboarding'

const apiKey = '1234567890ABCDEF'

describe('FFScouter stats client', () => {
  it('batches targets as one comma-separated get-stats request', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL) => {
        const url = new URL(
          input.toString(),
        )

        expect(url.pathname).toBe(
          '/api/v1/get-stats',
        )
        expect(
          url.searchParams.get('targets'),
        ).toBe('22,11')
        expect(
          url.searchParams.get('key'),
        ).toBe(apiKey)

        return new Response(
          JSON.stringify([]),
          { status: 200 },
        )
      },
    ) as typeof fetch

    await expect(
      fetchFfScouterStats(
        [22, 11, 22],
        apiKey,
        fetchImpl,
      ),
    ).resolves.toEqual([])

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('preserves FFScouter retry guidance on HTTP 429', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            code: 21,
            error: 'Rate limit exceeded.',
            retry_after_seconds: 12,
          }),
          { status: 429 },
        ),
    ) as typeof fetch

    let caught: unknown

    try {
      await fetchFfScouterStats(
        [11],
        apiKey,
        fetchImpl,
      )
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(
      FfScouterApiError,
    )
    expect(caught).toMatchObject({
      kind: 'http',
      httpStatus: 429,
      code: 21,
      retryAfterSeconds: 12,
    })
  })

  it('rejects more than the documented batch limit before issuing a request', async () => {
    const fetchImpl = vi.fn()
    const ids = Array.from(
      {
        length:
          FFSCOUTER_STATS_MAX_TARGETS + 1,
      },
      (_, index) => index + 1,
    )

    await expect(
      fetchFfScouterStats(
        ids,
        apiKey,
        fetchImpl as typeof fetch,
      ),
    ).rejects.toThrow(
      'FFScouter stats requests require between 1 and 205 unique player IDs.',
    )

    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects a successful non-array response as invalid provider data', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ok: true }),
          { status: 200 },
        ),
    ) as typeof fetch

    await expect(
      fetchFfScouterStats(
        [11],
        apiKey,
        fetchImpl,
      ),
    ).rejects.toMatchObject({
      name: 'FfScouterApiError',
      kind: 'invalid-response',
    })
  })
})
