import type {
  PlayerId,
} from '../../types'
import {
  requestTornJson,
} from './client'
import type {
  TornFactionSearchResponseDto,
  TornUserProfileResponseDto,
  TornUserSearchResponseDto,
} from './contracts'

function assertPlayerId(
  playerId: PlayerId,
): void {
  if (
    !Number.isSafeInteger(playerId) ||
    playerId <= 0
  ) {
    throw new Error(
      'A valid player ID is required.',
    )
  }
}

function normaliseSearchQuery(
  query: string,
): string {
  const value = query.trim()

  if (value === '') {
    throw new Error(
      'A search query is required.',
    )
  }

  return value
}

export function fetchUserSearch(
  query: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TornUserSearchResponseDto> {
  const value = normaliseSearchQuery(
    query,
  )

  return requestTornJson<TornUserSearchResponseDto>(
    `user/search?name=${encodeURIComponent(value)}`,
    apiKey,
    fetchImpl,
  )
}

export function fetchFactionSearch(
  query: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TornFactionSearchResponseDto> {
  const value = normaliseSearchQuery(
    query,
  )

  return requestTornJson<TornFactionSearchResponseDto>(
    `faction/search?name=${encodeURIComponent(value)}`,
    apiKey,
    fetchImpl,
  )
}

export function fetchUserProfile(
  playerId: PlayerId,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TornUserProfileResponseDto> {
  assertPlayerId(playerId)

  return requestTornJson<TornUserProfileResponseDto>(
    `user/${playerId}/profile`,
    apiKey,
    fetchImpl,
  )
}
