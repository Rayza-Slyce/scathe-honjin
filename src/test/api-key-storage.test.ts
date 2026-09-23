import {
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import {
  clearStoredTornApiKey,
  readStoredTornApiKey,
  storeTornApiKey,
} from '../security/api-key-storage'

const TEST_KEY = '1234567890ABCDEF'
const STORAGE_KEY =
  'scathe-honjin:torn-api-key'

describe('Torn API key browser storage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('uses sessionStorage when remember-device is not selected', () => {
    storeTornApiKey(
      TEST_KEY,
      'session',
    )

    expect(
      readStoredTornApiKey(),
    ).toEqual({
      apiKey: TEST_KEY,
      persistence: 'session',
    })

    expect(sessionStorage.length).toBe(1)
    expect(localStorage.length).toBe(0)
  })

  it('persists the key when the device is remembered', () => {
    storeTornApiKey(
      TEST_KEY,
      'device',
    )

    expect(
      readStoredTornApiKey(),
    ).toEqual({
      apiKey: TEST_KEY,
      persistence: 'device',
    })

    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(1)
  })

  it('keeps a remembered key after session state is cleared', () => {
    storeTornApiKey(
      TEST_KEY,
      'device',
    )

    sessionStorage.clear()

    expect(
      readStoredTornApiKey(),
    ).toEqual({
      apiKey: TEST_KEY,
      persistence: 'device',
    })
  })

  it('switching to session mode removes the persistent copy', () => {
    storeTornApiKey(
      TEST_KEY,
      'device',
    )

    storeTornApiKey(
      TEST_KEY,
      'session',
    )

    expect(
      localStorage.getItem(STORAGE_KEY),
    ).toBeNull()

    expect(
      sessionStorage.getItem(STORAGE_KEY),
    ).toBe(TEST_KEY)
  })

  it('disconnect clears both storage locations', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      TEST_KEY,
    )

    localStorage.setItem(
      STORAGE_KEY,
      TEST_KEY,
    )

    clearStoredTornApiKey()

    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it('removes malformed remembered values', () => {
    localStorage.setItem(
      STORAGE_KEY,
      'invalid',
    )

    expect(
      readStoredTornApiKey(),
    ).toBeNull()

    expect(localStorage.length).toBe(0)
  })
})
