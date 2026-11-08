import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startUsageDiagnostics } from '../app/usage-diagnostics'

let visibility = 'visible'
const stops: (() => void)[] = []
const fetcher = vi.fn<typeof fetch>()
const messages = () => fetcher.mock.calls.map((call) => JSON.parse(call[1]?.body as string) as {
  playerId: number; sessionId: string; sequence: number; visibleMs: number
})
const changeVisibility = (value: string) => {
  visibility = value
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-11-08T12:00:00Z'))
  localStorage.clear()
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility as DocumentVisibilityState)
  fetcher.mockReset().mockResolvedValue(new Response(null, { status: 204 }))
})
afterEach(async () => {
  stops.splice(0).forEach((stop) => stop())
  await vi.advanceTimersByTimeAsync(0)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('private usage diagnostics', () => {
  it('sends only the allowlisted diagnostic fields once per visible minute', () => {
    stops.push(startUsageDiagnostics(123, fetcher))
    expect(messages()).toEqual([{ playerId: 123, sessionId: expect.any(String), sequence: 1, visibleMs: 0 }])
    vi.advanceTimersByTime(60_000)
    expect(messages()).toHaveLength(2)
    expect(messages()[1].visibleMs).toBe(60_000)
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true })
  })

  it('does not report before visibility, counts no hidden time, and stops on disconnect', () => {
    visibility = 'hidden'
    const stop = startUsageDiagnostics(123, fetcher)
    vi.advanceTimersByTime(60_000)
    expect(fetcher).not.toHaveBeenCalled()
    changeVisibility('visible')
    vi.advanceTimersByTime(30_000)
    changeVisibility('hidden')
    const total = messages().at(-1)!.visibleMs
    vi.advanceTimersByTime(120_000)
    expect(messages().at(-1)!.visibleMs).toBe(total)
    stop()
    const calls = fetcher.mock.calls.length
    vi.advanceTimersByTime(60_000)
    expect(fetcher).toHaveBeenCalledTimes(calls)
  })

  it('reuses a visit across reloads and deduplicates overlapping tabs', () => {
    const first = startUsageDiagnostics(123, fetcher)
    stops.push(startUsageDiagnostics(123, fetcher))
    vi.advanceTimersByTime(60_000)
    const sessionId = messages()[0].sessionId
    expect(messages().at(-1)!.visibleMs).toBe(60_000)
    first()
    stops.push(startUsageDiagnostics(123, fetcher))
    vi.advanceTimersByTime(60_000)
    expect(new Set(messages().map((item) => item.sessionId))).toEqual(new Set([sessionId]))
    expect(messages().at(-1)!.visibleMs).toBe(120_000)
  })

  it('serializes visible tabs with Web Locks when available', async () => {
    let queue = Promise.resolve()
    const request = vi.fn((_name: string, work: () => void) => {
      queue = queue.then(work)
      return queue
    })
    vi.stubGlobal('navigator', { locks: { request } })
    stops.push(startUsageDiagnostics(123, fetcher), startUsageDiagnostics(123, fetcher))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(request).toHaveBeenCalled()
    expect(messages()).toHaveLength(2)
    expect(messages().at(-1)!.visibleMs).toBe(60_000)
  })

  it('starts a new session after 30 minutes without visible use and separates players', () => {
    stops.push(startUsageDiagnostics(123, fetcher))
    const session = messages()[0].sessionId
    changeVisibility('hidden')
    vi.advanceTimersByTime(31 * 60_000)
    changeVisibility('visible')
    vi.advanceTimersByTime(5_000)
    expect(messages().at(-1)!.sessionId).not.toBe(session)
    stops.push(startUsageDiagnostics(456, fetcher))
    expect(messages().at(-1)!.playerId).toBe(456)
    expect(messages().at(-1)!.visibleMs).toBe(0)
  })

  it('excludes device sleep and pagehide gaps, then resumes after pageshow', () => {
    stops.push(startUsageDiagnostics(123, fetcher))
    vi.setSystemTime(Date.now() + 20 * 60_000)
    vi.spyOn(performance, 'now').mockReturnValue(20 * 60_000)
    changeVisibility('hidden')
    expect(messages().at(-1)!.visibleMs).toBe(0)
    changeVisibility('visible')
    window.dispatchEvent(new Event('pagehide'))
    const calls = fetcher.mock.calls.length
    vi.advanceTimersByTime(60_000)
    expect(fetcher).toHaveBeenCalledTimes(calls)
    window.dispatchEvent(new Event('pageshow'))
    vi.advanceTimersByTime(60_000)
    expect(fetcher.mock.calls.length).toBeGreaterThan(calls)
  })

  it('tolerates unavailable storage and network failures without retries', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    fetcher.mockRejectedValue(new Error('offline'))
    stops.push(startUsageDiagnostics(123, fetcher))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(messages()).toHaveLength(2)
    expect(messages()[1].sessionId).toBe(messages()[0].sessionId)
    expect(messages()[1].visibleMs).toBe(60_000)
  })
})
