import { describe, expect, it, vi } from 'vitest'
import { registerSharedWatchInterest } from '../api/honjin-intel/watch'

describe('shared watch registration client', () => {
  it('posts deduplicated player and faction interest without any Torn credential', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('POST')
      expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(JSON.parse(String(init?.body))).toEqual({
        players: [
          { playerId: 101, factionId: 9001 },
          { playerId: 102, factionId: null },
        ],
        factionIds: [9001],
      })
      expect(String(init?.body)).not.toMatch(/api.?key|torn.?key|authorization/i)
      return new Response(JSON.stringify({ accepted: true }), { status: 202 })
    }) as unknown as typeof fetch

    await registerSharedWatchInterest({
      players: [
        { playerId: 101, factionId: 9001 },
        { playerId: 101, factionId: 9001 },
        { playerId: 102, factionId: null },
      ],
      factionIds: [9001, 9001],
    }, fetcher)

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('does nothing for empty or invalid interest', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch
    await registerSharedWatchInterest({
      players: [{ playerId: -1, factionId: null }],
      factionIds: [0],
    }, fetcher)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reports facade registration failures without exposing response details', async () => {
    const fetcher = vi.fn(async () => new Response('full', { status: 429 })) as unknown as typeof fetch
    await expect(
      registerSharedWatchInterest({ factionIds: [9001] }, fetcher),
    ).rejects.toThrow('Shared watch registration returned HTTP 429.')
  })
})
