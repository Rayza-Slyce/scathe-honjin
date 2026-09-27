export type ThemePreference =
  | 'dark'
  | 'light'

export const THEME_STORAGE_KEY =
  'scathe-honjin-theme'

const LIGHT_THEME_COLOR = '#d9dde2'
const DARK_THEME_COLOR = '#090a0c'

export function isThemePreference(
  value: unknown,
): value is ThemePreference {
  return value === 'dark' || value === 'light'
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(
      THEME_STORAGE_KEY,
    )

    return isThemePreference(stored)
      ? stored
      : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyThemePreference(
  preference: ThemePreference,
): ThemePreference {
  const root = document.documentElement

  root.dataset.theme = preference
  root.dataset.themePreference = preference

  const themeColor = document.querySelector(
    'meta[name="theme-color"]',
  )

  themeColor?.setAttribute(
    'content',
    preference === 'light'
      ? LIGHT_THEME_COLOR
      : DARK_THEME_COLOR,
  )

  return preference
}

export function persistThemePreference(
  preference: ThemePreference,
) {
  try {
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      preference,
    )
  } catch {
    // Theme persistence is optional; the active theme still applies.
  }
}
