import { useState } from 'react'
import {
  applyThemePreference,
  persistThemePreference,
  readThemePreference,
  type ThemePreference,
} from './theme'

interface ThemeControlProps {
  className?: string
}

export default function ThemeControl({
  className = '',
}: ThemeControlProps) {
  const [preference, setPreference] =
    useState<ThemePreference>(() =>
      readThemePreference(),
    )

  const nextPreference: ThemePreference =
    preference === 'dark'
      ? 'light'
      : 'dark'

  function toggleTheme() {
    setPreference(nextPreference)
    persistThemePreference(nextPreference)
    applyThemePreference(nextPreference)
  }

  return (
    <button
      type="button"
      className={`theme-toggle ${
        preference === 'light'
          ? 'theme-toggle--light'
          : 'theme-toggle--dark'
      } ${className}`.trim()}
      role="switch"
      aria-label={`Switch to ${nextPreference} mode`}
      aria-checked={preference === 'light'}
      title={`Switch to ${nextPreference} mode`}
      onClick={toggleTheme}
    >
      <span className="theme-toggle__moon" aria-hidden="true">☾</span>
      <span className="theme-toggle__sun" aria-hidden="true">☀</span>
      <span className="theme-toggle__thumb" aria-hidden="true" />
    </button>
  )
}
