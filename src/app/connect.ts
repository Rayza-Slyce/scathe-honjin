import {
  checkFfScouterRegistration,
} from '../api/ffscouter/onboarding'
import {
  fetchTornFactionBasic,
  fetchTornKeyInfo,
  fetchTornUserBasic,
  fetchTornUserBattlestats,
  getMissingRequiredTornSelections,
  normaliseCurrentUser,
  TornCapabilityError,
  verifyTornFactionCapabilities,
  verifyTornReconCapabilities,
} from '../api/torn/onboarding'
import { normaliseTornUserProfile } from '../api/torn/normalise'
import type { TornUserProfileResponseDto } from '../api/torn/contracts'
import { fetchUserProfile } from '../api/torn/recon'
import { TornApiError } from '../api/torn/client'
import { assertScatheProfile, SCATHE_FACTION_ID } from './membership'
import type {
  MissingTornSelection,
} from '../api/torn/onboarding'
import {
  storeTornApiKey,
} from '../security/api-key-storage'
import type {
  TornApiKeyPersistence,
} from '../security/api-key-storage'
import type {
  CurrentUser,
} from '../types'

export type FfScouterConnection =
  | {
      status: 'registered'
    }
  | {
      status: 'registration-required'
    }
  | {
      status: 'policy-update-required'
    }
  | {
      status: 'unavailable'
      message: string
    }

export interface HonjinConnection {
  user: CurrentUser
  ffscouter: FfScouterConnection
}

export interface VerifiedHonjinConnection extends HonjinConnection {
  membershipVerifiedAt: number
}

export type HonjinConnectionErrorKind =
  | 'missing-selections'
  | 'no-faction'
  | 'wrong-faction'

export class HonjinConnectionError extends Error {
  readonly kind: HonjinConnectionErrorKind
  readonly missingSelections:
    readonly MissingTornSelection[]

  constructor(
    message: string,
    kind: HonjinConnectionErrorKind,
    missingSelections:
      readonly MissingTornSelection[] = [],
  ) {
    super(message)
    this.name = 'HonjinConnectionError'
    this.kind = kind
    this.missingSelections =
      missingSelections
  }
}

async function resolveFfScouterConnection(
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<FfScouterConnection> {
  try {
    const status =
      await checkFfScouterRegistration(
        apiKey,
        fetchImpl,
      )

    if (status.policyUpdateRequired) {
      return {
        status: 'policy-update-required',
      }
    }

    if (!status.registered) {
      return {
        status: 'registration-required',
      }
    }

    return {
      status: 'registered',
    }
  } catch (error) {
    return {
      status: 'unavailable',
      message:
        error instanceof Error
          ? error.message
          : 'FFScouter is unavailable.',
    }
  }
}

export async function connectHonjin(
  apiKey: string,
  persistence: TornApiKeyPersistence,
  fetchImpl: typeof fetch = fetch,
  options: { signal?: AbortSignal; persist?: boolean } = {},
): Promise<VerifiedHonjinConnection> {
  /*
   * Validate the key and its exact selections before making
   * any dependent Torn or FFScouter calls.
   */
  const keyInfo = await fetchTornKeyInfo(
    apiKey,
    fetchImpl,
  )

  const missingSelections =
    getMissingRequiredTornSelections(
      keyInfo,
    )

  if (missingSelections.length > 0) {
    throw new HonjinConnectionError(
      'This Torn key is missing required selections.',
      'missing-selections',
      missingSelections,
    )
  }

  const playerId = keyInfo.info.user.id
  if (!Number.isSafeInteger(playerId) || playerId <= 0) {
    throw new Error('Torn returned an invalid connected player identity.')
  }

  // The already-required own profile is authoritative membership evidence.
  // key/info faction_id can be absent without faction AA permissions.
  let ownProfile: TornUserProfileResponseDto
  try {
    ownProfile = await fetchUserProfile(playerId, apiKey, fetchImpl)
  } catch (error) {
    if (error instanceof TornApiError && error.kind === 'permission') {
      throw new HonjinConnectionError('This Torn key cannot access required user selection: profile.', 'missing-selections', [{ scope: 'user', selection: 'profile' }])
    }
    throw error
  }
  assertScatheProfile(ownProfile, playerId)
  const membershipVerifiedAt = Date.now()
  const factionId = SCATHE_FACTION_ID

  try {
    await verifyTornFactionCapabilities(
      factionId,
      apiKey,
      fetchImpl,
    )
  } catch (error) {
    if (
      error instanceof TornCapabilityError
    ) {
      throw new HonjinConnectionError(
        `This Torn key cannot access required faction selection: ${error.selection}.`,
        'missing-selections',
        [
          {
            scope: error.scope,
            selection: error.selection,
          },
        ],
      )
    }

    throw error
  }

  const [
    basic,
    battlestats,
    faction,
  ] = await Promise.all([
    fetchTornUserBasic(
      apiKey,
      fetchImpl,
    ),
    fetchTornUserBattlestats(
      apiKey,
      fetchImpl,
    ),
    fetchTornFactionBasic(
      factionId,
      apiKey,
      fetchImpl,
    ),
  ])

  const user = normaliseCurrentUser(
    keyInfo,
    basic,
    battlestats,
    faction,
    Math.floor(Date.now() / 1000),
    factionId,
  )

  try {
    ownProfile = await verifyTornReconCapabilities(
      user.id,
      user.name,
      user.faction.name,
      apiKey,
      fetchImpl,
      ownProfile,
    )
  } catch (error) {
    if (
      error instanceof TornCapabilityError
    ) {
      throw new HonjinConnectionError(
        `This Torn key cannot access required ${error.scope} selection: ${error.selection}.`,
        'missing-selections',
        [
          {
            scope: error.scope,
            selection: error.selection,
          },
        ],
      )
    }

    throw error
  }

  const ownProfileSnapshot = normaliseTornUserProfile(
    ownProfile,
    Math.floor(Date.now() / 1000),
  )

  if (ownProfileSnapshot.player.id !== user.id) {
    throw new Error('Torn profile response did not match the connected user.')
  }

  const connectedUser: CurrentUser = ownProfileSnapshot.health
    ? { ...user, life: ownProfileSnapshot.health }
    : user

  /*
   * Only expose the validated SCATHE member's key to
   * FFScouter after Torn identity/faction validation.
   */
  const ffscouter =
    await resolveFfScouterConnection(
      apiKey,
      fetchImpl,
    )

  options.signal?.throwIfAborted()

  /*
   * Persist only after the Torn key, identity, required
   * selections and SCATHE membership have all passed.
   *
   * FFScouter being unavailable does not block HONJIN.
   */
  if (options.persist !== false) storeTornApiKey(apiKey, persistence)

  return {
    user: connectedUser,
    ffscouter,
    membershipVerifiedAt,
  }
}
