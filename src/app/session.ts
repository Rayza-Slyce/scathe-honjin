import { connectHonjin, type HonjinConnection, type VerifiedHonjinConnection } from './connect'
import { RequestCoordinator } from './request-coordinator'
import { createHonjinRuntime, type HonjinRuntime } from './runtime'
import { assertScatheProfile, isInvalidTornKey, MembershipDeniedError, MEMBERSHIP_VALID_MS, SCATHE_FACTION_ID } from './membership'
import { fetchUserProfile } from '../api/torn/recon'
import { normaliseTornUserProfile } from '../api/torn/normalise'
import { FFSCOUTER_STATS_RATE_LIMIT } from '../api/ffscouter/stats'
import { clearStoredTornApiKey, readStoredTornApiKey, storeTornApiKey, type StoredTornApiKey, type TornApiKeyPersistence } from '../security/api-key-storage'
import type { PlayerReconSnapshot } from '../types'

export const REVOCATION_PREFIX = 'scathe-honjin:membership-revoked:'
const RETRY_MESSAGE = 'Current SCATHE membership could not be verified. Your key has been kept. Retry verification when Torn is available.'
const INVALID_KEY_MESSAGE = 'Torn reports that this API key is no longer valid. Reconnect with a valid key to verify current SCATHE membership.'
type Phase = 'idle' | 'connecting' | 'ready' | 'verifying' | 'unavailable' | 'denied'
interface SessionState {
  phase: Phase
  connection: HonjinConnection | null
  runtime: HonjinRuntime | null
  transport: typeof fetch | null
  entered: boolean
  error: unknown
}
const empty = (phase: Phase, error: unknown = null): SessionState => ({ phase, connection: null, runtime: null, transport: null, entered: false, error })

export class HonjinSession {
  private state: SessionState
  private readonly listeners = new Set<() => void>()
  private readonly coordinator: RequestCoordinator
  private readonly fetcher: typeof fetch
  private readonly now: () => number
  private credentials: StoredTornApiKey | null
  private member: VerifiedHonjinConnection | null = null
  private verifiedAt = 0
  private epoch = 0
  private authAbort = new AbortController()
  private operational: { runtime: HonjinRuntime; transport: typeof fetch; abort: AbortController } | null = null
  private pending: Promise<void> | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private pageHidden = false
  private failed = false
  private wantsEntry = false
  private onForget: (() => void) | null = null

  constructor(initial: StoredTornApiKey | null = readStoredTornApiKey(), options: {
    fetcher?: typeof fetch; now?: () => number
  } = {}) {
    this.credentials = initial
    this.state = empty(initial ? 'connecting' : 'idle')
    // Native browser fetch must keep its Window/global receiver, not this session.
    this.fetcher = (options.fetcher ?? fetch).bind(globalThis)
    this.now = options.now ?? Date.now
    this.coordinator = new RequestCoordinator({
      now: this.now,
      budgets: { ffscouter: { maxRequestsPerMinute: FFSCOUTER_STATS_RATE_LIMIT } },
      onError: (error) => { if (isInvalidTornKey(error)) this.revoke(true) },
    })
  }

  getSnapshot = (): SessionState => this.state
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  initialKey = (): string => this.credentials?.apiKey ?? ''
  remembered = (): boolean => this.credentials?.persistence === 'device'
  private fresh = () => this.now() >= this.verifiedAt && this.now() - this.verifiedAt < MEMBERSHIP_VALID_MS
  private profileKey = () => `torn:user:${this.member?.user.id}:profile`
  private publish(state: SessionState) { this.state = state; for (const listener of this.listeners) listener() }

  private transport(signal: AbortSignal, allowed: () => void): typeof fetch {
    return async (input, init) => {
      allowed(); signal.throwIfAborted()
      // A session signal also cancels response-body reads after fetch resolves.
      const response = await this.fetcher(input, { ...init, signal })
      signal.throwIfAborted(); allowed()
      return response
    }
  }

  private closeOperational() {
    this.operational?.abort.abort()
    this.operational = null
    const identityKey = this.profileKey()
    this.coordinator.cancelRequests((key) => key !== identityKey)
  }

  private block(phase: 'verifying' | 'unavailable', error: unknown = null) {
    this.closeOperational()
    this.publish(empty(phase, error))
  }

