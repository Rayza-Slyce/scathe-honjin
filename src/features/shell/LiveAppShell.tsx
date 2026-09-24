import {
  useEffect,
  useState,
} from 'react'
import type {
  HonjinConnection,
} from '../../app/connect'
import type {
  HonjinRuntime,
} from '../../app/runtime'
import type {
  BattleIntelSnapshot,
  FactionSearchMatch,
  PlayerSearchMatch,
} from '../../types'
import type {
  LiveWarEvidencePolicy,
} from '../../recommendations/live'
import {
  buildFactionSpyTargets,
  buildIndividualSpyTarget,
  createEmptySpyRoomView,
  expireSpyRoomStatus,
} from '../targets/live-spy'
import type {
  SpyRoomView,
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
import AppShell from './AppShell'

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

export default function LiveAppShell({
  connection,
  runtime,
  onDisconnect,
  evidencePolicy =
    DEFAULT_LIVE_WAR_EVIDENCE_POLICY,
  refreshIntervalMs =
    DEFAULT_ACTIVE_WAR_REFRESH_MS,
  now = Date.now,
}: LiveAppShellProps) {
  const [warBoard, setWarBoard] =
    useState<WarBoardView>(
      createLoadingWarBoardView,
    )
  const [spyRoom, setSpyRoom] =
    useState<SpyRoomView>(
      createEmptySpyRoomView,
    )

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

    const intervalId =
      window.setInterval(
        () => void refresh(),
        Math.max(
          1_000,
          refreshIntervalMs,
        ),
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

  async function loadIndividualRecon(
    playerId: number,
  ) {
    const alreadySaved =
      spyRoom.individualTargets.some(
        (target) =>
          target.id === playerId,
      )

    if (
      !alreadySaved &&
      spyRoom.individualTargets.length >=
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

    try {
      const recon =
        await runtime.loadPlayerRecon(
          playerId,
          'explicit',
        )
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
              [playerId],
              'explicit',
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

      const target =
        buildIndividualSpyTarget(
          connection.user,
          recon,
          intel,
          observedAt,
          evidencePolicy,
        )

      setSpyRoom((current) => {
        const existing =
          current.individualTargets.some(
            (item) =>
              item.id === target.id,
          )

        if (
          !existing &&
          current.individualTargets.length >=
            MAX_INDIVIDUAL_RECON_TARGETS
        ) {
          return {
            ...current,
            individualMessage:
              'Individual Spy Room is limited to 10 players. Remove one before adding another.',
          }
        }

        const withoutTarget =
          current.individualTargets.filter(
            (item) =>
              item.id !== target.id,
          )

        return {
          ...current,
          individualTargets: [
            target,
            ...withoutTarget,
          ],
          individualMessage:
            intelMessage,
          playerSearch: {
            ...current.playerSearch,
            phase: 'idle',
            results: [],
            message: null,
          },
        }
      })
    } catch (error) {
      setSpyRoom((current) => ({
        ...current,
        individualMessage:
          `Player recon unavailable: ${describeLiveError(
            error,
          )}`,
      }))
    }
  }

  async function handlePlayerSearch(
    query: string,
  ) {
    const value = query.trim()

    if (/^\d+$/.test(value)) {
      await loadIndividualRecon(
        Number(value),
      )
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

  async function loadFactionRecon(
    factionId: number,
    knownMatch?: FactionSearchMatch,
  ) {
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
          : null,
    }))

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
                'explicit',
              ),
          runtime.loadFactionRoster(
            factionId,
            'explicit',
          ),
        ])
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
              roster.members.map(
                (member) => member.id,
              ),
              'explicit',
            )
        } catch (error) {
          intelMessage =
            `Battle intel unavailable: ${describeLiveError(
              error,
            )}`
        }
      } else {
        intelMessage =
          'Battle intel is not currently enabled. Live Torn roster status remains available.'
      }

      const targets =
        buildFactionSpyTargets(
          connection.user,
          roster,
          intel,
          observedAt,
          evidencePolicy,
        )

      setSpyRoom((current) => ({
        ...current,
        factionWorkspace: {
          faction,
          targets,
          observedAt:
            roster.observedAt,
          message: intelMessage,
        },
        factionSearch: {
          ...current.factionSearch,
          phase: 'idle',
          results: [],
          message: null,
        },
      }))
    } catch (error) {
      setSpyRoom((current) => ({
        ...current,
        factionWorkspace:
          current.factionWorkspace
            ? {
                ...current.factionWorkspace,
                message:
                  `Faction recon unavailable: ${describeLiveError(
                    error,
                  )}`,
              }
            : null,
        factionSearch: {
          ...current.factionSearch,
          phase: 'error',
          message:
            `Faction recon unavailable: ${describeLiveError(
              error,
            )}`,
        },
      }))
    }
  }

  async function handleFactionSearch(
    query: string,
  ) {
    const value = query.trim()

    if (/^\d+$/.test(value)) {
      await loadFactionRecon(
        Number(value),
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
          (target) =>
            target.id !== playerId,
        ),
      individualMessage: null,
    }))
  }

  function handleFactionSelect(
    match: FactionSearchMatch,
  ) {
    void loadFactionRecon(
      match.id,
      match,
    )
  }

  return (
    <AppShell
      connection={connection}
      onDisconnect={onDisconnect}
      warBoard={warBoard}
      spyRoom={spyRoom}
      onSpyPlayerSearch={handlePlayerSearch}
      onSpyPlayerSelect={handlePlayerSelect}
      onSpyPlayerRemove={handlePlayerRemove}
      onSpyFactionSearch={handleFactionSearch}
      onSpyFactionSelect={handleFactionSelect}
    />
  )
}
