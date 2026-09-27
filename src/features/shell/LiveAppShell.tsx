import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  HonjinConnection,
} from '../../app/connect'
import type {
  HonjinRuntime,
} from '../../app/runtime'
import type {
  RequestPriority,
} from '../../app/request-coordinator'
import type {
  BattleIntelSnapshot,
  FactionSearchMatch,
  PlayerReconSnapshot,
  PlayerSearchMatch,
} from '../../types'
import type {
  LiveWarEvidencePolicy,
} from '../../recommendations/live'
import {
  createIndexedDbSpyRoomIdentityStore,
  EMPTY_SPY_ROOM_IDENTITY_STATE,
} from '../../storage/spy-room-identity'
import type {
  SpyRoomIdentityState,
  SpyRoomIdentityStore,
} from '../../storage/spy-room-identity'
import {
  createIndexedDbHospitalWatchStore,
  EMPTY_HOSPITAL_WATCH_STATE,
} from '../../storage/hospital-watch'
import type {
  HospitalWatchState,
  HospitalWatchStore,
} from '../../storage/hospital-watch'
import {
  buildFactionSpyTargets,
  buildIndividualSpyTarget,
  createEmptySpyRoomView,
  expireSpyRoomStatus,
  restoreSpyRoomIdentities,
} from '../targets/live-spy'
import type {
  SpyRoomView,
  SpyTargetView,
  SpyWorkspace,
} from '../targets/live-spy'
import {
  buildWarBoardView,
  createErrorWarBoardView,
  createLoadingWarBoardView,
  markWarBoardViewStale,
} from '../war/live-view'
import type {
  WarBoardView,
} from '../war/live-view'
import {
  buildHospitalView,
} from '../hospital/live-hospital'
import { buildTravelView } from '../travel/live-travel'
import { refreshLiveTravelWorkspace, type LiveTravelWorkspace } from '../travel/workspace'
import { createIndexedDbTravelObservationStore } from '../../storage/travel-observation'
import type { TravelObservationStore } from '../../storage/travel-observation'
import { buildTeamView, EMPTY_TEAM_VIEW, type TeamView } from '../team/live-team'
import AppShell from './AppShell'
import type { AppScreen } from './AppShell'

const DEFAULT_ACTIVE_WAR_REFRESH_MS = 15_000
const MAX_INDIVIDUAL_RECON_TARGETS = 10

const DEFAULT_LIVE_WAR_EVIDENCE_POLICY:
  LiveWarEvidencePolicy = {
    statusMaxAgeSeconds: 30,
  }

interface LiveAppShellProps {
  connection: HonjinConnection
  runtime: HonjinRuntime
  onDisconnect: () => void
  evidencePolicy?: LiveWarEvidencePolicy
  refreshIntervalMs?: number
  now?: () => number
  spyIdentityStore?: SpyRoomIdentityStore
  hospitalWatchStore?: HospitalWatchStore
  travelObservationStore?: TravelObservationStore
}

interface IndividualRefreshResult {
  targets: readonly SpyTargetView[]
  message: string | null
}

function describeLiveError(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'Live data is unavailable.'
}

function emptyIntelSnapshot(
  callerPlayerId: number,
  observedAt: number,
): BattleIntelSnapshot {
  return {
    callerPlayerId,
    intel: [],
    observedAt,
  }
}

function uniquePlayerIds(
  playerIds: readonly number[],
): readonly number[] {
  return [
    ...new Set(
      playerIds.filter(
        (playerId) =>
          Number.isSafeInteger(playerId) &&
          playerId > 0,
      ),
    ),
  ].slice(0, MAX_INDIVIDUAL_RECON_TARGETS)
}