  private ready() {
    if (!this.member || !this.fresh() || this.pageHidden) return
    if (!this.operational) {
      const abort = new AbortController()
      const epoch = this.epoch
      const transport = this.transport(abort.signal, () => {
        if (!this.fresh() && this.state.phase === 'ready') {
          this.block('verifying')
          if (document.visibilityState !== 'hidden') void this.verify()
        }
        if (this.state.phase !== 'ready' || !this.fresh()) throw new DOMException('Membership verification required.', 'AbortError')
      })
      const runtime = createHonjinRuntime(this.credentials!.apiKey, {
        coordinator: this.coordinator, fetchImpl: transport, now: this.now,
        onPlayerProfile: (response, at) => {
          if (abort.signal.aborted || epoch !== this.epoch) throw new DOMException('Session response cancelled.', 'AbortError')
          if (response?.profile?.id !== this.member?.user.id) return
          try { assertScatheProfile(response, this.member.user.id) } catch (error) {
            if (error instanceof MembershipDeniedError) this.revoke(false)
            else this.block('unavailable', new Error(RETRY_MESSAGE))
            throw error
          }
          // Existing fresh own-profile reads extend evidence without a second poll.
          this.verifiedAt = at * 1000
          this.failed = false
          this.arm()
        },
      })
      this.operational = { abort, transport, runtime }
    }
    this.publish({ phase: 'ready', connection: this.member, ...this.operational, entered: this.wantsEntry, error: null })
  }

  private clearTimer() { if (this.timer !== null) clearTimeout(this.timer); this.timer = null }
  private arm() {
    this.clearTimer()
    if (!this.running || !this.member) return
    const remaining = this.verifiedAt + MEMBERSHIP_VALID_MS - this.now()
    if (remaining <= 0) return
    const canCheck = !this.failed && !this.pending && !this.pageHidden && document.visibilityState !== 'hidden'
    this.timer = setTimeout(() => {
      this.timer = null
      if (!this.fresh()) this.block(this.failed ? 'unavailable' : 'verifying', this.failed ? new Error(RETRY_MESSAGE) : null)
      if (!this.failed && !this.pageHidden && document.visibilityState !== 'hidden') void this.verify()
    }, canCheck ? Math.max(0, remaining - 30_000) : remaining)
  }

  start(onForget: (() => void) | null = null) {
    this.onForget = onForget
    this.running = true
    window.addEventListener('pagehide', this.onPageHide, true)
    window.addEventListener('pageshow', this.onPageShow, true)
    window.addEventListener('storage', this.onStorage)
    document.addEventListener('visibilitychange', this.onVisibility, true)
    if (this.credentials && !this.member) void this.connect(this.credentials.apiKey, this.credentials.persistence, true)
  }
  stop() {
    this.running = false
    this.cancel()
    this.member = null
    this.publish(empty('idle'))
    window.removeEventListener('pagehide', this.onPageHide, true)
    window.removeEventListener('pageshow', this.onPageShow, true)
    window.removeEventListener('storage', this.onStorage)
    document.removeEventListener('visibilitychange', this.onVisibility, true)
    this.onForget = null
  }

  private cancel() {
    this.epoch += 1
    this.clearTimer()
    this.authAbort.abort()
    this.authAbort = new AbortController()
    this.operational?.abort.abort()
    this.operational?.runtime.clearCache()
    this.operational = null
    this.coordinator.cancelRequests()
    this.coordinator.clearCache()
    this.pending = null
  }

  async connect(apiKey: string, persistence: TornApiKeyPersistence, restore = false): Promise<void> {
    this.cancel()
    const epoch = this.epoch
    this.member = null
    this.wantsEntry = false
    this.credentials = { apiKey: apiKey.trim(), persistence }
    this.publish(empty('connecting'))
    const raw = this.transport(this.authAbort.signal, () => { if (this.epoch !== epoch) throw new DOMException('Connection cancelled.', 'AbortError') })
    const scheduled: typeof fetch = async (input, init) => {
      const url = new URL(String(input))
      const response = await this.coordinator.request({
        key: `connect:${url.origin}${url.pathname}${url.search}`, priority: 'explicit',
        ...(url.hostname === 'api.torn.com' ? {} : { budget: 'ffscouter' }),
      }, () => raw(input, init))
      return response.clone()
    }
    try {
      const result = await connectHonjin(this.credentials.apiKey, persistence, scheduled, { signal: this.authAbort.signal, persist: false })
      if (epoch !== this.epoch) return
      if (!Number.isFinite(result.membershipVerifiedAt) || this.now() - result.membershipVerifiedAt >= MEMBERSHIP_VALID_MS) throw new Error(RETRY_MESSAGE)
      this.member = result
      this.verifiedAt = result.membershipVerifiedAt
      if (this.rejectRevokedEvidence()) return
      storeTornApiKey(this.credentials!.apiKey, persistence)
      this.failed = false
      this.wantsEntry = restore && result.ffscouter.status === 'registered'
      this.ready()
      this.arm()
    } catch (error) {
      if (epoch !== this.epoch) return
      if (error instanceof MembershipDeniedError || isInvalidTornKey(error)) this.revoke(isInvalidTornKey(error), true, error instanceof MembershipDeniedError ? error.playerId : undefined)
      else { this.failed = true; this.publish(empty('unavailable', error)) }
    }
  }

  retry(apiKey: string, persistence: TornApiKeyPersistence): Promise<void> {
    if (this.member && this.credentials?.apiKey === apiKey.trim() && this.credentials.persistence === persistence) return this.verify()
    return this.connect(apiKey, persistence)
  }

