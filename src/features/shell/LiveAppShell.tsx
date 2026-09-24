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
} from '../../types'
import type {
  LiveWarEvidencePolicy,
} from '../../recommendations/live'
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
    : 'Live war data is unavailable.'
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

  return (
    <AppShell
      connection={connection}
      onDisconnect={onDisconnect}
      warBoard={warBoard}
    />
  )
}
