export interface HospitalWatchState {
  watchedPlayerIds: readonly number[]
}

export interface HospitalWatchStore {
  load(userId: number): Promise<HospitalWatchState>
  save(
    userId: number,
    state: HospitalWatchState,
  ): Promise<void>
}

interface StoredHospitalWatchRecord {
  userId: number
  watchedPlayerIds: readonly number[]
}

const DATABASE_NAME = 'scathe-honjin-hospital-state'
const DATABASE_VERSION = 1
const STORE_NAME = 'hospital-watch'

export const EMPTY_HOSPITAL_WATCH_STATE:
  HospitalWatchState = {
    watchedPlayerIds: [],
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

export function normaliseHospitalWatchState(
  value: unknown,
): HospitalWatchState {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return EMPTY_HOSPITAL_WATCH_STATE
  }

  const candidate = value as {
    watchedPlayerIds?: unknown
  }
  const watchedPlayerIds = Array.isArray(
    candidate.watchedPlayerIds,
  )
    ? [
        ...new Set(
          candidate.watchedPlayerIds.filter(
            validId,
          ),
        ),
      ]
    : []

  return { watchedPlayerIds }
}

export function createMemoryHospitalWatchStore():
  HospitalWatchStore {
  const stateByUser = new Map<
    number,
    HospitalWatchState
  >()

  return {
    async load(userId) {
      return normaliseHospitalWatchState(
        stateByUser.get(userId),
      )
    },
    async save(userId, state) {
      stateByUser.set(
        userId,
        normaliseHospitalWatchState(state),
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
          { keyPath: 'userId' },
        )
      }
    }

    request.onsuccess = () =>
      resolve(request.result)
    request.onerror = () =>
      reject(
        request.error ??
          new Error(
            'Hospital watch persistence could not be opened.',
          ),
      )
  })
}

export function createIndexedDbHospitalWatchStore(
  indexedDb: IDBFactory | null =
    typeof indexedDB === 'undefined'
      ? null
      : indexedDB,
): HospitalWatchStore {
  if (!indexedDb) {
    return createMemoryHospitalWatchStore()
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
            normaliseHospitalWatchState(
              request.result,
            ),
          )
        request.onerror = () =>
          reject(
            request.error ??
              new Error(
                'Hospital watch state could not be loaded.',
              ),
          )
      })
    },
    async save(userId, state) {
      const db = await database()
      const normalised =
        normaliseHospitalWatchState(state)

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          STORE_NAME,
          'readwrite',
        )
        const record: StoredHospitalWatchRecord = {
          userId,
          watchedPlayerIds:
            normalised.watchedPlayerIds,
        }

        transaction.objectStore(STORE_NAME).put(
          record,
        )
        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
          reject(
            transaction.error ??
              new Error(
                'Hospital watch state could not be saved.',
              ),
          )
        transaction.onabort = () =>
          reject(
            transaction.error ??
              new Error(
                'Hospital watch save was aborted.',
              ),
          )
      })
    },
  }
}