export default function LiveAppShell({
  connection,
  runtime,
  onDisconnect,
  evidencePolicy =
    DEFAULT_LIVE_WAR_EVIDENCE_POLICY,
  refreshIntervalMs =
    DEFAULT_ACTIVE_WAR_REFRESH_MS,
  now = Date.now,
  spyIdentityStore,
  hospitalWatchStore,
  travelObservationStore,
}: LiveAppShellProps) {
  const identityStore = useMemo(
    () =>
      spyIdentityStore ??
      createIndexedDbSpyRoomIdentityStore(),
    [spyIdentityStore],
  )
  const watchStore = useMemo(
    () =>
      hospitalWatchStore ??
      createIndexedDbHospitalWatchStore(),
    [hospitalWatchStore],
  )
  const travelStore = useMemo(
    () => travelObservationStore ?? createIndexedDbTravelObservationStore(),
    [travelObservationStore],
  )
  const [travelWorkspace, setTravelWorkspace] = useState<LiveTravelWorkspace | null>(null)
  const [teamView, setTeamView] = useState<TeamView>(EMPTY_TEAM_VIEW)
  const [travelIncludeNonWar, setTravelIncludeNonWar] = useState(false)
  const [warBoard, setWarBoard] =
    useState<WarBoardView>(
      createLoadingWarBoardView,
    )
  const [spyRoom, setSpyRoom] =
    useState<SpyRoomView>(
      createEmptySpyRoomView,
    )
  const spyIdentitiesRef =
    useRef<SpyRoomIdentityState>(
      EMPTY_SPY_ROOM_IDENTITY_STATE,
    )
  const spyIdentityMutationVersion =
    useRef(0)
  const [spyIdentitiesReady, setSpyIdentitiesReady] =
    useState(false)
  const [visibleSpyWorkspace, setVisibleSpyWorkspace] =
    useState<SpyWorkspace | null>(null)
  const [visibleScreen, setVisibleScreen] =
    useState<AppScreen>('war')
  const [hospitalNow, setHospitalNow] =
    useState(() => Math.floor(now() / 1000))
  const hospitalWatchRef =
    useRef<HospitalWatchState>(
      EMPTY_HOSPITAL_WATCH_STATE,
    )
  const hospitalWatchMutationVersion = useRef(0)
  const [hospitalWatchedIds, setHospitalWatchedIds] =
    useState<readonly number[]>([])
  const [hospitalMessage, setHospitalMessage] =
    useState<string | null>(null)
  const [pageVisible, setPageVisible] =
    useState(
      () =>
        typeof document === 'undefined' ||
        document.visibilityState !== 'hidden',
    )
  const persistSpyIdentities = useCallback(
    (next: SpyRoomIdentityState) => {
      spyIdentityMutationVersion.current += 1
      spyIdentitiesRef.current = next
      void identityStore
        .save(connection.user.id, next)
        .catch((error) => {
          setSpyRoom((current) => ({
            ...current,
            individualMessage:
              `Local Spy Room persistence unavailable: ${describeLiveError(
                error,
              )}`,
          }))
        })
    },
    [connection.user.id, identityStore],
  )


  useEffect(() => {
    let active = true
    const startingMutationVersion =
      spyIdentityMutationVersion.current
    void identityStore
      .load(connection.user.id)
      .then((identities) => {
        if (!active) {
          return
        }

        if (
          spyIdentityMutationVersion.current !==
          startingMutationVersion
        ) {
          setSpyIdentitiesReady(true)
          return
        }

        spyIdentitiesRef.current = identities
        setSpyRoom((current) =>
          restoreSpyRoomIdentities(
            current,
            identities,
          ),
        )
        setSpyIdentitiesReady(true)
      })
      .catch((error) => {
        if (!active) {
          return
        }

        setSpyIdentitiesReady(true)
        setSpyRoom((current) => ({
          ...current,
          individualMessage:
            `Saved Spy Room identities unavailable: ${describeLiveError(
              error,
            )}`,
        }))
      })

    return () => {
      active = false
    }
  }, [connection.user.id, identityStore])

  useEffect(() => {
    let active = true
    const startingMutationVersion =
      hospitalWatchMutationVersion.current

    void watchStore
      .load(connection.user.id)
      .then((state) => {
        if (!active) {
          return
        }

        if (
          hospitalWatchMutationVersion.current !==
          startingMutationVersion
        ) {
          return
        }

        hospitalWatchRef.current = state
        setHospitalWatchedIds(
          state.watchedPlayerIds,
        )
        setHospitalMessage(null)
      })
      .catch((error) => {
        if (!active) {
          return
        }

        setHospitalMessage(
          `Saved Hospital watch state unavailable: ${describeLiveError(
            error,
          )}`,
        )
      })

    return () => {
      active = false
    }
  }, [connection.user.id, watchStore])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const handleVisibility = () =>
      setPageVisible(
        document.visibilityState !== 'hidden',
      )

    document.addEventListener(
      'visibilitychange',
      handleVisibility,
    )

    return () =>
      document.removeEventListener(
        'visibilitychange',
        handleVisibility,
      )
  }, [])

  useEffect(() => {
    if (visibleScreen !== 'hospital') {
      return
    }

    const updateClock = () =>
      setHospitalNow(
        Math.floor(now() / 1000),
      )

    updateClock()
    const intervalId = window.setInterval(
      updateClock,
      1_000,
    )

    return () =>
      window.clearInterval(intervalId)
  }, [now, visibleScreen])

  useEffect(() => {
    const intervalId = window.setInterval(
      () => {
        setSpyRoom((current) =>
          expireSpyRoomStatus(
            current,
            Math.floor(now() / 1000),
            evidencePolicy.statusMaxAgeSeconds,
          ),
        )
      },
      1_000,
    )

    return () =>
      window.clearInterval(intervalId)
  }, [
    evidencePolicy.statusMaxAgeSeconds,
    now,
  ])

  useEffect(() => {
    let active = true
    let refreshRunning = false

    async function refresh() {
      if (refreshRunning) {
        return
      }

      refreshRunning = true

      try {
        const snapshot =
          await runtime.loadWarBoardSnapshot(
            connection.user.faction.id,
          )

        if (!active) {
          return
        }

        if (
          snapshot.war === null ||
          snapshot.enemyRoster === null
        ) {
          setWarBoard({
            phase: 'no-war',
            stale: false,
            message: null,
            war: null,
            targets: [],
            recommendations: [],
            observedAt:
              snapshot.war?.observedAt ??
              null,
          })
          return
        }

        const observedAt = Math.floor(
          now() / 1000,
        )
        let intel = emptyIntelSnapshot(
          connection.user.id,
          observedAt,
        )
        let intelMessage: string | null = null

        if (
          connection.ffscouter.status ===
          'registered'
        ) {
          try {
            intel =
              await runtime.loadBattleIntel(
                connection.user.id,
                snapshot.enemyRoster.members.map(
                  (member) => member.id,
                ),
                'active-war',
              )
          } catch (error) {
            intelMessage =
              `Battle intel unavailable: ${describeLiveError(
                error,
              )}`
          }
        } else {
          intelMessage =
            'Battle intel is not currently enabled. Live Torn status remains available.'
        }

        if (!active) {
          return
        }

        const nextView = buildWarBoardView(
          connection.user,
          snapshot,
          intel,
          observedAt,
          evidencePolicy,
        )

        setWarBoard(
          intelMessage
            ? {
                ...nextView,
                message: intelMessage,
              }
            : nextView,
        )
      } catch (error) {
        if (!active) {
          return
        }

        const message =
          describeLiveError(error)

        setWarBoard((current) =>
          current.phase === 'ready'
            ? markWarBoardViewStale(
                current,
                message,
              )
            : createErrorWarBoardView(
                message,
              ),
        )
      } finally {
        refreshRunning = false
      }
    }

    void refresh()

    const intervalId = window.setInterval(
      () => void refresh(),
      Math.max(1_000, refreshIntervalMs),
    )

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [
    connection.ffscouter.status,
    connection.user,
    evidencePolicy,
    now,
    refreshIntervalMs,
    runtime,
  ])

  const loadBattleIntel = useCallback(
    async (
      playerIds: readonly number[],
      priority: RequestPriority,
      unavailableMessage: string,
    ) => {
      const observedAt = Math.floor(
        now() / 1000,
      )
      let intel = emptyIntelSnapshot(
        connection.user.id,
        observedAt,
      )
      let message: string | null = null

      if (
        connection.ffscouter.status ===
        'registered'
      ) {
        try {
          intel = await runtime.loadBattleIntel(
            connection.user.id,
            playerIds,
            priority,
          )
        } catch (error) {
          message =
            `Battle intel unavailable: ${describeLiveError(
              error,
            )}`
        }
      } else {
        message = unavailableMessage
      }

      return {
        intel,
        message,
        observedAt,
      }
    },
    [
      connection.ffscouter.status,
      connection.user.id,
      now,
      runtime,
    ],
  )

  const fetchIndividualTargets = useCallback(
    async (
      playerIds: readonly number[],
      priority: RequestPriority,
    ): Promise<IndividualRefreshResult> => {
      const ids = uniquePlayerIds(playerIds)
      const settled = await Promise.all(
        ids.map(async (playerId) => {
          try {
            const recon =
              await runtime.loadPlayerRecon(
                playerId,
                priority,
              )

            return {
              playerId,
              recon,
              error: null,
            }
          } catch (error) {
            return {
              playerId,
              recon: null,
              error,
            }
          }
        }),
      )
      const successful = settled.filter(
        (
          item,
        ): item is {
          playerId: number
          recon: PlayerReconSnapshot
          error: null
        } => item.recon !== null,
      )
      const failed = settled.filter(
        (item) => item.recon === null,
      )
      const intelResult =
        await loadBattleIntel(
          successful.map(
            (item) => item.playerId,
          ),
          priority,
          'Battle intel is not currently enabled. Live Torn status remains available.',
        )
      const targets = successful.map(
        (item) =>
          buildIndividualSpyTarget(
            connection.user,
            item.recon,
            intelResult.intel,
            intelResult.observedAt,
            evidencePolicy,
          ),
      )
      let message = intelResult.message

      if (failed.length > 0) {
        const firstError = failed[0]?.error
        const failureMessage =
          failed.length === ids.length
            ? `Player recon unavailable: ${describeLiveError(
                firstError,
              )}`
            : `${failed.length} saved player recon target${
                failed.length === 1 ? '' : 's'
              } could not be refreshed.`

        message = message
          ? `${failureMessage} ${message}`
          : failureMessage
      }

      return {
        targets,
        message,
      }
    },
    [
      connection.user,
      evidencePolicy,
      loadBattleIntel,
      runtime,
    ],
  )

  const refreshSavedIndividuals = useCallback(
    async (
      playerIds: readonly number[],
      priority: RequestPriority,
      announce: boolean,
    ) => {
      const ids = uniquePlayerIds(playerIds)

      if (ids.length === 0) {
        return
      }

      if (announce) {
        setSpyRoom((current) => ({
          ...current,
          individualMessage:
            'Refreshing saved player recon…',
        }))
      }

      const result =
        await fetchIndividualTargets(
          ids,
          priority,
        )
      const refreshedById = new Map(
        result.targets.map((target) => [
          target.id,
          target,
        ]),
      )

      setSpyRoom((current) => ({
        ...current,
        individualTargets:
          current.individualTargets.map(
            (target) =>
              refreshedById.get(
                target.id,
              ) ?? target,
          ),
        individualMessage: result.message,
      }))
    },
    [fetchIndividualTargets],
  )

  async function loadIndividualRecon(
    playerId: number,
  ) {
    const identities = spyIdentitiesRef.current
    const alreadySaved =
      identities.individualPlayerIds.includes(
        playerId,
      )

    if (
      !alreadySaved &&
      identities.individualPlayerIds.length >=
        MAX_INDIVIDUAL_RECON_TARGETS
    ) {
      setSpyRoom((current) => ({
        ...current,
        individualMessage:
          'Individual Spy Room is limited to 10 players. Remove one before adding another.',
      }))
      return
    }

    setSpyRoom((current) => ({
      ...current,
      individualMessage:
        'Loading live player recon…',
    }))

    const result =
      await fetchIndividualTargets(
        [playerId],
        'explicit',
      )
    const target = result.targets[0]

    if (!target) {
      setSpyRoom((current) => ({
        ...current,
        individualMessage:
          result.message ??
          'Player recon unavailable.',
      }))
      return
    }

    setSpyRoom((current) => ({
      ...current,
      individualTargets: [
        target,
        ...current.individualTargets.filter(
          (item) => item.id !== target.id,
        ),
      ],
      individualMessage: result.message,
      playerSearch: {
        ...current.playerSearch,
        phase: 'idle',
        results: [],
        message: null,
      },
    }))

    if (!alreadySaved) {
      persistSpyIdentities({
        ...identities,
        individualPlayerIds: [
          playerId,
          ...identities.individualPlayerIds,
        ].slice(
          0,
          MAX_INDIVIDUAL_RECON_TARGETS,
        ),
      })
    }
  }

  async function handlePlayerSearch(
    query: string,
  ) {
    const value = query.trim()

    if (/^\d+$/.test(value)) {
      await loadIndividualRecon(Number(value))
      return
    }

    setSpyRoom((current) => ({
      ...current,
      playerSearch: {
        phase: 'loading',
        query: value,
        results: [],
        message: null,
      },
    }))

    try {
      const results =
        await runtime.searchPlayers(value)

      setSpyRoom((current) => ({
        ...current,
        playerSearch: {
          phase: 'ready',
          query: value,
          results,
          message:
            results.length === 0
              ? 'No matching Torn players found.'
              : null,
        },
      }))
    } catch (error) {
      setSpyRoom((current) => ({
        ...current,
        playerSearch: {
          phase: 'error',
          query: value,
          results: [],
          message:
            `Player search unavailable: ${describeLiveError(
              error,
            )}`,
        },
      }))
    }
  }

  const loadFactionRecon = useCallback(
    async (
      factionId: number,
      knownMatch: FactionSearchMatch | undefined,
      priority: RequestPriority,
      persistOnSuccess: boolean,
      announce: boolean,
    ) => {
      if (announce) {
        setSpyRoom((current) => ({
          ...current,
          factionSearch: {
            ...current.factionSearch,
            phase: 'loading',
            message: null,
          },
          factionWorkspace:
            current.factionWorkspace
              ? {
                  ...current.factionWorkspace,
                  message:
                    'Refreshing live faction recon…',
                }
              : current.factionWorkspace,
        }))
      }

      try {
        const [faction, roster] =
          await Promise.all([
            knownMatch
              ? Promise.resolve({
                  id: knownMatch.id,
                  name: knownMatch.name,
                })
              : runtime.loadFactionIdentity(
                  factionId,
                  priority,
                ),
            runtime.loadFactionRoster(
              factionId,
              priority,
            ),
          ])
        const intelResult =
          await loadBattleIntel(
            roster.members.map(
              (member) => member.id,
            ),
            priority,
            'Battle intel is not currently enabled. Live Torn roster status remains available.',
          )
        const targets =
          buildFactionSpyTargets(
            connection.user,
            roster,
            intelResult.intel,
            intelResult.observedAt,
            evidencePolicy,
          )

        setSpyRoom((current) => ({
          ...current,
          factionWorkspace: {
            faction,
            targets,
            observedAt: roster.observedAt,
            message: intelResult.message,
          },
          factionSearch: {
            ...current.factionSearch,
            phase: 'idle',
            results: [],
            message: null,
          },
        }))

        if (persistOnSuccess) {
          persistSpyIdentities({
            ...spyIdentitiesRef.current,
            factionId,
          })
        }
      } catch (error) {
        const message =
          `Faction recon unavailable: ${describeLiveError(
            error,
          )}`

        setSpyRoom((current) => ({
          ...current,
          factionWorkspace:
            current.factionWorkspace
              ? {
                  ...current.factionWorkspace,
                  message,
                }
              : current.factionWorkspace,
          factionSearch: announce
            ? {
                ...current.factionSearch,
                phase: 'error',
                message,
              }
            : current.factionSearch,
        }))
      }
    },
    [
      connection.user,
      evidencePolicy,
      loadBattleIntel,
      persistSpyIdentities,
      runtime,
    ],
  )

  async function handleFactionSearch(
    query: string,
  ) {
    const value = query.trim()

    if (/^\d+$/.test(value)) {
      await loadFactionRecon(
        Number(value),
        undefined,
        'explicit',
        true,
        true,
      )
      return
    }

    setSpyRoom((current) => ({
      ...current,
      factionSearch: {
        phase: 'loading',
        query: value,
        results: [],
        message: null,
      },
    }))

    try {
      const results =
        await runtime.searchFactions(value)

      setSpyRoom((current) => ({
        ...current,
        factionSearch: {
          phase: 'ready',
          query: value,
          results,
          message:
            results.length === 0
              ? 'No matching Torn factions found.'
              : null,
        },
      }))
    } catch (error) {
      setSpyRoom((current) => ({
        ...current,
        factionSearch: {
          phase: 'error',
          query: value,
          results: [],
          message:
            `Faction search unavailable: ${describeLiveError(
              error,
            )}`,
        },
      }))
    }
  }

  function handlePlayerSelect(
    match: PlayerSearchMatch,
  ) {
    void loadIndividualRecon(match.id)
  }

  function handlePlayerRemove(
    playerId: number,
  ) {
    setSpyRoom((current) => ({
      ...current,
      individualTargets:
        current.individualTargets.filter(
          (target) => target.id !== playerId,
        ),
      individualMessage: null,
    }))
    const identities = spyIdentitiesRef.current
    persistSpyIdentities({
      ...identities,
      individualPlayerIds:
        identities.individualPlayerIds.filter(
          (id) => id !== playerId,
        ),
    })
  }

  function handlePlayersRemoveAll() {
    setSpyRoom((current) => ({
      ...current,
      individualTargets: [],
      individualMessage: null,
    }))
    persistSpyIdentities({
      ...spyIdentitiesRef.current,
      individualPlayerIds: [],
    })
  }

  function handleFactionRemove() {
    setSpyRoom((current) => ({
      ...current,
      factionWorkspace: null,
    }))
    setVisibleSpyWorkspace((current) => current === 'faction' ? null : current)
    persistSpyIdentities({
      ...spyIdentitiesRef.current,
      factionId: null,
    })
  }

  function handleFactionSelect(
    match: FactionSearchMatch,
  ) {
    void loadFactionRecon(
      match.id,
      match,
      'explicit',
      true,
      true,
    )
  }

  const refreshVisibleSpyWorkspace = useCallback(
    (
      workspace: SpyWorkspace,
      priority: RequestPriority,
      announce: boolean,
    ) => {
      const identities =
        spyIdentitiesRef.current

      if (workspace === 'individual') {
        void refreshSavedIndividuals(
          identities.individualPlayerIds,
          priority,
          announce,
        )
        return
      }

      if (identities.factionId !== null) {
        void loadFactionRecon(
          identities.factionId,
          undefined,
          priority,
          false,
          announce,
        )
      }
    },
    [
      loadFactionRecon,
      refreshSavedIndividuals,
    ],
  )

  useEffect(() => {
    if (
      !spyIdentitiesReady ||
      !pageVisible ||
      visibleSpyWorkspace === null
    ) {
      return
    }

    refreshVisibleSpyWorkspace(
      visibleSpyWorkspace,
      'visible-spy',
      false,
    )
  }, [
    pageVisible,
    refreshVisibleSpyWorkspace,
    spyIdentitiesReady,
    visibleSpyWorkspace,
  ])

  useEffect(() => {
    if (
      !spyIdentitiesReady ||
      !pageVisible ||
      visibleScreen !== 'hospital'
    ) {
      return
    }

    const identities = spyIdentitiesRef.current
    void refreshSavedIndividuals(
      identities.individualPlayerIds,
      'visible-spy',
      false,
    )

    if (identities.factionId !== null) {
      void loadFactionRecon(
        identities.factionId,
        undefined,
        'visible-spy',
        false,
        false,
      )
    }
  }, [
    loadFactionRecon,
    pageVisible,
    refreshSavedIndividuals,
    spyIdentitiesReady,
    visibleScreen,
  ])

  useEffect(() => {
    if (
      !spyIdentitiesReady ||
      !pageVisible ||
      visibleSpyWorkspace === null
    ) {
      return
    }

    const intervalId = window.setInterval(
      () =>
        refreshVisibleSpyWorkspace(
          visibleSpyWorkspace,
          'visible-spy',
          false,
        ),
      Math.max(1_000, refreshIntervalMs),
    )

    return () => window.clearInterval(intervalId)
  }, [
    pageVisible,
    refreshIntervalMs,
    refreshVisibleSpyWorkspace,
    spyIdentitiesReady,
    visibleSpyWorkspace,
  ])

  useEffect(() => {
    if (
      !spyIdentitiesReady ||
      !pageVisible ||
      visibleScreen !== 'hospital'
    ) {
      return
    }

    const refreshHospitalIntel = () => {
      const identities = spyIdentitiesRef.current
      void refreshSavedIndividuals(
        identities.individualPlayerIds,
        'visible-spy',
        false,
      )

      if (identities.factionId !== null) {
        void loadFactionRecon(
          identities.factionId,
          undefined,
          'visible-spy',
          false,
          false,
        )
      }
    }

    const intervalId = window.setInterval(
      refreshHospitalIntel,
      Math.max(1_000, refreshIntervalMs),
    )

    return () => window.clearInterval(intervalId)
  }, [
    loadFactionRecon,
    pageVisible,
    refreshIntervalMs,
    refreshSavedIndividuals,
    spyIdentitiesReady,
    visibleScreen,
  ])

  const handleSpyWorkspaceChange = useCallback(
    (workspace: SpyWorkspace | null) => {
      setVisibleSpyWorkspace(workspace)
    },
    [],
  )

  function handleSpyRefresh(
    workspace: SpyWorkspace,
  ) {
    refreshVisibleSpyWorkspace(
      workspace,
      'explicit',
      true,
    )
  }

  useEffect(() => {
    if (
      !spyIdentitiesReady ||
      !pageVisible ||
      visibleScreen !== 'travel'
    ) {
      return
    }

    const refreshTravelIntel = () => {
      const identities = spyIdentitiesRef.current
      void refreshSavedIndividuals(
        identities.individualPlayerIds,
        'visible-spy',
        false,
      )

      if (identities.factionId !== null) {
        void loadFactionRecon(
          identities.factionId,
          undefined,
          'visible-spy',
          false,
          false,
        )
      }
    }

    refreshTravelIntel()
    const intervalId = window.setInterval(
      refreshTravelIntel,
      Math.max(1_000, refreshIntervalMs),
    )

    return () => window.clearInterval(intervalId)
  }, [
    loadFactionRecon,
    pageVisible,
    refreshIntervalMs,
    refreshSavedIndividuals,
    spyIdentitiesReady,
    visibleScreen,
  ])

  useEffect(() => {
    if (visibleScreen !== 'travel' || !pageVisible) return
    let active = true

    const refresh = async () => {
      const view = buildTravelView({
        war: warBoard,
        individualTargets: spyRoom.individualTargets,
        factionTargets: spyRoom.factionWorkspace?.targets ?? [],
        includeNonWar: travelIncludeNonWar,
        includeNonTravel: true,
      })
      try {
        const next = await refreshLiveTravelWorkspace({
          userId: connection.user.id,
          view,
          runtime,
          store: travelStore,
        })
        if (active) setTravelWorkspace(next)
      } catch (error) {
        if (active) {
          setTravelWorkspace({
            activeWar: view.activeWar,
            warTargetsOnly: view.warTargetsOnly,
            targets: [],
            message: `Travel observations unavailable: ${describeLiveError(error)}`,
          })
        }
      }
    }

    void refresh()
    const intervalId = window.setInterval(() => void refresh(), Math.max(1_000, refreshIntervalMs))
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [
    connection.user.id, pageVisible, refreshIntervalMs, runtime, spyRoom,
    travelIncludeNonWar, travelStore, visibleScreen, warBoard,
  ])

  useEffect(() => {
    if (visibleScreen !== 'team' || !pageVisible) return

    let active = true
    let refreshRunning = false
    const refresh = async () => {
      if (refreshRunning) return
      refreshRunning = true
      setTeamView((current) => current.phase === 'ready'
        ? current
        : { ...current, phase: 'loading', message: null })
      try {
        const roster = await runtime.loadFactionRoster(connection.user.faction.id, 'explicit')
        if (active) setTeamView(buildTeamView(roster, Math.floor(now() / 1000)))
      } catch (error) {
        if (active) {
          const message = `Team roster unavailable: ${describeLiveError(error)}`
          setTeamView((current) => current.phase === 'ready'
            ? { ...current, stale: true, message }
            : { ...EMPTY_TEAM_VIEW, phase: 'error', message })
        }
      } finally {
        refreshRunning = false
      }
    }

    void refresh()
    const intervalId = window.setInterval(() => void refresh(), Math.max(1_000, refreshIntervalMs))
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [connection.user.faction.id, now, pageVisible, refreshIntervalMs, runtime, visibleScreen])

  const handleScreenChange = useCallback(
    (screen: AppScreen) => {
      setVisibleScreen(screen)
    },
    [],
  )


  const hospitalView = useMemo(() => {
    const view = buildHospitalView(
      warBoard,
      spyRoom,
      new Set(hospitalWatchedIds),
    )

    return {
      ...view,
      message: hospitalMessage,
    }
  }, [
    hospitalMessage,
    hospitalWatchedIds,
    spyRoom,
    warBoard,
  ])

  return (
    <AppShell
      connection={connection}
      onDisconnect={onDisconnect}
      warBoard={warBoard}
      spyRoom={spyRoom}
      onSpyPlayerSearch={handlePlayerSearch}
      onSpyPlayerSelect={handlePlayerSelect}
      onSpyPlayerRemove={handlePlayerRemove}
      onSpyPlayersRemoveAll={handlePlayersRemoveAll}
      onSpyFactionSearch={handleFactionSearch}
      onSpyFactionSelect={handleFactionSelect}
      onSpyFactionRemove={handleFactionRemove}
      onSpyWorkspaceChange={
        handleSpyWorkspaceChange
      }
      onSpyRefresh={handleSpyRefresh}
      hospitalView={hospitalView}
      hospitalNow={hospitalNow}
      travelWorkspace={travelWorkspace}
      teamView={teamView}
      travelIncludeNonWar={travelIncludeNonWar}
      onTravelIncludeNonWarChange={setTravelIncludeNonWar}
      onScreenChange={handleScreenChange}
    />
  )
}
