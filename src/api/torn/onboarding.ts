import type {
  CurrentUser,
  CurrentUserBattleStat,
  CurrentUserBattleStats,
} from '../../types'
import {
  TornApiError,
  requestTornJson,
} from './client'
import type {
  TornFactionBasicResponseDto,
  TornKeyInfoResponseDto,
  TornUserBasicResponseDto,
  TornUserBattleStatDetailDto,
  TornUserBattlestatsResponseDto,
} from './onboarding-contracts'

export const TORN_CUSTOM_KEY_SELECTIONS = {
  user: [
    'basic',
    'battlestats',
    'property',
    'attacks',
    'hof',
    'profile',
    'search',
  ],
  faction: [
    'wars',
    'chain',
    'members',
    'search',
  ],
} as const

/*
 * /key/info does not necessarily list every route capability
 * available to a custom key. Live HONJIN acceptance on
 * 2026-09-22 observed successful wars/members calls despite
 * those names being absent from info.selections.faction.
 *
 * Only selections reliably represented as explicit grants
 * belong in this preflight check. Other required capabilities
 * are verified by calling their real endpoints.
 */
export const REQUIRED_TORN_EXPLICIT_SELECTIONS = {
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
} as const

export type TornSelectionScope =
  keyof typeof REQUIRED_TORN_EXPLICIT_SELECTIONS

export interface MissingTornSelection {
  scope: TornSelectionScope
  selection: string
}

export function getMissingRequiredTornSelections(
  response: TornKeyInfoResponseDto,
): MissingTornSelection[] {
  const missing: MissingTornSelection[] = []

  for (const scope of [
    'user',
    'faction',
  ] as const) {
    const granted = new Set(
      response.info.selections[scope],
    )

    for (
      const selection of
      REQUIRED_TORN_EXPLICIT_SELECTIONS[scope]
    ) {
      if (!granted.has(selection)) {
        missing.push({
          scope,
          selection,
        })
      }
    }
  }

  return missing
}


function normaliseBattleStatDetail(
  detail: TornUserBattleStatDetailDto | undefined,
): CurrentUserBattleStat | null {
  if (
    !detail ||
    !Number.isFinite(detail.value) ||
    detail.value < 0 ||
    !Number.isFinite(detail.modifier) ||
    !Array.isArray(detail.modifiers)
  ) {
    return null
  }

  return {
    value: detail.value,
    modifier: detail.modifier,
    modifiers: detail.modifiers
      .filter((modifier) =>
        typeof modifier.effect === 'string' &&
        typeof modifier.type === 'string' &&
        Number.isFinite(modifier.value),
      )
      .map((modifier) => ({
        effect: modifier.effect,
        type: modifier.type,
        value: modifier.value,
      })),
  }
}

export function normaliseCurrentUserBattleStats(
  response: TornUserBattlestatsResponseDto,
  observedAt: number,
): CurrentUserBattleStats | null {
  if (
    !Number.isFinite(observedAt) ||
    observedAt < 0 ||
    !Number.isFinite(response.battlestats.total) ||
    response.battlestats.total < 0
  ) {
    return null
  }

  const strength = normaliseBattleStatDetail(
    response.battlestats.strength,
  )
  const defense = normaliseBattleStatDetail(
    response.battlestats.defense,
  )
  const speed = normaliseBattleStatDetail(
    response.battlestats.speed,
  )
  const dexterity = normaliseBattleStatDetail(
    response.battlestats.dexterity,
  )

  if (!strength || !defense || !speed || !dexterity) {
    return null
  }

  return {
    total: response.battlestats.total,
    strength,
    defense,
    speed,
    dexterity,
    observedAt,
  }
}

