import { describe, expect, it, vi } from 'vitest'
import {
  loadSharedActivitySummary,
  type SharedActivityCell,
} from '../api/honjin-intel/activity'

function emptyCell(): SharedActivityCell {
  return {
    activeCount: 0,
    inactiveCount: 0,
    knownCount: 0,
    totalCount: 0,
    sparse: true,
  }
}

function cells(): SharedActivityCell[][] {
  return Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, emptyCell),
  )
}

describe('shared activity intel', () => {
  it('loads and validates one bounded player activity summary', async () => {
    const activityCells = cells()
    activityCells[2][13] = {
      activeCount: 8,
      inactiveCount: 3,
      knownCount: 11,
      totalCount: 14,
      sparse: false,
    }

    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      expect(url.pathname).toBe('/v1/activity')
      expect(url.searchParams.get('ids')).toBe('3897061')

      return new Response(JSON.stringify({
        summaries: [{
          playerId: 3897061,
          windowStart: 1_780_000_000,
          windowEnd: 1_782_419_200,
          sampleCount: 14,
          knownSampleCount: 11,
          coveredHourCount: 1,
          lastObservedAt: 1_782_419_100,
          lastActiveObservedAt: 1_782_419_000,
          cells: activityCells,
          peakWindows: [{
            dayIndex: 2,
            hour: 13,
            activeCount: 8,
            inactiveCount: 3,
            knownCount: 11,
            totalCount: 14,
          }],
        }],
      }), { status: 200 })
    }) as unknown as typeof fetch

    const summary = await loadSharedActivitySummary(3897061, fetcher)

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(summary.playerId).toBe(3897061)
    expect(summary.cells[2][13]).toEqual(activityCells[2][13])
    expect(summary.peakWindows).toHaveLength(1)
  })

  it('rejects malformed activity grids instead of painting unsupported history', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      summaries: [{
        playerId: 7,
        windowStart: 1,
        windowEnd: 2,
        sampleCount: 0,
        knownSampleCount: 0,
        coveredHourCount: 0,
        lastObservedAt: null,
        lastActiveObservedAt: null,
        cells: [],
        peakWindows: [],
      }],
    }), { status: 200 })) as unknown as typeof fetch

    await expect(loadSharedActivitySummary(7, fetcher)).rejects.toThrow(
      'did not return the requested player',
    )
  })
})
