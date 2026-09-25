export interface SpyRoomIdentityState {
  individualPlayerIds: readonly number[]
  factionId: number | null
}

export interface SpyRoomIdentityStore {
  load(
    userId: number,
  ): Promise<SpyRoomIdentityState>
  save(
    userId: number,
    state: SpyRoomIdentityState,
  ): Promise<void>
}

interface StoredSpyRoomIdentityRecord {
  userId: number
  individualPlayerIds: readonly number[]
  factionId: number | null
}

const DATABASE_NAME = 'scathe-honjin-state'
const DATABASE_VERSION = 1
const STORE_NAME = 'spy-room-identities'
const MAX_INDIVIDUAL_TARGETS = 10

export const EMPTY_SPY_ROOM_IDENTITY_STATE:
  SpyRoomIdentityState = {
    individualPlayerIds: [],
    factionId: null,
  }

function validId(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

export function normaliseSpyRoomIdentityState(
  value: unknown,
): SpyRoomIdentityState {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return EMPTY_SPY_ROOM_IDENTITY_STATE
  }

  const candidate = value as {
    individualPlayerIds?: unknown
    factionId?: unknown
  }
  const individualPlayerIds = Array.isArray(
    candidate.individualPlayerIds,
  )
    ? [
        ...new Set(
          candidate.individualPlayerIds.filter(
            validId,
          ),
        ),
      ].slice(0, MAX_INDIVIDUAL_TARGETS)
    : []
  const factionId = validId(candidate.factionId)
    ? candidate.factionId
    : null

  return {
    individualPlayerIds,
    factionId,
  }
}

export function createMemorySpyRoomIdentityStore():
  SpyRoomIdentityStore {
  const stateByUser = new Map<
    number,
    SpyRoomIdentityState
  >()

  return {
    async load(userId) {
      return normaliseSpyRoomIdentityState(
        stateByUser.get(userId),
      )
    },
    async save(userId, state) {
      stateByUser.set(
        userId,
        normaliseSpyRoomIdentityState(state),
      )
    },
  }
}

function openDatabase(
  indexedDb: IDBFactory,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    )

    request.onupgradeneeded = () => {
      const database = request.result

      if (
        !database.objectStoreNames.contains(
          STORE_NAME,
        )
      ) {
        database.createObjectStore(
          STORE_NAME,
          {
            keyPath: 'userId',
          },
        )
      }
    }

    request.onsuccess = () =>
      resolve(request.result)
    request.onerror = () =>
      reject(
        request.error ??
          new Error(
            'Spy Room persistence could not be opened.',
          ),
      )
  })
}

export function createIndexedDbSpyRoomIdentityStore(
  indexedDb: IDBFactory | null =
    typeof indexedDB === 'undefined'
      ? null
      : indexedDB,
): SpyRoomIdentityStore {
  if (!indexedDb) {
    return createMemorySpyRoomIdentityStore()
  }

  let databasePromise: Promise<IDBDatabase> | null =
    null

  const database = () => {
    databasePromise ??= openDatabase(indexedDb)
    return databasePromise
  }

  return {
    async load(userId) {
      const db = await database()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(
          STORE_NAME,
          'readonly',
        )
        const request = transaction
          .objectStore(STORE_NAME)
          .get(userId)

        request.onsuccess = () =>
          resolve(
            normaliseSpyRoomIdentityState(
              request.result,
            ),
          )
        request.onerror = () =>
          reject(
            request.error ??
              new Error(
                'Spy Room identities could not be loaded.',
              ),
          )
      })
    },
    async save(userId, state) {
      const db = await database()
      const normalised =
        normaliseSpyRoomIdentityState(state)

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          STORE_NAME,
          'readwrite',
        )
        const record: StoredSpyRoomIdentityRecord = {
          userId,
          individualPlayerIds:
            normalised.individualPlayerIds,
          factionId: normalised.factionId,
        }

        transaction.objectStore(STORE_NAME).put(
          record,
        )
        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
          reject(
            transaction.error ??
              new Error(
                'Spy Room identities could not be saved.',
              ),
          )
        transaction.onabort = () =>
          reject(
            transaction.error ??
              new Error(
                'Spy Room identity save was aborted.',
              ),
          )
      })
    },
  }
}
