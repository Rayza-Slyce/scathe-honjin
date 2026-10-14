import type { AppScreen } from './AppShell'

/** One stroke weight and optical box across the five operational destinations. */
export default function NavigationIcon({ screen }: { screen: AppScreen }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {screen === 'war' && <><path d="m4 3 3 1 13 14-2 2L4 7zM3 17l4 4m-3-1 5-5M17 3l3 1-1 3-5 5m-5 2-4 4m12-3 4 4" /></>}
      {screen === 'targets' && <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></>}
      {screen === 'hospital' && <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />}
      {screen === 'travel' && <path d="m21 3-7 18-3-8-8-3 18-7ZM11 13l5-5" />}
      {screen === 'team' && <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" /></>}
    </svg>
  )
}
