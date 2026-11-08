import { TornApiError } from '../api/torn/client'
import type { TornUserProfileResponseDto } from '../api/torn/contracts'

export const SCATHE_FACTION_ID = 48572
export const MEMBERSHIP_VALID_MS = 15 * 60_000
export const MEMBERSHIP_MESSAGE = 'HONJIN is available only to current SCATHE members (faction 48572). Reconnect after joining SCATHE.'

export class MembershipDeniedError extends Error {
  readonly playerId?: number
  constructor(playerId?: number) { super(MEMBERSHIP_MESSAGE); this.name = 'MembershipDeniedError'; this.playerId = playerId }
}

export function assertScatheProfile(response: TornUserProfileResponseDto, expectedPlayerId: number): void {
  const profile = response?.profile
  if (!profile || !Number.isSafeInteger(expectedPlayerId) || expectedPlayerId <= 0 || profile.id !== expectedPlayerId
    || (profile.faction_id !== null && (!Number.isSafeInteger(profile.faction_id) || profile.faction_id < 0))) {
    throw new Error('Torn did not return valid current identity and membership evidence. Please retry.')
  }
  if (profile.faction_id !== SCATHE_FACTION_ID) throw new MembershipDeniedError(expectedPlayerId)
}

export function isInvalidTornKey(error: unknown): boolean {
  // Error 13 is temporary inactivity, 18 is paused, 5 is rate limiting.
  // Only the authoritative incorrect-key response discards a retained key.
  return error instanceof TornApiError && (error.kind === 'invalid-key' || error.code === 2)
}
