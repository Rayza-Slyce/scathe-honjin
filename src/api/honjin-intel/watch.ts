import type { FactionId, PlayerId } from '../../types'

export interface SharedPlayerWatchInterest {
  playerId: PlayerId
  factionId: FactionId | null
}

export interface SharedWatchInterest {
  players?: readonly SharedPlayerWatchInterest[]
  factionIds?: readonly FactionId[]
}

export type SharedWatchRegistrar = (
  interest: SharedWatchInterest,
) => Promise<void>

const HONJIN_INTEL_BASE_URL =
  'https://scathe-honjin-intel.rayza-slyce.workers.dev'
const MAX_PLAYERS = 10
const MAX_FACTIONS = 3

function positiveId(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0
}

export async function registerSharedWatchInterest(
  interest: SharedWatchInterest,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const playersById = new Map<PlayerId, SharedPlayerWatchInterest>()
  for (const player of interest.players ?? []) {
    if (!positiveId(player.playerId)) continue
    if (player.factionId !== null && !positiveId(player.factionId)) continue
    playersById.set(player.playerId, player)
    if (playersById.size >= MAX_PLAYERS) break
  }

  const factionIds = [
    ...new Set(
      (interest.factionIds ?? []).filter(positiveId),
    ),
  ].slice(0, MAX_FACTIONS)

  if (playersById.size === 0 && factionIds.length === 0) return

  const response = await fetcher(
    new URL('/v1/watch', HONJIN_INTEL_BASE_URL),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        players: [...playersById.values()],
        factionIds,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Shared watch registration returned HTTP ${response.status}.`)
  }
}
