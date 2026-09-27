import {
  normaliseFfScouterBattleIntel,
} from '../api/ffscouter/normalise'
import {
  fetchFfScouterStats,
  FFSCOUTER_STATS_MAX_TARGETS,
  FFSCOUTER_STATS_RATE_LIMIT,
} from '../api/ffscouter/stats'
import {
  fetchFactionMembers,
  fetchFactionWars,
} from '../api/torn/live'
import {
  fetchFactionSearch,
  fetchUserProfile,
  fetchUserProperty,
  fetchUserSearch,
} from '../api/torn/recon'
import {
  fetchTornFactionBasic,
  fetchTornUserBattlestats,
  normaliseCurrentUserBattleStats,
} from '../api/torn/onboarding'
import {
  normaliseTornFactionRoster,
  normaliseTornFactionSearchResult,
  normaliseTornRankedWar,
  normaliseTornUserProfile,
  normaliseTornUserPropertyTravelEvidence,
  normaliseTornUserSearchResult,
} from '../api/torn/normalise'
import type {
  BattleIntel,
  BattleIntelSnapshot,
  CurrentUserBattleStats,
  FactionId,
  FactionIdentity,
  FactionRosterSnapshot,
  FactionSearchMatch,
  PlayerId,
  PlayerReconSnapshot,
  PlayerSearchMatch,
  TravelPropertyEvidence,
  WarBoardSnapshot,
  WarState,
} from '../types'
import {
  RequestCoordinator,
  type RequestCoordinatorOptions,
  type RequestPriority,
} from './request-coordinator'

const DEFAULT_ACTIVE_WAR_CACHE_MS = 15_000
const DEFAULT_FFSCOUTER_CACHE_MS = 60_000
const DEFAULT_SEARCH_CACHE_MS = 30_000
const DEFAULT_PROPERTY_EVIDENCE_CACHE_MS = 300_000
const DEFAULT_CURRENT_USER_BATTLE_STATS_CACHE_MS = 15_000
const FFSCOUTER_BUDGET = 'ffscouter'

export interface HonjinRuntime {
  loadCurrentWar(
    ownFactionId: FactionId,
  ): Promise<WarState | null>
  loadWarBoardSnapshot(
    ownFactionId: FactionId,
  ): Promise<WarBoardSnapshot>
  loadFactionRoster(
    factionId: FactionId,
    priority?: RequestPriority,
  ): Promise<FactionRosterSnapshot>
  loadFactionIdentity(
    factionId: FactionId,
    priority?: RequestPriority,
  ): Promise<FactionIdentity>
  searchPlayers(
    query: string,
  ): Promise<readonly PlayerSearchMatch[]>
  searchFactions(
    query: string,
  ): Promise<readonly FactionSearchMatch[]>
  loadTravelPropertyEvidence(
    playerId: PlayerId,
    priority?: RequestPriority,
  ): Promise<TravelPropertyEvidence>
  loadPlayerRecon(
    playerId: PlayerId,
    priority?: RequestPriority,
  ): Promise<PlayerReconSnapshot>
  loadBattleIntel(
    callerPlayerId: PlayerId,
    playerIds: readonly PlayerId[],
    priority?: RequestPriority,
  ): Promise<BattleIntelSnapshot>
  loadCurrentUserBattleStats(
    priority?: RequestPriority,
  ): Promise<CurrentUserBattleStats>
  clearCache(): void
}

export interface HonjinRuntimeOptions {
  fetchImpl?: typeof fetch
  now?: () => number
  activeWarCacheMs?: number
  ffscouterCacheMs?: number
  propertyEvidenceCacheMs?: number
  currentUserBattleStatsCacheMs?: number
  coordinator?: RequestCoordinator
  coordinatorOptions?: RequestCoordinatorOptions
}

interface BattleIntelBatch {
  intel: readonly BattleIntel[]
  observedAt: number
}

interface BattleIntelObservation {
  intel: BattleIntel
  observedAt: number
}

interface BattleIntelCacheEntry extends BattleIntelObservation {
  expiresAt: number
}

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

