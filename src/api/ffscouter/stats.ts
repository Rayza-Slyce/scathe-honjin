import type { PlayerId } from '../../types'
import {
  normaliseTornApiKey,
} from '../torn/client'
import type {
  FfScouterStatsRowDto,
} from './contracts'
import {
  FfScouterApiError,
  readFfScouterError,
  readFfScouterJsonBody,
} from './client'

const FFSCOUTER_STATS_URL =
  'https://ffscouter.com/api/v1/get-stats'

export const FFSCOUTER_STATS_MAX_TARGETS = 205
export const FFSCOUTER_STATS_RATE_LIMIT = 120

function normaliseTargetIds(
  playerIds: readonly PlayerId[],
): readonly PlayerId[] {
  const unique = [
    ...new Set(playerIds),
  ]

  if (
    unique.length === 0 ||
    unique.length >
      FFSCOUTER_STATS_MAX_TARGETS
  ) {
    throw new Error(
      `FFScouter stats requests require between 1 and ${FFSCOUTER_STATS_MAX_TARGETS} unique player IDs.`,
    )
  }

  for (const playerId of unique) {
    if (
      !Number.isSafeInteger(playerId) ||
      playerId <= 0
    ) {
      throw new Error(
        'FFScouter target IDs must be positive integers.',
      )
    }
  }

  return unique
}

export async function fetchFfScouterStats(
  playerIds: readonly PlayerId[],
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<readonly FfScouterStatsRowDto[]> {
  const key = normaliseTornApiKey(apiKey)
  const targets = normaliseTargetIds(
    playerIds,
  )
  const url = new URL(
    FFSCOUTER_STATS_URL,
  )

  url.searchParams.set('key', key)
  url.searchParams.set(
    'targets',
    targets.join(','),
  )

  let response: Response

  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
      },
    })
  } catch {
    throw new FfScouterApiError(
      'Could not connect to FFScouter.',
      'network',
    )
  }

  const body = await readFfScouterJsonBody(response)

  if (!response.ok) {
    const details = readFfScouterError(body)

    throw new FfScouterApiError(
      details.error ??
        `FFScouter request failed with HTTP ${response.status}.`,
      'http',
      {
        httpStatus: response.status,
        code: details.code,
        retryAfterSeconds:
          details.retry_after_seconds,
      },
    )
  }

  if (!Array.isArray(body)) {
    throw new FfScouterApiError(
      'FFScouter returned an unexpected stats response.',
      'invalid-response',
      {
        httpStatus: response.status,
      },
    )
  }

  return body as FfScouterStatsRowDto[]
}