  verify = (): Promise<void> => {
    if (this.pending) return this.pending
    if (!this.member || !this.credentials) return Promise.resolve()
    const epoch = this.epoch
    const member = this.member
    const key = this.profileKey()
    const abort = new AbortController()
    const parent = this.authAbort.signal
    const cancel = () => abort.abort()
    parent.addEventListener('abort', cancel, { once: true })
    const timeout = setTimeout(() => { abort.abort(); this.coordinator.cancelRequests((value) => value === key) }, 15_000)
    const fetcher = this.transport(abort.signal, () => { if (epoch !== this.epoch) throw new DOMException('Verification cancelled.', 'AbortError') })
    if (!this.fresh()) this.block('verifying')
    const work = (async () => {
      try {
        const snapshot = await this.coordinator.request<PlayerReconSnapshot>({ key, priority: 'explicit', cacheMs: 30_000 }, async () => {
          const profile = await fetchUserProfile(member.user.id, this.credentials!.apiKey, fetcher)
          assertScatheProfile(profile, member.user.id)
          return normaliseTornUserProfile(profile, Math.floor(this.now() / 1000))
        })
        if (epoch !== this.epoch) return
        if (snapshot.player.id !== member.user.id) throw new Error(RETRY_MESSAGE)
        if (snapshot.factionId !== SCATHE_FACTION_ID) { this.revoke(false); return }
        this.verifiedAt = snapshot.observedAt * 1000
        this.failed = false
        if (this.rejectRevokedEvidence()) return
        this.ready()
      } catch (error) {
        if (epoch !== this.epoch) return
        if (error instanceof MembershipDeniedError || isInvalidTornKey(error)) this.revoke(isInvalidTornKey(error))
        else { this.failed = true; if (!this.fresh()) this.block('unavailable', new Error(RETRY_MESSAGE)) }
      } finally {
        clearTimeout(timeout)
        parent.removeEventListener('abort', cancel)
      }
    })()
    this.pending = work
    this.arm()
    void work.finally(() => {
      if (this.pending === work) this.pending = null
      if (epoch === this.epoch) this.arm()
    })
    return work
  }

  async enter() {
    const epoch = this.epoch
    if (!this.fresh()) await this.verify()
    if (epoch !== this.epoch || this.state.phase !== 'ready' || !this.fresh()) return
    this.wantsEntry = true
    this.ready()
  }
  updateConnection(update: (current: HonjinConnection | null) => HonjinConnection | null, expected: HonjinConnection | null) {
    if (this.state.phase !== 'ready' || !this.member || this.member !== expected) return
    const next = update(this.member)
    if (next) { this.member = { ...next, membershipVerifiedAt: this.verifiedAt }; this.ready() }
  }
  disconnect() { this.cancel(); this.credentials = null; this.member = null; this.wantsEntry = false; clearStoredTornApiKey(); this.publish(empty('idle')); this.onForget?.() }

  private rejectRevokedEvidence(): boolean {
    if (!this.member) return false
    try {
      const marker = JSON.parse(localStorage.getItem(REVOCATION_PREFIX + this.member.user.id) ?? 'null') as { at?: number; invalidKey?: boolean } | null
      if (marker && typeof marker.at === 'number' && typeof marker.invalidKey === 'boolean'
        && marker.at >= this.verifiedAt && marker.at <= this.now() + 1000) {
        this.revoke(marker.invalidKey, false)
        return true
      }
    } catch { /* A local marker can deny access, never establish membership. */ }
    return false
  }
  private revoke(invalidKey: boolean, broadcast = true, knownPlayerId?: number) {
    const playerId = this.member?.user.id ?? knownPlayerId
    this.cancel()
    this.credentials = null
    this.member = null
    this.wantsEntry = false
    clearStoredTornApiKey()
    if (broadcast && playerId) {
      try { localStorage.setItem(REVOCATION_PREFIX + playerId, JSON.stringify({ at: this.now(), invalidKey })) } catch { /* Other tabs revalidate independently if storage is blocked. */ }
    }
    this.publish(empty('denied', invalidKey ? new Error(INVALID_KEY_MESSAGE) : new MembershipDeniedError()))
    this.onForget?.()
  }
  private resume() {
    if (!this.member || this.pageHidden) return
    if (document.visibilityState === 'hidden') { this.arm(); return }
    if (this.rejectRevokedEvidence()) return
    if (!this.fresh()) { this.block('verifying'); void this.verify() }
    else { this.ready(); this.arm() }
  }
  private onVisibility = () => { if (document.visibilityState !== 'hidden') this.resume(); else this.arm() }
  private onPageHide = () => { this.pageHidden = true; if (this.member) this.block('verifying'); this.arm() }
  private onPageShow = () => { this.pageHidden = false; this.resume() }
  private onStorage = (event: StorageEvent) => { if (this.member && event.newValue && event.key === REVOCATION_PREFIX + this.member.user.id) this.rejectRevokedEvidence() }
}