export function normaliseCurrentUser(
  keyInfo: TornKeyInfoResponseDto,
  basic: TornUserBasicResponseDto,
  battlestats: TornUserBattlestatsResponseDto,
  faction: TornFactionBasicResponseDto,
  battlestatsObservedAt: number | null = null,
): CurrentUser {
  if (
    keyInfo.info.user.id !== basic.profile.id
  ) {
    throw new Error(
      'Torn identity responses did not match.',
    )
  }

  if (
    keyInfo.info.user.faction_id !==
    faction.basic.id
  ) {
    throw new Error(
      'Torn faction responses did not match.',
    )
  }

  const battleStatsCurrent =
    battlestatsObservedAt === null
      ? null
      : normaliseCurrentUserBattleStats(
          battlestats,
          battlestatsObservedAt,
        )

  return {
    id: keyInfo.info.user.id,
    name: basic.profile.name,
    faction: {
      id: faction.basic.id,
      name: faction.basic.name,
    },
    battleStatsTotal: battlestats.battlestats.total,
    ...(battleStatsCurrent
      ? { battleStatsCurrent }
      : {}),
  }
}

export function fetchTornKeyInfo(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TornKeyInfoResponseDto> {
  return requestTornJson<TornKeyInfoResponseDto>(
    'key/info',
    apiKey,
    fetchImpl,
  )
}

export function fetchTornUserBasic(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TornUserBasicResponseDto> {
  return requestTornJson<TornUserBasicResponseDto>(
    'user/basic',
    apiKey,
    fetchImpl,
  )
}

export function fetchTornUserBattlestats(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TornUserBattlestatsResponseDto> {
  return requestTornJson<TornUserBattlestatsResponseDto>(
    'user/battlestats',
    apiKey,
    fetchImpl,
  )
}

export function fetchTornFactionBasic(
  factionId: number,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TornFactionBasicResponseDto> {
  if (
    !Number.isSafeInteger(factionId) ||
    factionId <= 0
  ) {
    throw new Error(
      'A valid faction ID is required.',
    )
  }

  return requestTornJson<TornFactionBasicResponseDto>(
    `faction/${factionId}/basic`,
    apiKey,
    fetchImpl,
  )
}

export type TornCapabilityScope =
  | 'user'
  | 'faction'

export type TornCapabilitySelection =
  | 'wars'
  | 'members'
  | 'profile'
  | 'search'

export class TornCapabilityError extends Error {
  readonly scope: TornCapabilityScope
  readonly selection: TornCapabilitySelection

  constructor(
    scope: TornCapabilityScope,
    selection: TornCapabilitySelection,
  ) {
    super(
      `Torn key cannot access ${scope} ${selection}.`,
    )
    this.name = 'TornCapabilityError'
    this.scope = scope
    this.selection = selection
  }
}

export async function verifyTornFactionCapabilities(
  factionId: number,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const capabilities = [
    'wars',
    'members',
  ] as const

  await Promise.all(
    capabilities.map(async (selection) => {
      try {
        await requestTornJson<unknown>(
          `faction/${factionId}/${selection}`,
          apiKey,
          fetchImpl,
        )
      } catch (error) {
        if (
          error instanceof TornApiError &&
          error.kind === 'permission'
        ) {
          throw new TornCapabilityError(
            'faction',
            selection,
          )
        }

        throw error
      }
    }),
  )
}

export async function verifyTornReconCapabilities(
  userId: number,
  userName: string,
  factionName: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const capabilities = [
    {
      scope: 'user',
      selection: 'search',
      endpoint:
        `user/search?name=${encodeURIComponent(userName)}`,
    },
    {
      scope: 'user',
      selection: 'profile',
      endpoint: `user/${userId}/profile`,
    },
    {
      scope: 'faction',
      selection: 'search',
      endpoint:
        `faction/search?name=${encodeURIComponent(factionName)}`,
    },
  ] as const

  for (const capability of capabilities) {
    try {
      await requestTornJson<unknown>(
        capability.endpoint,
        apiKey,
        fetchImpl,
      )
    } catch (error) {
      if (
        error instanceof TornApiError &&
        error.kind === 'permission'
      ) {
        throw new TornCapabilityError(
          capability.scope,
          capability.selection,
        )
      }

      throw error
    }
  }
}
