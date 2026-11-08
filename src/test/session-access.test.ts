import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HonjinSession, REVOCATION_PREFIX } from '../app/session'
import { MEMBERSHIP_VALID_MS } from '../app/membership'
import { readStoredTornApiKey, storeTornApiKey } from '../security/api-key-storage'

const TEST_KEY = 'SYNTHETICKEY0001'
let faction: number | null
let profileFailure: number | null
let visibility: DocumentVisibilityState
const sessions: HonjinSession[] = []
let pendingProfile: Promise<Response> | null
const profile = () => ({ profile: {
  id: 7, name: 'SyntheticMember', level: 10, faction_id: faction,
  status: { state: 'Okay', description: 'Okay', details: null, until: null, plane_image_type: null },
  last_action: { status: 'Online', relative: 'now', timestamp: Math.floor(Date.now() / 1000) },
  life: { current: 100, maximum: 100 },
} })
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
const fetcher = vi.fn<typeof fetch>()
const requests = (part: string) => fetcher.mock.calls.filter(([url]) => String(url).includes(part)).length

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
  vi.setSystemTime(new Date('2026-11-08T12:00:00Z'))
  faction = 48572
  profileFailure = null
  pendingProfile = null
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  localStorage.clear(); sessionStorage.clear()
  fetcher.mockReset().mockImplementation(async (input) => {
    const url = new URL(String(input))
    if (url.pathname === '/v2/key/info') return json({ info: {
      user: { id: 7, company_id: 0 },
      selections: { user: ['basic', 'battlestats', 'property', 'attacks', 'hof'], faction: ['chain'] },
    } })
    if (url.pathname === '/v2/user/7/profile') {
      if (pendingProfile) return pendingProfile
      if (profileFailure) return json({ error: { code: profileFailure, error: 'Synthetic Torn failure' } })
      return json(profile())
    }
    if (url.pathname === '/v2/user/basic') return json({ profile: { id: 7, name: 'SyntheticMember' } })
    if (url.pathname === '/v2/user/battlestats') return json({ battlestats: { total: 100 } })
    if (url.pathname === '/v2/faction/48572/basic') return json({ basic: { id: 48572, name: 'SCATHE' } })
    if (url.pathname.endsWith('/search')) return json({ search: [] })
    if (url.hostname === 'ffscouter.com' || url.pathname === '/api/v1/check-key') return json({
      key: '[synthetic]', is_registered: true, registered_at: null, last_used: null, policy_version: null,
      policy_update_required: false, is_premium: false, premium_expires_at: null, faction_id: null,
      faction_premium_expires_at: null, premium_entitlement_source: 'none', elimination_team: null,
    })
    return json({})
  })
})
afterEach(() => { sessions.splice(0).forEach((session) => session.stop()); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

async function connected() {
  const session = new HonjinSession(null, { fetcher })
  sessions.push(session)
  session.start()
  await session.connect(TEST_KEY, 'device')
  expect(session.getSnapshot().phase).toBe('ready')
  await session.enter()
  return session
}
async function due() { await vi.advanceTimersByTimeAsync(MEMBERSHIP_VALID_MS - 30_000) }
function foreground() {
  visibility = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
}

describe('SCATHE session boundary', () => {
  it.each(['default', 'injected'])('restores a valid member using a browser-branded %s fetch and enters operations', async (source) => {
    // Browser fetch rejects arbitrary object receivers; ordinary vi.fn/Node
    // fetch doubles missed the production this.fetcher(...) regression.
    const browserFetch: typeof fetch = function (this: unknown, input, init) {
      if (this !== globalThis) throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation")
      return fetcher(input, init)
    }
    vi.stubGlobal('fetch', browserFetch)
    storeTornApiKey(TEST_KEY, 'device')
    const session = source === 'default' ? new HonjinSession() : new HonjinSession(readStoredTornApiKey(), { fetcher: browserFetch })
    sessions.push(session)
    expect(session.getSnapshot()).toMatchObject({ phase: 'connecting', runtime: null, entered: false })
    session.start()
    await vi.waitFor(() => expect(session.getSnapshot().phase).toBe('ready'))
    expect(session.getSnapshot()).toMatchObject({ entered: true, connection: { user: { id: 7, faction: { id: 48572 } } } })
    const tornCalls = fetcher.mock.calls.filter(([input]) => new URL(String(input)).hostname === 'api.torn.com')
    expect(tornCalls.map(([input]) => new URL(String(input)).pathname).slice(0, 2)).toEqual(['/v2/key/info', '/v2/user/7/profile'])
    expect(tornCalls).toHaveLength(9)
    for (const [input, init] of tornCalls) {
      expect(new URL(String(input)).searchParams.has('key')).toBe(false)
      expect(new Headers(init?.headers).get('Authorization')).toBe(`ApiKey ${TEST_KEY}`)
      expect(init?.signal?.aborted).toBe(false)
    }
    await expect(session.getSnapshot().runtime!.searchPlayers('SyntheticTarget')).resolves.toEqual([])
    await session.verify()
    expect(session.getSnapshot()).toMatchObject({ phase: 'ready', entered: true })
    expect(readStoredTornApiKey()?.apiKey).toBe(TEST_KEY)
  })

  it('validates a member with no faction AA key-info field and persists only after validation', async () => {
    const session = await connected()
    expect(session.getSnapshot()).toMatchObject({ entered: true, connection: { user: { id: 7, faction: { id: 48572 } } } })
    expect(readStoredTornApiKey()?.apiKey).toBe(TEST_KEY)
    expect(requests('/user/7/profile')).toBe(1)
  })

  it.each([12345, null, 0])('refuses non-member faction %s before operational or FFScouter requests', async (id) => {
    faction = id
    const session = new HonjinSession(null, { fetcher }); sessions.push(session); session.start()
    await session.connect(TEST_KEY, 'device')
    expect(session.getSnapshot()).toMatchObject({ phase: 'denied', connection: null, runtime: null, entered: false })
    expect(readStoredTornApiKey()).toBeNull()
    expect(requests('faction/')).toBe(0)
    expect(requests('battlestats')).toBe(0)
    expect(requests('ffscouter')).toBe(0)
  })

  it('requires fresh authoritative evidence on remembered restoration and reload', async () => {
    const first = await connected()
    first.stop()
    let finish: (response: Response) => void = () => {}
    pendingProfile = new Promise((resolve) => { finish = resolve })
    const restored = new HonjinSession(readStoredTornApiKey(), { fetcher }); sessions.push(restored)
    expect(restored.getSnapshot()).toMatchObject({ phase: 'connecting', runtime: null, entered: false, connection: null })
    restored.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(restored.getSnapshot().runtime).toBeNull()
    faction = null
    finish(json(profile()))
    await vi.advanceTimersByTimeAsync(0)
    expect(restored.getSnapshot().phase).toBe('denied')
    expect(readStoredTornApiKey()).toBeNull()
  })

  it('revokes confirmed departure, cancels further operations and clears both credential stores', async () => {
    const session = await connected()
    const old = session.getSnapshot()
    sessionStorage.setItem('scathe-honjin:torn-api-key', TEST_KEY)
    faction = 12345
    await due()
    expect(session.getSnapshot()).toMatchObject({ phase: 'denied', connection: null, runtime: null, transport: null, entered: false })
    expect(sessionStorage.getItem('scathe-honjin:torn-api-key')).toBeNull()
    expect(localStorage.getItem('scathe-honjin:torn-api-key')).toBeNull()
    const count = fetcher.mock.calls.length
    await expect(old.runtime!.searchPlayers('someone')).rejects.toBeTruthy()
    await expect(old.transport!('https://scathe-honjin-intel.example/v1/watch')).rejects.toBeTruthy()
    await session.enter()
    foreground()
    expect(session.getSnapshot().phase).toBe('denied')
    expect(fetcher.mock.calls).toHaveLength(count)
  })

  it.each([5, 9, 13, 16, 17, 18])('retains a valid member key on temporary/permission error %s and retries safely', async (code) => {
    const session = await connected()
    profileFailure = code
    await due()
    // Still-fresh evidence is valid only until its original deadline.
    expect(session.getSnapshot().phase).toBe('ready')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(session.getSnapshot()).toMatchObject({ phase: 'unavailable', connection: null, runtime: null, entered: false })
    expect(readStoredTornApiKey()?.apiKey).toBe(TEST_KEY)
    const infoCount = requests('/key/info')
    profileFailure = null
    await session.retry(TEST_KEY, 'device')
    expect(session.getSnapshot()).toMatchObject({ phase: 'ready', entered: true })
    expect(requests('/key/info')).toBe(infoCount)
  })

  it('revokes an incorrect/deleted key without interpreting temporary key suspension as departure', async () => {
    const session = await connected()
    profileFailure = 2
    await due()
    expect(session.getSnapshot()).toMatchObject({ phase: 'denied', runtime: null, connection: null })
    expect(readStoredTornApiKey()).toBeNull()
  })

  it('revalidates promptly on a due foreground/PWA return, without duplicate checks', async () => {
    const session = await connected()
    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pagehide'))
    expect(session.getSnapshot().runtime).toBeNull()
    await vi.advanceTimersByTimeAsync(MEMBERSHIP_VALID_MS + 1000)
    const previous = requests('/user/7/profile')
    let finish: (response: Response) => void = () => {}
    pendingProfile = new Promise((resolve) => { finish = resolve })
    foreground(); foreground()
    const one = session.verify(), two = session.verify()
    expect(one).toBe(two)
    expect(session.getSnapshot().runtime).toBeNull()
    await vi.advanceTimersByTimeAsync(0)
    expect(requests('/user/7/profile')).toBe(previous + 1)
    finish(json(profile()))
    await one
    expect(session.getSnapshot()).toMatchObject({ phase: 'ready', entered: true })
  })

  it('does not poll hidden pages and reuses fresh evidence on a short foreground return', async () => {
    const session = await connected()
    const count = requests('/user/7/profile')
    visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(60_000)
    foreground()
    expect(requests('/user/7/profile')).toBe(count)
    expect(session.getSnapshot().phase).toBe('ready')
    visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(MEMBERSHIP_VALID_MS)
    expect(requests('/user/7/profile')).toBe(count)
    expect(session.getSnapshot().runtime).toBeNull()
  })

  it('reuses current own-profile intelligence as membership evidence instead of duplicating it', async () => {
    const session = await connected()
    await vi.advanceTimersByTimeAsync(14 * 60_000)
    await session.getSnapshot().runtime!.loadPlayerRecon(7)
    const count = requests('/user/7/profile')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(requests('/user/7/profile')).toBe(count)
    expect(session.getSnapshot().phase).toBe('ready')
    faction = null
    await vi.advanceTimersByTimeAsync(31_000)
    await expect(session.getSnapshot().runtime!.loadPlayerRecon(7)).rejects.toBeTruthy()
    expect(session.getSnapshot().phase).toBe('denied')
  })

  it('cannot restore a revoked session from a late membership or operational response', async () => {
    const session = await connected()
    const old = session.getSnapshot()
    let finish: (response: Response) => void = () => {}
    pendingProfile = new Promise((resolve) => { finish = resolve })
    const checking = session.verify()
    await vi.advanceTimersByTimeAsync(0)
    const key = REVOCATION_PREFIX + 7
    vi.setSystemTime(Date.now() + 1000)
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), invalidKey: false }))
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify({ at: Date.now(), invalidKey: false }) }))
    expect(session.getSnapshot().phase).toBe('denied')
    faction = 48572
    finish(json(profile()))
    await checking
    session.updateConnection(() => old.connection, old.connection)
    await session.enter()
    expect(session.getSnapshot()).toMatchObject({ phase: 'denied', runtime: null, connection: null, entered: false })
    expect(readStoredTornApiKey()).toBeNull()
  })

  it('does not persist a late connection response after disconnect, but allows an authoritative rejoin', async () => {
    const session = new HonjinSession(null, { fetcher }); sessions.push(session); session.start()
    let finish: (response: Response) => void = () => {}
    pendingProfile = new Promise((resolve) => { finish = resolve })
    const connecting = session.connect(TEST_KEY, 'device')
    await vi.advanceTimersByTimeAsync(0)
    session.disconnect()
    finish(json(profile()))
    await connecting
    expect(session.getSnapshot().connection).toBeNull()
    expect(readStoredTornApiKey()).toBeNull()
    pendingProfile = null
    await session.connect(TEST_KEY, 'device')
    expect(session.getSnapshot().phase).toBe('ready')
  })

  it('ignores an old operational response body even after a new verified session is connected', async () => {
    const session = await connected()
    let finishBody: (value: string) => void = () => {}
    const response = json(profile())
    vi.spyOn(response, 'text').mockReturnValue(new Promise((resolve) => { finishBody = resolve }))
    fetcher.mockResolvedValueOnce(response)
    const old = session.getSnapshot().runtime!.loadPlayerRecon(7)
    const ignored = expect(old).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(0)
    session.disconnect()
    await ignored
    await session.connect(TEST_KEY, 'device')
    faction = null
    finishBody(JSON.stringify(profile()))
    await vi.advanceTimersByTimeAsync(0)
    expect(session.getSnapshot().phase).toBe('ready')
    expect(readStoredTornApiKey()?.apiKey).toBe(TEST_KEY)
  })

  it('bounds hanging checks and does not let stale evidence grant unlimited access', async () => {
    const session = await connected()
    pendingProfile = new Promise(() => {})
    await due()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(session.getSnapshot()).toMatchObject({ phase: 'unavailable', runtime: null })
    expect(readStoredTornApiKey()?.apiKey).toBe(TEST_KEY)
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(requests('/user/7/profile')).toBe(2)
  })

  it('keeps credentials on an offline membership check and permits a confirmed rejoin after revocation', async () => {
    const session = await connected()
    fetcher.mockRejectedValueOnce(new TypeError('Synthetic offline failure'))
    await due()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(session.getSnapshot().phase).toBe('unavailable')
    expect(readStoredTornApiKey()?.apiKey).toBe(TEST_KEY)
    faction = null
    await session.retry(TEST_KEY, 'device')
    expect(session.getSnapshot().phase).toBe('denied')
    expect(readStoredTornApiKey()).toBeNull()
    faction = 48572
    vi.setSystemTime(Date.now() + 1000)
    await session.connect(TEST_KEY, 'device')
    await session.enter()
    expect(session.getSnapshot()).toMatchObject({ phase: 'ready', entered: true })
  })

  it('treats missing membership fields as unverifiable rather than confirmed faction departure', async () => {
    const session = await connected()
    fetcher.mockResolvedValueOnce(json({ profile: { id: 7 } }))
    await due()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(session.getSnapshot()).toMatchObject({ phase: 'unavailable', runtime: null })
    expect(readStoredTornApiKey()?.apiKey).toBe(TEST_KEY)
    await session.retry(TEST_KEY, 'device')
    expect(session.getSnapshot().phase).toBe('ready')
  })
})
