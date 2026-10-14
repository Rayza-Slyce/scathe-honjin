export interface WarDismissalStore {
  load(userId: number): Promise<number | null>
  save(userId: number, warId: number): Promise<void>
}

interface StoredWarDismissalRecord {
  userId: number
  dismissedWarId: number
}

const DATABASE_NAME = 'scathe-honjin-war-state'
const DATABASE_VERSION = 1
const STORE_NAME = 'war-dismissals'

function validId(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

export function createMemoryWarDismissalStore(): WarDismissalStore {
  const dismissedWarByUser = new Map<number, number>()

  return {
    async load(userId) {
      if (!validId(userId)) {
        throw new Error('A valid user ID is required.')
      }

      return dismissedWarByUser.get(userId) ?? null
    },

    async save(userId, warId) {
      if (!validId(userId) || !validId(warId)) {
        throw new Error('Valid user and war IDs are required.')
      }

      dismissedWarByUser.set(userId, warId)
    },
  }
}

function openDatabase(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    )

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: 'userId',
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(
        request.error ??
          new Error('War dismissal persistence could not be opened.'),
      )
  })
}

export function createIndexedDbWarDismissalStore(
  indexedDb: IDBFactory | null =
    typeof indexedDB === 'undefined' ? null : indexedDB,
): WarDismissalStore {
  if (!indexedDb) {
    return createMemoryWarDismissalStore()
  }

  let databasePromise: Promise<IDBDatabase> | null = null
  const database = () =>
    (databasePromise ??= openDatabase(indexedDb))

  return {
    async load(userId) {
      if (!validId(userId)) {
        throw new Error('A valid user ID is required.')
      }

      const db = await database()
      return new Promise((resolve, reject) => {
        const request = db
          .transaction(STORE_NAME, 'readonly')
          .objectStore(STORE_NAME)
          .get(userId)

        request.onsuccess = () => {
          const record = request.result as
            | StoredWarDismissalRecord
            | undefined
          resolve(
            record &&
              record.userId === userId &&
              validId(record.dismissedWarId)
              ? record.dismissedWarId
              : null,
          )
        }
        request.onerror = () =>
          reject(
            request.error ??
              new Error('War dismissal could not be loaded.'),
          )
      })
    },

    async save(userId, warId) {
      if (!validId(userId) || !validId(warId)) {
        throw new Error('Valid user and war IDs are required.')
      }

      const db = await database()
      const record: StoredWarDismissalRecord = {
        userId,
        dismissedWarId: warId,
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
              new Error('War dismissal could not be saved.'),
          )
        transaction.onabort = () =>
          reject(
            transaction.error ??
              new Error('War dismissal save was aborted.'),
          )
      })
    },
  }
}
