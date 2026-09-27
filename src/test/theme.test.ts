import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest'
import {
  applyThemePreference,
  persistThemePreference,
  readThemePreference,
  THEME_STORAGE_KEY,
} from '../theme/theme'

afterEach(() => {
  window.localStorage.removeItem(
    THEME_STORAGE_KEY,
  )
  document.documentElement.dataset.theme =
    'dark'
  document.documentElement.dataset.themePreference =
    'dark'
})

describe('theme preference', () => {
  it('defaults to dark when no valid preference is stored', () => {
    expect(readThemePreference()).toBe(
      'dark',
    )
  })

  it('treats the retired system preference as dark', () => {
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      'system',
    )

    expect(readThemePreference()).toBe(
      'dark',
    )
  })

  it('persists and applies light and dark explicitly', () => {
    persistThemePreference('light')
    expect(
      applyThemePreference(
        readThemePreference(),
      ),
    ).toBe('light')
    expect(
      document.documentElement.dataset.theme,
    ).toBe('light')

    persistThemePreference('dark')
    expect(
      applyThemePreference(
        readThemePreference(),
      ),
    ).toBe('dark')
    expect(
      document.documentElement.dataset.themePreference,
    ).toBe('dark')
  })
})