function normalisePlayerIds(
  playerIds: readonly PlayerId[],
): readonly PlayerId[] {
  for (const playerId of playerIds) {
    assertPlayerId(playerId)
  }

  return [
    ...new Set(playerIds),
  ].sort((left, right) => left - right)
}

function chunkPlayerIds(
  playerIds: readonly PlayerId[],
): readonly (readonly PlayerId[])[] {
  const chunks: PlayerId[][] = []

  for (
    let index = 0;
    index < playerIds.length;
    index += FFSCOUTER_STATS_MAX_TARGETS
  ) {
    chunks.push(
      playerIds.slice(
        index,
        index +
          FFSCOUTER_STATS_MAX_TARGETS,
      ),
    )
  }

  return chunks
}

function unavailableIntel(
  playerId: PlayerId,
): BattleIntel {
  return {
    playerId,
    estimatedBattleStats: null,
    publicBss: null,
    fairFight: null,
    updatedAt: null,
    source: 'unavailable',
  }
}

export function createHonjinRuntime(
  apiKey: string,
  options: HonjinRuntimeOptions = {},
): HonjinRuntime {
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? Date.now
  const activeWarCacheMs =
    options.activeWarCacheMs ??
    DEFAULT_ACTIVE_WAR_CACHE_MS
  const propertyEvidenceCacheMs =
    options.propertyEvidenceCacheMs ??
    DEFAULT_PROPERTY_EVIDENCE_CACHE_MS
  const ffscouterCacheMs =
    options.ffscouterCacheMs ??
    DEFAULT_FFSCOUTER_CACHE_MS
  const currentUserBattleStatsCacheMs =
    options.currentUserBattleStatsCacheMs ??
    DEFAULT_CURRENT_USER_BATTLE_STATS_CACHE_MS
  const coordinator =
    options.coordinator ??
    new RequestCoordinator({
      ...options.coordinatorOptions,
      budgets: {
        [FFSCOUTER_BUDGET]: {
          maxRequestsPerMinute:
            FFSCOUTER_STATS_RATE_LIMIT,
        },
        ...options.coordinatorOptions
          ?.budgets,
      },
      now,
    })

  const observedAt = () =>
    Math.floor(now() / 1000)
  const battleIntelCache = new Map<
    string,
    BattleIntelCacheEntry
  >()
  const battleIntelInFlight = new Map<
    string,
    Promise<BattleIntelObservation>
  >()

  const battleIntelKey = (
    callerPlayerId: PlayerId,
    playerId: PlayerId,
  ) =>
    `${callerPlayerId}:${playerId}`

  const readCachedBattleIntel = (
    callerPlayerId: PlayerId,
    playerId: PlayerId,
  ): BattleIntelObservation | null => {
    const key = battleIntelKey(
      callerPlayerId,
      playerId,
    )
    const cached =
      battleIntelCache.get(key)

    if (!cached) {
      return null
    }

    if (cached.expiresAt <= now()) {
      battleIntelCache.delete(key)
      return null
    }

    return {
      intel: cached.intel,
      observedAt: cached.observedAt,
    }
  }

  const scheduleBattleIntelBatch = (
    callerPlayerId: PlayerId,
    batch: readonly PlayerId[],
    priority: RequestPriority,
  ): void => {
    const batchPromise =
      coordinator.request(
        {
          key:
            `ffscouter:${callerPlayerId}:stats:${batch.join(',')}`,
          priority,
          budget: FFSCOUTER_BUDGET,
        },
        async (): Promise<BattleIntelBatch> => {
          const rows =
            await fetchFfScouterStats(
              batch,
              apiKey,
              fetchImpl,
            )
          const requested = new Set(
            batch,
          )
          const byPlayerId = new Map<
            PlayerId,
            BattleIntel
          >()

          for (const row of rows) {
            if (
              !requested.has(
                row.player_id,
              )
            ) {
              continue
            }

            byPlayerId.set(
              row.player_id,
              normaliseFfScouterBattleIntel(
                row,
              ),
            )
          }

          return {
            intel: batch.map(
              (playerId) =>
                byPlayerId.get(
                  playerId,
                ) ??
                unavailableIntel(
                  playerId,
                ),
            ),
            observedAt: observedAt(),
          }
        },
      )

    for (const playerId of batch) {
      const key = battleIntelKey(
        callerPlayerId,
        playerId,
      )
      const playerPromise = batchPromise
        .then((result) => {
          const intel = result.intel.find(
            (item) =>
              item.playerId === playerId,
          ) ?? unavailableIntel(playerId)
          const observation = {
            intel,
            observedAt: result.observedAt,
          }

          if (ffscouterCacheMs > 0) {
            battleIntelCache.set(key, {
              ...observation,
              expiresAt:
                now() + ffscouterCacheMs,
            })
          }

          return observation
        })
        .finally(() => {
          if (
            battleIntelInFlight.get(
              key,
            ) === playerPromise
          ) {
            battleIntelInFlight.delete(
              key,
            )
          }
        })

      battleIntelInFlight.set(
        key,
        playerPromise,
      )
    }
  }

  const loadCurrentWar = async (
    ownFactionId: FactionId,
  ): Promise<WarState | null> =>
    coordinator.request(
      {
        key:
          `torn:faction:${ownFactionId}:wars`,
        priority: 'active-war',
        cacheMs: activeWarCacheMs,
      },
      async () => {
        const response = await fetchFactionWars(
          ownFactionId,
          apiKey,
          fetchImpl,
        )

        return normaliseTornRankedWar(
          ownFactionId,
          response,
          observedAt(),
        )
      },
    )

  const loadFactionRoster = async (
    factionId: FactionId,
    priority: RequestPriority =
      'active-war',
  ): Promise<FactionRosterSnapshot> =>
    coordinator.request(
      {
        key:
          `torn:faction:${factionId}:members`,
        priority,
        cacheMs: activeWarCacheMs,
      },
      async () => {
        const response =
          await fetchFactionMembers(
            factionId,
            apiKey,
            fetchImpl,
          )

        return normaliseTornFactionRoster(
          factionId,
          response,
          observedAt(),
        )
      },
    )

  const loadFactionIdentity = async (
    factionId: FactionId,
    priority: RequestPriority =
      'visible-spy',
  ): Promise<FactionIdentity> =>
    coordinator.request(
      {
        key:
          `torn:faction:${factionId}:basic`,
        priority,
        cacheMs: activeWarCacheMs,
      },
      async () => {
        const response =
          await fetchTornFactionBasic(
            factionId,
            apiKey,
            fetchImpl,
          )

        return {
          id: response.basic.id,
          name: response.basic.name,
        }
      },
    )

  const searchPlayers = async (
    query: string,
  ): Promise<
    readonly PlayerSearchMatch[]
  > => {
    const value = query.trim()

    return coordinator.request(
      {
        key:
          `torn:user:search:${value.toLowerCase()}`,
        priority: 'explicit',
        cacheMs: DEFAULT_SEARCH_CACHE_MS,
      },
      async () => {
        const response =
          await fetchUserSearch(
            value,
            apiKey,
            fetchImpl,
          )

        return response.search.map(
          normaliseTornUserSearchResult,
        )
      },
    )
  }

  const searchFactions = async (
    query: string,
  ): Promise<
    readonly FactionSearchMatch[]
  > => {
    const value = query.trim()

    return coordinator.request(
      {
        key:
          `torn:faction:search:${value.toLowerCase()}`,
        priority: 'explicit',
        cacheMs: DEFAULT_SEARCH_CACHE_MS,
      },
      async () => {
        const response =
          await fetchFactionSearch(
            value,
            apiKey,
            fetchImpl,
          )

        return response.search.map(
          normaliseTornFactionSearchResult,
        )
      },
    )
  }

  const loadTravelPropertyEvidence = async (
    playerId: PlayerId,
    priority: RequestPriority = 'optional',
  ): Promise<TravelPropertyEvidence> => {
    assertPlayerId(playerId)

    return coordinator.request(
      {
        key: `torn:user:${playerId}:property`,
        priority,
        cacheMs: propertyEvidenceCacheMs,
      },
      async () => {
        const response = await fetchUserProperty(
          playerId,
          apiKey,
          fetchImpl,
        )

        return normaliseTornUserPropertyTravelEvidence(
          playerId,
          response,
          observedAt(),
        )
      },
    )
  }

  const loadPlayerRecon = async (
    playerId: PlayerId,
    priority: RequestPriority =
      'visible-spy',
  ): Promise<PlayerReconSnapshot> => {
    assertPlayerId(playerId)

    return coordinator.request(
      {
        key:
          `torn:user:${playerId}:profile`,
        priority,
        cacheMs: activeWarCacheMs,
      },
      async () => {
        const response =
          await fetchUserProfile(
            playerId,
            apiKey,
            fetchImpl,
          )
        const seenAt = observedAt()

        return normaliseTornUserProfile(
          response,
          seenAt,
        )
      },
    )
  }

  const loadCurrentUserBattleStats = async (
    priority: RequestPriority = 'optional',
  ): Promise<CurrentUserBattleStats> =>
    coordinator.request(
      {
        key: 'torn:user:battlestats',
        priority,
        cacheMs: currentUserBattleStatsCacheMs,
      },
      async () => {
        const response =
          await fetchTornUserBattlestats(
            apiKey,
            fetchImpl,
          )
        const stats = normaliseCurrentUserBattleStats(
          response,
          observedAt(),
        )

        if (!stats) {
          throw new Error(
            'Torn returned unusable current-user battle stats.',
          )
        }

        return stats
      },
    )

  const loadBattleIntel = async (
    callerPlayerId: PlayerId,
    playerIds: readonly PlayerId[],
    priority: RequestPriority =
      'visible-spy',
  ): Promise<BattleIntelSnapshot> => {
    assertPlayerId(callerPlayerId)

    const targets = normalisePlayerIds(
      playerIds,
    )

    if (targets.length === 0) {
      return {
        callerPlayerId,
        intel: [],
        observedAt: observedAt(),
      }
    }

    const observations = new Map<
      PlayerId,
      Promise<BattleIntelObservation>
    >()
    const missing: PlayerId[] = []

    for (const playerId of targets) {
      const cached = readCachedBattleIntel(
        callerPlayerId,
        playerId,
      )

      if (cached) {
        observations.set(
          playerId,
          Promise.resolve(cached),
        )
        continue
      }

      const existing =
        battleIntelInFlight.get(
          battleIntelKey(
            callerPlayerId,
            playerId,
          ),
        )

      if (existing) {
        observations.set(
          playerId,
          existing,
        )
        continue
      }

      missing.push(playerId)
    }

    for (const batch of chunkPlayerIds(missing)) {
      scheduleBattleIntelBatch(
        callerPlayerId,
        batch,
        priority,
      )

      for (const playerId of batch) {
        const pending =
          battleIntelInFlight.get(
            battleIntelKey(
              callerPlayerId,
              playerId,
            ),
          )

        if (!pending) {
          throw new Error(
            'FFScouter batch scheduling failed to create player work.',
          )
        }

        observations.set(
          playerId,
          pending,
        )
      }
    }

    const resolved = await Promise.all(
      targets.map(async (playerId) => {
        const pending =
          observations.get(playerId)

        if (!pending) {
          throw new Error(
            'FFScouter player work is missing.',
          )
        }

        return pending
      }),
    )

    return {
      callerPlayerId,
      intel: resolved.map(
        (item) => item.intel,
      ),
      observedAt: Math.min(
        ...resolved.map(
          (item) => item.observedAt,
        ),
      ),
    }
  }

  return {
    loadCurrentWar,

    async loadWarBoardSnapshot(
      ownFactionId: FactionId,
    ): Promise<WarBoardSnapshot> {
      const war = await loadCurrentWar(
        ownFactionId,
      )

      if (war === null) {
        return {
          war: null,
          enemyRoster: null,
        }
      }

      const enemyRoster =
        await loadFactionRoster(
          war.enemyFaction.id,
          'active-war',
        )

      return {
        war,
        enemyRoster,
      }
    },

    loadFactionRoster,
    loadFactionIdentity,
    searchPlayers,
    searchFactions,
    loadTravelPropertyEvidence,
    loadPlayerRecon,
    loadBattleIntel,
    loadCurrentUserBattleStats,

    clearCache(): void {
      coordinator.clearCache()
      battleIntelCache.clear()
    },
  }
}
