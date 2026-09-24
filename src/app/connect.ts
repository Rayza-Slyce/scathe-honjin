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

export function isScatheFaction(
  factionName: string,
): boolean {
  return (
    factionName.trim().toUpperCase() ===
    'SCATHE'
  )
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
): Promise<HonjinConnection> {
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

  const factionId =
    keyInfo.info.user.faction_id

  if (
    !Number.isSafeInteger(factionId) ||
    factionId <= 0
  ) {
    throw new HonjinConnectionError(
      'Your Torn account is not currently in a faction.',
      'no-faction',
    )
  }

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
  )

  /*
   * HONJIN is faction-specific. Confirm the faction by
   * its human-readable API name rather than assuming a
   * non-zero faction ID means SCATHE.
   */
  if (!isScatheFaction(user.faction.name)) {
    throw new HonjinConnectionError(
      `HONJIN is for SCATHE members. Torn reports your faction as ${user.faction.name}.`,
      'wrong-faction',
    )
  }

  try {
    await verifyTornReconCapabilities(
      user.id,
      user.name,
      user.faction.name,
      apiKey,
      fetchImpl,
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

  /*
   * Only expose the validated SCATHE member's key to
   * FFScouter after Torn identity/faction validation.
   */
  const ffscouter =
    await resolveFfScouterConnection(
      apiKey,
      fetchImpl,
    )

  /*
   * Persist only after the Torn key, identity, required
   * selections and SCATHE membership have all passed.
   *
   * FFScouter being unavailable does not block HONJIN.
   */
  storeTornApiKey(
    apiKey,
    persistence,
  )

  return {
    user,
    ffscouter,
  }
}
