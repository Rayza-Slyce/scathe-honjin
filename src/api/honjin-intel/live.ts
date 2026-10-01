import type {
  PlaneImageType,
  PlayerId,
  PlayerState,
  TravelDirection,
} from '../../types'

export type SharedDepartureTransitionKind =
  | 'travel-start'
  | 'travel-route-change'

export interface SharedTravelObservation {
  playerId: PlayerId
  factionId: number | null
  observedAt: number
  state: PlayerState
  description: string | null
  planeImageType: PlaneImageType | null
  statusUntil: number | null
  lastActionAt: number | null
  departureWindow: {
    earliestAt: number
    latestAt: number
  } | null
  transitionKind: SharedDepartureTransitionKind | null
  route: {
    origin: string | null
    destination: string | null
    direction: TravelDirection
  } | null
}

export type SharedTravelObservationLoader = (
  playerIds: readonly PlayerId[],
) => Promise<ReadonlyMap<PlayerId, SharedTravelObservation>>

const HONJIN_INTEL_BASE_URL =
  'https://scathe-honjin-intel.rayza-slyce.workers.dev'
const MAX_SHARED_TRAVEL_IDS = 100

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normaliseState(value: unknown): PlayerState | null {
  return value === 'okay' ||
    value === 'hospital' ||
    value === 'travelling' ||
    value === 'abroad' ||
    value === 'unknown'
    ? value
    : null
}

function normalisePlaneImageType(value: unknown): PlaneImageType | null {
  return value === 'light_aircraft' ||
    value === 'airliner' ||
    value === 'private_jet' ||
    value === 'unknown'
    ? value
    : value === null
      ? null
      : null
}

function normaliseDirection(value: unknown): TravelDirection | null {
  return value === 'outbound' || value === 'inbound' || value === 'unknown'
    ? value
    : null
}

function normaliseObservation(value: unknown): SharedTravelObservation | null {
  if (!isRecord(value)) return null

  const playerId = numberOrNull(value.playerId)
  const factionId = value.factionId === null ? null : numberOrNull(value.factionId)
  const observedAt = numberOrNull(value.observedAt)
  const state = normaliseState(value.state)

  if (
    playerId === null ||
    !Number.isSafeInteger(playerId) ||
    playerId <= 0 ||
    (factionId !== null && (!Number.isSafeInteger(factionId) || factionId <= 0)) ||
    observedAt === null ||
    !Number.isSafeInteger(observedAt) ||
    observedAt <= 0 ||
    state === null
  ) {
    return null
  }

  let departureWindow: SharedTravelObservation['departureWindow'] = null
  if (isRecord(value.departureWindow)) {
    const earliestAt = numberOrNull(value.departureWindow.earliestAt)
    const latestAt = numberOrNull(value.departureWindow.latestAt)
    if (
      earliestAt !== null &&
      latestAt !== null &&
      Number.isSafeInteger(earliestAt) &&
      Number.isSafeInteger(latestAt) &&
      earliestAt > 0 &&
      latestAt >= earliestAt
    ) {
      departureWindow = { earliestAt, latestAt }
    }
  }

  let route: SharedTravelObservation['route'] = null
  if (isRecord(value.route)) {
    const direction = normaliseDirection(value.route.direction)
    if (direction !== null) {
      route = {
        origin: typeof value.route.origin === 'string' ? value.route.origin : null,
        destination:
          typeof value.route.destination === 'string'
            ? value.route.destination
            : null,
        direction,
      }
    }
  }

  const transitionKind =
    value.transitionKind === 'travel-start' ||
    value.transitionKind === 'travel-route-change'
      ? value.transitionKind
      : null

  return {
    playerId,
    factionId,
    observedAt,
    state,
    description: typeof value.description === 'string' ? value.description : null,
    planeImageType: normalisePlaneImageType(value.planeImageType),
    statusUntil: numberOrNull(value.statusUntil),
    lastActionAt: numberOrNull(value.lastActionAt),
    departureWindow,
    transitionKind,
    route,
  }
}

export async function loadSharedTravelObservations(
  playerIds: readonly PlayerId[],
  fetcher: typeof fetch = fetch,
): Promise<ReadonlyMap<PlayerId, SharedTravelObservation>> {
  const ids = [
    ...new Set(
      playerIds.filter(
        (playerId) => Number.isSafeInteger(playerId) && playerId > 0,
      ),
    ),
  ].slice(0, MAX_SHARED_TRAVEL_IDS)

  if (ids.length === 0) return new Map()

  const url = new URL('/v1/travel', HONJIN_INTEL_BASE_URL)
  url.searchParams.set('ids', ids.join(','))

  const response = await fetcher(url)
  if (!response.ok) {
    throw new Error(`Shared travel intel returned HTTP ${response.status}.`)
  }

  const body: unknown = await response.json()
  if (!isRecord(body) || !Array.isArray(body.observations)) {
    throw new Error('Shared travel intel returned an invalid response.')
  }

  const observations = new Map<PlayerId, SharedTravelObservation>()
  for (const item of body.observations) {
    const observation = normaliseObservation(item)
    if (observation !== null && ids.includes(observation.playerId)) {
      observations.set(observation.playerId, observation)
    }
  }

  return observations
}
