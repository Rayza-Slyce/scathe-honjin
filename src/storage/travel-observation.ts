import type { PlayerId } from '../types'
import {
  emptyPlayerTravelObservationState,
  type PlayerTravelObservationState,
} from '../features/travel/observation-state'
import { inferTravelMethod } from '../features/travel/inference'
import { estimateTravelEta } from '../features/travel/timing'

export interface TravelObservationStore {
  load(userId: number, playerId: PlayerId): Promise<PlayerTravelObservationState>
  save(userId: number, state: PlayerTravelObservationState): Promise<void>
}

function validId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

export function normaliseTravelObservationState(
  playerId: PlayerId,
  value: unknown,
  resetLegacyMethodEvidence = false,
): PlayerTravelObservationState {
  if (typeof value !== 'object' || value === null) {
    return emptyPlayerTravelObservationState(playerId)
  }

  const candidate = value as Partial<PlayerTravelObservationState>
  if (candidate.playerId !== playerId) {
    return emptyPlayerTravelObservationState(playerId)
  }

  // Persistence is local observational evidence, never authority. Reject a
  // malformed record rather than manufacturing partial timing evidence.
  if (
    candidate.previousSample !== null &&
    candidate.previousSample !== undefined &&
    (typeof candidate.previousSample !== 'object' ||
      !Number.isSafeInteger(candidate.previousSample.observedAt))
  ) {
    return emptyPlayerTravelObservationState(playerId)
  }

  const previousSample = candidate.previousSample ?? null
  let activeJourney = candidate.activeJourney ?? null
  let history = Array.isArray(candidate.history) ? candidate.history : []

  if (resetLegacyMethodEvidence) {
    history = history.map((entry) => ({
      ...entry,
      originalMethodReasoning: [],
    }))

    if (activeJourney !== null) {
      const method = inferTravelMethod(
        previousSample?.planeImageType ?? null,
        null,
      )
      activeJourney = {
        ...activeJourney,
        originalMethod: method,
        originalTiming: estimateTravelEta({
          destination:
            activeJourney.route.direction === 'inbound'
              ? activeJourney.route.origin
              : activeJourney.route.destination,
          method: method.method,
          departureWindow: activeJourney.departureWindow,
          observedAt:
            previousSample?.observedAt ??
            activeJourney.departureWindow?.latestAt ??
            0,
        }),
      }
    }
  }

  return {
    playerId,
    previousSample,
    activeJourney,
    history,
  }
}

export function createMemoryTravelObservationStore(): TravelObservationStore {
  const records = new Map<string, PlayerTravelObservationState>()
  const key = (userId: number, playerId: PlayerId) => `${userId}:${playerId}`

  return {
    async load(userId, playerId) {
      if (!validId(userId) || !validId(playerId)) {
        throw new Error('Valid user and player IDs are required.')
      }
      return normaliseTravelObservationState(playerId, records.get(key(userId, playerId)))
    },
    async save(userId, state) {
      if (!validId(userId) || !validId(state.playerId)) {
        throw new Error('Valid user and player IDs are required.')
      }
      records.set(
        key(userId, state.playerId),
        normaliseTravelObservationState(state.playerId, structuredClone(state)),
      )
    },
  }
}

interface StoredTravelObservationRecord {
  key: string
  schemaVersion?: number
  userId: number
  playerId: PlayerId
  state: PlayerTravelObservationState
}

const DATABASE_NAME = 'scathe-honjin-travel-state'
const DATABASE_VERSION = 1
const STORE_NAME = 'travel-observations'

function openDatabase(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Travel observation persistence could not be opened.'))
  })
}

export function createIndexedDbTravelObservationStore(
  indexedDb: IDBFactory | null = typeof indexedDB === 'undefined' ? null : indexedDB,
): TravelObservationStore {
  if (!indexedDb) return createMemoryTravelObservationStore()
  let databasePromise: Promise<IDBDatabase> | null = null
  const database = () => (databasePromise ??= openDatabase(indexedDb))
  const key = (userId: number, playerId: PlayerId) => `${userId}:${playerId}`

  return {
    async load(userId, playerId) {
      if (!validId(userId) || !validId(playerId)) throw new Error('Valid user and player IDs are required.')
      const db = await database()
      return new Promise((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key(userId, playerId))
        request.onsuccess = () => {
          const record = request.result as StoredTravelObservationRecord | undefined
          resolve(
            normaliseTravelObservationState(
              playerId,
              record?.state,
              record !== undefined && record.schemaVersion !== 2,
            ),
          )
        }
        request.onerror = () => reject(request.error ?? new Error('Travel observation state could not be loaded.'))
      })
    },
    async save(userId, state) {
      if (!validId(userId) || !validId(state.playerId)) throw new Error('Valid user and player IDs are required.')
      const db = await database()
      const record: StoredTravelObservationRecord = {
        key: key(userId, state.playerId), schemaVersion: 2, userId, playerId: state.playerId,
        state: normaliseTravelObservationState(state.playerId, structuredClone(state)),
      }
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        transaction.objectStore(STORE_NAME).put(record)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error ?? new Error('Travel observation state could not be saved.'))
        transaction.onabort = () => reject(transaction.error ?? new Error('Travel observation save was aborted.'))
      })
    },
  }
}
