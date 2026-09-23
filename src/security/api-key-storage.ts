import {
  isPlausibleTornApiKey,
  normaliseTornApiKey,
} from '../api/torn/client'

const TORN_KEY_STORAGE_KEY =
  'scathe-honjin:torn-api-key'

export type TornApiKeyPersistence =
  | 'session'
  | 'device'

export interface StoredTornApiKey {
  apiKey: string
  persistence: TornApiKeyPersistence
}

function readValidKey(
  storage: Storage,
): string | null {
  const value =
    storage.getItem(TORN_KEY_STORAGE_KEY)

  if (value === null) {
    return null
  }

  if (!isPlausibleTornApiKey(value)) {
    storage.removeItem(TORN_KEY_STORAGE_KEY)
    return null
  }

  return value
}

export function storeTornApiKey(
  apiKey: string,
  persistence: TornApiKeyPersistence,
  sessionStorageImpl: Storage =
    window.sessionStorage,
  localStorageImpl: Storage =
    window.localStorage,
): void {
  const key = normaliseTornApiKey(apiKey)

  sessionStorageImpl.removeItem(
    TORN_KEY_STORAGE_KEY,
  )

  localStorageImpl.removeItem(
    TORN_KEY_STORAGE_KEY,
  )

  if (persistence === 'device') {
    localStorageImpl.setItem(
      TORN_KEY_STORAGE_KEY,
      key,
    )
    return
  }

  sessionStorageImpl.setItem(
    TORN_KEY_STORAGE_KEY,
    key,
  )
}

export function readStoredTornApiKey(
  sessionStorageImpl: Storage =
    window.sessionStorage,
  localStorageImpl: Storage =
    window.localStorage,
): StoredTornApiKey | null {
  const remembered =
    readValidKey(localStorageImpl)

  if (remembered !== null) {
    return {
      apiKey: remembered,
      persistence: 'device',
    }
  }

  const session =
    readValidKey(sessionStorageImpl)

  if (session !== null) {
    return {
      apiKey: session,
      persistence: 'session',
    }
  }

  return null
}

export function clearStoredTornApiKey(
  sessionStorageImpl: Storage =
    window.sessionStorage,
  localStorageImpl: Storage =
    window.localStorage,
): void {
  sessionStorageImpl.removeItem(
    TORN_KEY_STORAGE_KEY,
  )

  localStorageImpl.removeItem(
    TORN_KEY_STORAGE_KEY,
  )
}
