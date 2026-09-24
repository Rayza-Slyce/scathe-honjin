import {
  fetchFactionMembers,
  fetchFactionWars,
} from '../api/torn/live'
import {
  normaliseTornFactionRoster,
  normaliseTornRankedWar,
} from '../api/torn/normalise'
import type {
  FactionId,
  FactionRosterSnapshot,
  WarBoardSnapshot,
  WarState,
} from '../types'
import {
  RequestCoordinator,
  type RequestCoordinatorOptions,
  type RequestPriority,
} from './request-coordinator'

const DEFAULT_ACTIVE_WAR_CACHE_MS = 15_000

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
  clearCache(): void
}

export interface HonjinRuntimeOptions {
  fetchImpl?: typeof fetch
  now?: () => number
  activeWarCacheMs?: number
  coordinator?: RequestCoordinator
  coordinatorOptions?: RequestCoordinatorOptions
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
  const coordinator =
    options.coordinator ??
    new RequestCoordinator({
      ...options.coordinatorOptions,
      now,
    })

  const observedAt = () =>
    Math.floor(now() / 1000)

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

    clearCache(): void {
      coordinator.clearCache()
    },
  }
}
