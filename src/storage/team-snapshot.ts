import type {
  BattleIntelSnapshot,
  FactionRosterSnapshot,
} from '../types'

export interface TeamSnapshotState {
  factionId: number
  roster: FactionRosterSnapshot
  battleIntel: BattleIntelSnapshot | null
  savedAt: number
}

export interface TeamSnapshotStore {
  load(
    userId: number,
    factionId: number,
  ): Promise<TeamSnapshotState | null>
  save(
    userId: number,
    state: TeamSnapshotState,
  ): Promise<void>
}

function validId(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

function validEpoch(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
}

export function normaliseTeamSnapshotState(
  factionId: number,
  value: unknown,
): TeamSnapshotState | null {
  if (
    !validId(factionId) ||
    typeof value !== 'object' ||
    value === null
  ) {
    return null
  }

  const candidate = value as Partial<TeamSnapshotState>
  const roster = candidate.roster

  if (
    candidate.factionId !== factionId ||
    !roster ||
    roster.factionId !== factionId ||
    !validEpoch(roster.observedAt) ||
    !Array.isArray(roster.members) ||
    !validEpoch(candidate.savedAt)
  ) {
    return null
  }

  const battleIntel = candidate.battleIntel
  if (
    battleIntel !== null &&
    battleIntel !== undefined &&
    (!validId(battleIntel.callerPlayerId) ||
      !validEpoch(battleIntel.observedAt) ||
      !Array.isArray(battleIntel.intel))
  ) {
    return null
  }

  return {
    factionId,
    roster: structuredClone(roster),
    battleIntel:
      battleIntel === null || battleIntel === undefined
        ? null
        : structuredClone(battleIntel),
    savedAt: candidate.savedAt,
  }
}

export function createMemoryTeamSnapshotStore(): TeamSnapshotStore {
  const records = new Map<number, TeamSnapshotState>()

  return {
    async load(userId, factionId) {
      if (!validId(userId) || !validId(factionId)) {
        throw new Error('Valid user and faction IDs are required.')
      }

      return normaliseTeamSnapshotState(
        factionId,
        records.get(userId),
      )
    },

    async save(userId, state) {
      if (!validId(userId) || !validId(state.factionId)) {
        throw new Error('Valid user and faction IDs are required.')
      }

      const normalised = normaliseTeamSnapshotState(
        state.factionId,
        state,
      )
      if (!normalised) {
        throw new Error('Team snapshot is invalid.')
      }

      records.set(userId, normalised)
    },
  }
}

interface StoredTeamSnapshotRecord extends TeamSnapshotState {
  userId: number
}

const DATABASE_NAME = 'scathe-honjin-team-state'
const DATABASE_VERSION = 1
const STORE_NAME = 'team-snapshots'

function openDatabase(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    )

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, {
          keyPath: 'userId',
        })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(
        request.error ??
          new Error('Team snapshot persistence could not be opened.'),
      )
  })
}

export function createIndexedDbTeamSnapshotStore(
  indexedDb: IDBFactory | null =
    typeof indexedDB === 'undefined' ? null : indexedDB,
): TeamSnapshotStore {
  if (!indexedDb) {
    return createMemoryTeamSnapshotStore()
  }

  let databasePromise: Promise<IDBDatabase> | null = null
  const database = () =>
    (databasePromise ??= openDatabase(indexedDb))

  return {
    async load(userId, factionId) {
      if (!validId(userId) || !validId(factionId)) {
        throw new Error('Valid user and faction IDs are required.')
      }

      const db = await database()
      return new Promise((resolve, reject) => {
        const request = db
          .transaction(STORE_NAME, 'readonly')
          .objectStore(STORE_NAME)
          .get(userId)

        request.onsuccess = () => {
          const record = request.result as
            | StoredTeamSnapshotRecord
            | undefined
          resolve(
            normaliseTeamSnapshotState(
              factionId,
              record,
            ),
          )
        }
        request.onerror = () =>
          reject(
            request.error ??
              new Error('Team snapshot could not be loaded.'),
          )
      })
    },

    async save(userId, state) {
      if (!validId(userId) || !validId(state.factionId)) {
        throw new Error('Valid user and faction IDs are required.')
      }

      const normalised = normaliseTeamSnapshotState(
        state.factionId,
        state,
      )
      if (!normalised) {
        throw new Error('Team snapshot is invalid.')
      }

      const db = await database()
      const record: StoredTeamSnapshotRecord = {
        userId,
        ...normalised,
      }

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          STORE_NAME,
          'readwrite',
        )
        transaction.objectStore(STORE_NAME).put(record)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
          reject(
            transaction.error ??
              new Error('Team snapshot could not be saved.'),
          )
        transaction.onabort = () =>
          reject(
            transaction.error ??
              new Error('Team snapshot save was aborted.'),
          )
      })
    },
  }
}
