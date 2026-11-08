import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Onboarding from '../features/onboarding/Onboarding'
import { readStoredTornApiKey, storeTornApiKey } from '../security/api-key-storage'

// Keep the real onboarding, connection, session, coordinator and Torn client.
// Only the post-entry UI/telemetry are stubbed to isolate connection requests.
vi.mock('../features/shell/LiveAppShell', () => ({ default: () => <nav aria-label="Operational application">HONJIN WAR</nav> }))
vi.mock('../app/usage-diagnostics', () => ({ startUsageDiagnostics: () => () => {} }))

const TEST_KEY = 'SYNTHETICKEY0001'
const requests: string[] = []
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  sessionStorage.clear(); localStorage.clear(); requests.length = 0
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  const browserFetch: typeof fetch = async function (this: unknown, input, init) {
    if (this !== globalThis) throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation")
    const url = new URL(String(input))
    requests.push(url.pathname)
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    if (url.hostname === 'api.torn.com') {
      expect(new Headers(init?.headers).get('Authorization')).toBe(`ApiKey ${TEST_KEY}`)
      expect(url.searchParams.has('key')).toBe(false)
    }
    switch (url.pathname) {
      case '/v2/key/info': return json({ info: { user: { id: 7, company_id: 0 }, selections: { user: ['basic', 'battlestats', 'property', 'attacks', 'hof'], faction: ['chain'] } } })
      case '/v2/user/7/profile': return json({ profile: {
        id: 7, name: 'SyntheticMember', faction_id: 48572, level: 10,
        status: { state: 'Okay', description: 'Okay', details: null, until: null, plane_image_type: null },
        last_action: { status: 'Online', relative: 'now', timestamp: Math.floor(Date.now() / 1000) }, life: { current: 100, maximum: 100 },
      } })
      case '/v2/faction/48572/wars': case '/v2/faction/48572/members': return json({})
      case '/v2/user/basic': return json({ profile: { id: 7, name: 'SyntheticMember' } })
      case '/v2/user/battlestats': return json({ battlestats: { total: 100 } })
      case '/v2/faction/48572/basic': return json({ basic: { id: 48572, name: 'SCATHE' } })
      case '/v2/user/search': case '/v2/faction/search': return json({ search: [] })
      case '/api/v1/check-key': return json({ is_registered: true, policy_update_required: false })
      default: throw new Error(`Unexpected synthetic request path: ${url.pathname}`)
    }
  }
  vi.stubGlobal('fetch', browserFetch)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('browser fetch connection regression', () => {
  it.each(['manual', 'remembered', 'remembered-strict'])(
    'connects a valid member through actual %s onboarding and enters operations', async (mode) => {
      if (mode !== 'manual') storeTornApiKey(TEST_KEY, 'device')
      render(mode === 'remembered-strict' ? <StrictMode><Onboarding /></StrictMode> : <Onboarding />)
      expect(screen.queryByRole('navigation', { name: 'Operational application' })).not.toBeInTheDocument()
      if (mode === 'manual') {
        fireEvent.change(screen.getByLabelText('Torn API key'), { target: { value: TEST_KEY } })
        fireEvent.click(screen.getByRole('button', { name: 'CONNECT' }))
        await screen.findByText('SyntheticMember')
        expect(screen.queryByRole('navigation', { name: 'Operational application' })).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'ENTER HONJIN' }))
      }
      await waitFor(() => expect(screen.getByRole('navigation', { name: 'Operational application' })).toBeInTheDocument())
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(requests[0]).toBe('/v2/key/info')
      expect(requests.filter((path) => path === '/v2/user/7/profile')).toHaveLength(1)
      expect(requests).toContain('/api/v1/check-key')
      expect(readStoredTornApiKey()?.apiKey).toBe(TEST_KEY)
    },
  )
})
