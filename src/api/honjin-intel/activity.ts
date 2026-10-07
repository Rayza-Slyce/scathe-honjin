import type { PlayerId } from '../../types'

export interface SharedActivityCell {
  activeCount: number
  inactiveCount: number
  knownCount: number
  totalCount: number
  sparse: boolean
}

export interface SharedActivityPeakWindow {
  dayIndex: number
  hour: number
  activeCount: number
  inactiveCount: number
  knownCount: number
  totalCount: number
}

export interface SharedActivitySummary {
  playerId: PlayerId
  windowStart: number
  windowEnd: number
  sampleCount: number
  knownSampleCount: number
  coveredHourCount: number
  lastObservedAt: number | null
  lastActiveObservedAt: number | null
  cells: readonly (readonly SharedActivityCell[])[]
  peakWindows: readonly SharedActivityPeakWindow[]
}

export type SharedActivitySummaryLoader = (
  playerId: PlayerId,
) => Promise<SharedActivitySummary>

const HONJIN_INTEL_BASE_URL =
  'https://scathe-honjin-intel.rayza-slyce.workers.dev'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : null
}

function epochOrNull(value: unknown): number | null {
  return value === null ? null : positiveInteger(value)
}

function normaliseCell(value: unknown): SharedActivityCell | null {
  if (!isRecord(value)) return null

  const activeCount = nonNegativeInteger(value.activeCount)
  const inactiveCount = nonNegativeInteger(value.inactiveCount)
  const knownCount = nonNegativeInteger(value.knownCount)
  const totalCount = nonNegativeInteger(value.totalCount)

  if (
    activeCount === null ||
    inactiveCount === null ||
    knownCount === null ||
    totalCount === null ||
    typeof value.sparse !== 'boolean' ||
    knownCount !== activeCount + inactiveCount ||
    totalCount < knownCount
  ) {
    return null
  }

  return {
    activeCount,
    inactiveCount,
    knownCount,
    totalCount,
    sparse: value.sparse,
  }
}

function normalisePeakWindow(value: unknown): SharedActivityPeakWindow | null {
  if (!isRecord(value)) return null

  const dayIndex = nonNegativeInteger(value.dayIndex)
  const hour = nonNegativeInteger(value.hour)
  const activeCount = nonNegativeInteger(value.activeCount)
  const inactiveCount = nonNegativeInteger(value.inactiveCount)
  const knownCount = nonNegativeInteger(value.knownCount)
  const totalCount = nonNegativeInteger(value.totalCount)

  if (
    dayIndex === null || dayIndex > 6 ||
    hour === null || hour > 23 ||
    activeCount === null ||
    inactiveCount === null ||
    knownCount === null ||
    totalCount === null ||
    knownCount !== activeCount + inactiveCount ||
    totalCount < knownCount
  ) {
    return null
  }

  return {
    dayIndex,
    hour,
    activeCount,
    inactiveCount,
    knownCount,
    totalCount,
  }
}

function normaliseSummary(value: unknown): SharedActivitySummary | null {
  if (!isRecord(value)) return null

  const playerId = positiveInteger(value.playerId)
  const windowStart = positiveInteger(value.windowStart)
  const windowEnd = positiveInteger(value.windowEnd)
  const sampleCount = nonNegativeInteger(value.sampleCount)
  const knownSampleCount = nonNegativeInteger(value.knownSampleCount)
  const coveredHourCount = nonNegativeInteger(value.coveredHourCount)

  if (
    playerId === null ||
    windowStart === null ||
    windowEnd === null ||
    windowEnd < windowStart ||
    sampleCount === null ||
    knownSampleCount === null ||
    knownSampleCount > sampleCount ||
    coveredHourCount === null ||
    !Array.isArray(value.cells) ||
    value.cells.length !== 7 ||
    !Array.isArray(value.peakWindows)
  ) {
    return null
  }

  const cells = value.cells.map((day) => {
    if (!Array.isArray(day) || day.length !== 24) return null
    const normalised = day.map(normaliseCell)
    return normalised.some((cell) => cell === null)
      ? null
      : normalised as SharedActivityCell[]
  })
  if (cells.some((day) => day === null)) return null

  const peakWindows = value.peakWindows.map(normalisePeakWindow)
  if (
    peakWindows.length > 3 ||
    peakWindows.some((window) => window === null)
  ) {
    return null
  }

  return {
    playerId,
    windowStart,
    windowEnd,
    sampleCount,
    knownSampleCount,
    coveredHourCount,
    lastObservedAt: epochOrNull(value.lastObservedAt),
    lastActiveObservedAt: epochOrNull(value.lastActiveObservedAt),
    cells: cells as SharedActivityCell[][],
    peakWindows: peakWindows as SharedActivityPeakWindow[],
  }
}

export async function loadSharedActivitySummary(
  playerId: PlayerId,
  fetcher: typeof fetch = fetch,
): Promise<SharedActivitySummary> {
  if (!Number.isSafeInteger(playerId) || playerId <= 0) {
    throw new Error('Activity intel requires a positive Torn player ID.')
  }

  const url = new URL('/v1/activity', HONJIN_INTEL_BASE_URL)
  url.searchParams.set('ids', String(playerId))

  const response = await fetcher(url)
  if (!response.ok) {
    throw new Error(`Shared activity intel returned HTTP ${response.status}.`)
  }

  const body: unknown = await response.json()
  if (!isRecord(body) || !Array.isArray(body.summaries)) {
    throw new Error('Shared activity intel returned an invalid response.')
  }

  const summary = body.summaries
    .map(normaliseSummary)
    .find((candidate) => candidate?.playerId === playerId) ?? null

  if (summary === null) {
    throw new Error('Shared activity intel did not return the requested player.')
  }

  return summary
}
