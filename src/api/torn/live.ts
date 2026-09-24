import type { FactionId } from '../../types'
import { requestTornJson } from './client'
import type {
  TornFactionMembersResponseDto,
  TornFactionWarsResponseDto,
} from './contracts'

function assertFactionId(
  factionId: FactionId,
): void {
  if (
    !Number.isSafeInteger(factionId) ||
    factionId <= 0
  ) {
    throw new Error(
      'A valid faction ID is required.',
    )
  }
}

export function fetchFactionWars(
  factionId: FactionId,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TornFactionWarsResponseDto> {
  assertFactionId(factionId)

  return requestTornJson<TornFactionWarsResponseDto>(
    `faction/${factionId}/wars`,
    apiKey,
    fetchImpl,
  )
}

export function fetchFactionMembers(
  factionId: FactionId,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TornFactionMembersResponseDto> {
  assertFactionId(factionId)

  return requestTornJson<TornFactionMembersResponseDto>(
    `faction/${factionId}/members`,
    apiKey,
    fetchImpl,
  )
}
