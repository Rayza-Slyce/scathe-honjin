// Receives only an ID from the completed HONJIN connection, never a key/user object.
const ENDPOINT = 'https://scathe-honjin-intel.rayza-slyce.workers.dev/v1/usage'
const IDLE_MS = 30 * 60_000
const HEARTBEAT_MS = 60_000
const SAMPLE_MS = 5_000

interface Session {
  sessionId: string
  sequence: number
  visibleMs: number
  lastTick: number
  lastReport: number
}

export function startUsageDiagnostics(
  playerId: number,
  fetcher: typeof fetch = fetch,
): () => void {
  if (!Number.isSafeInteger(playerId) || playerId <= 0) return () => {}
  const key = `honjin:usage:v1:${playerId}`
  let memory: Session | null = null
  let stopped = false
  let suspended = false
  let visible = document.visibilityState === 'visible'
  let previous = performance.now()

  const read = (now: number): Session => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as Session | null
      if (parsed && /^[0-9a-f-]{36}$/.test(parsed.sessionId)
        && Number.isSafeInteger(parsed.sequence) && parsed.sequence >= 0
        && Number.isSafeInteger(parsed.visibleMs) && parsed.visibleMs >= 0
        && Number.isFinite(parsed.lastTick) && Number.isFinite(parsed.lastReport)
        && now >= parsed.lastTick && now - parsed.lastTick < IDLE_MS) return parsed
    } catch { /* Storage can be unavailable in private browsing. */ }
    if (memory && now >= memory.lastTick && now - memory.lastTick < IDLE_MS) return memory
    return { sessionId: crypto.randomUUID(), sequence: 0, visibleMs: 0, lastTick: now, lastReport: 0 }
  }

  const sample = (flush: boolean, wasVisible: boolean, elapsed: number) => {
    const work = () => {
      // Permit the final visible flush, but discard queued periodic work after disconnect.
      if (!wasVisible || (stopped && !flush)) return
      const now = Date.now()
      const session = read(now)
      // Shared wall-clock accounting deduplicates overlapping visible tabs. The
      // monotonic per-tab clock and cap exclude long device-sleep/timer gaps.
      session.visibleMs += elapsed > 15_000 ? 0 : Math.floor(Math.max(0, Math.min(elapsed, now - session.lastTick, 10_000)))
      session.lastTick = now
      const send = session.sequence === 0 || now - session.lastReport >= HEARTBEAT_MS || flush
      if (send) {
        session.sequence += 1
        session.lastReport = now
      }
      memory = session
      try { localStorage.setItem(key, JSON.stringify(session)) } catch { /* In-memory fallback. */ }
      if (!send) return
      // Loss is acceptable: no retries, offline queue, Torn calls, or UI errors.
      try {
        void fetcher(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          keepalive: true,
          signal: AbortSignal.timeout(5_000),
          body: JSON.stringify({ playerId, sessionId: session.sessionId, sequence: session.sequence, visibleMs: session.visibleMs }),
        }).catch(() => {})
      } catch { /* Diagnostics must never block HONJIN. */ }
    }
    // Web Locks serializes localStorage updates across same-origin tabs.
    if (navigator.locks) void navigator.locks.request(key, work).catch(() => {})
    else work()
  }

  const tick = (flush = false) => {
    const current = performance.now()
    const elapsed = current - previous
    previous = current
    sample(flush, visible, elapsed)
    visible = !suspended && document.visibilityState === 'visible'
  }
  const onVisibility = () => tick(true)
  const onPageHide = () => { tick(true); suspended = true; visible = false }
  const onPageShow = () => { suspended = false; previous = performance.now(); visible = document.visibilityState === 'visible'; tick() }
  tick()
  const timer = window.setInterval(() => { if (!stopped) tick() }, SAMPLE_MS)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('pageshow', onPageShow)
  return () => {
    stopped = true
    tick(true)
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('pageshow', onPageShow)
  }
}
