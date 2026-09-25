import type { EpochSeconds } from '../../types'
import type {
  SpyRoomView,
  SpyTargetView,
} from '../targets/live-spy'
import type {
  WarBoardView,
  WarTargetView,
} from '../war/live-view'

export type HospitalTargetSource =
  | 'war'
  | 'spy-individual'
  | 'spy-faction'

export type HospitalTimeFilter =
  | 'all'
  | 'under-15m'
  | 'under-1h'
  | '1-to-3h'
  | 'over-3h'

export interface HospitalTargetView {
  id: number
  name: string
  level: number | null
  battleStats: string
  fairFight: string
  suitability: WarTargetView['suitability']
  confidence: string
  releaseAt: EpochSeconds | null
  statusObservedAt: EpochSeconds
  statusStale: boolean
  watched: boolean
  isWarTarget: boolean
  sources: readonly HospitalTargetSource[]
}

export interface HospitalView {
  activeWarId: number | null
  targets: readonly HospitalTargetView[]
  message: string | null
}

interface CandidateEvidence {
  id: number
  name: string
  level: number | null
  battleStats: string
  fairFight: string
  suitability: WarTargetView['suitability']
  confidence: string
  state: string
  releaseAt: EpochSeconds | null
  statusObservedAt: EpochSeconds
  statusStale: boolean
  source: HospitalTargetSource
  isWarTarget: boolean
}

function fromWarTarget(
  target: WarTargetView,
  stale: boolean,
): CandidateEvidence {
  return {
    id: target.id,
    name: target.name,
    level: target.level,
    battleStats: target.battleStats,
    fairFight: target.fairFight,
    suitability: target.suitability,
    confidence: target.confidence,
    state: target.state,
    releaseAt: target.hospitalUntil ?? null,
    statusObservedAt: target.statusObservedAt,
    statusStale: stale,
    source: 'war',
    isWarTarget: true,
  }
}

function fromSpyTarget(
  target: SpyTargetView,
  source:
    | 'spy-individual'
    | 'spy-faction',
  warPlayerIds: ReadonlySet<number>,
): CandidateEvidence {
  return {
    id: target.id,
    name: target.name,
    level: target.level,
    battleStats: target.battleStats,
    fairFight: target.fairFight,
    suitability: target.suitability,
    confidence: target.confidence,
    state: target.state,
    releaseAt: target.hospitalUntil ?? null,
    statusObservedAt: target.statusObservedAt,
    statusStale: target.statusStale,
    source,
    isWarTarget: warPlayerIds.has(target.id),
  }
}

function compareEvidence(
  left: CandidateEvidence,
  right: CandidateEvidence,
): number {
  if (
    left.statusObservedAt !==
    right.statusObservedAt
  ) {
    return (
      right.statusObservedAt -
      left.statusObservedAt
    )
  }

  if (left.source === right.source) {
    return 0
  }

  return left.source === 'war' ? -1 : 1
}

function compareHospitalTargets(
  left: HospitalTargetView,
  right: HospitalTargetView,
): number {
  if (left.releaseAt === null) {
    if (right.releaseAt !== null) {
      return 1
    }
  } else if (right.releaseAt === null) {
    return -1
  } else if (left.releaseAt !== right.releaseAt) {
    return left.releaseAt - right.releaseAt
  }

  const byName = left.name.localeCompare(
    right.name,
    undefined,
    { sensitivity: 'base' },
  )

  return byName !== 0
    ? byName
    : left.id - right.id
}

export function buildHospitalView(
  warBoard: WarBoardView | undefined,
  spyRoom: SpyRoomView | undefined,
  watchedPlayerIds: ReadonlySet<number>,
): HospitalView {
  const warTargets =
    warBoard?.phase === 'ready'
      ? warBoard.targets
      : []
  const warPlayerIds = new Set(
    warTargets.map((target) => target.id),
  )
  const activeWarId =
    warBoard?.phase === 'ready' &&
    warBoard.war?.status === 'active'
      ? warBoard.war.warId
      : null
  const evidenceByPlayer = new Map<
    number,
    CandidateEvidence[]
  >()

  const addEvidence = (
    evidence: CandidateEvidence,
  ) => {
    const existing =
      evidenceByPlayer.get(evidence.id) ?? []
    existing.push(evidence)
    evidenceByPlayer.set(
      evidence.id,
      existing,
    )
  }

  for (const target of warTargets) {
    addEvidence(
      fromWarTarget(
        target,
        Boolean(warBoard?.stale),
      ),
    )
  }

  for (const target of
    spyRoom?.individualTargets ?? []) {
    addEvidence(
      fromSpyTarget(
        target,
        'spy-individual',
        warPlayerIds,
      ),
    )
  }

  for (const target of
    spyRoom?.factionWorkspace?.targets ?? []) {
    addEvidence(
      fromSpyTarget(
        target,
        'spy-faction',
        warPlayerIds,
      ),
    )
  }

  const targets: HospitalTargetView[] = []

  for (const evidence of evidenceByPlayer.values()) {
    const sorted = [...evidence].sort(
      compareEvidence,
    )
    const freshest = sorted[0]

    if (!freshest || freshest.state !== 'hospital') {
      continue
    }

    targets.push({
      id: freshest.id,
      name: freshest.name,
      level: freshest.level,
      battleStats: freshest.battleStats,
      fairFight: freshest.fairFight,
      suitability: freshest.suitability,
      confidence: freshest.confidence,
      releaseAt: freshest.releaseAt,
      statusObservedAt:
        freshest.statusObservedAt,
      statusStale: freshest.statusStale,
      watched: watchedPlayerIds.has(
        freshest.id,
      ),
      isWarTarget: evidence.some(
        (item) => item.isWarTarget,
      ),
      sources: [
        ...new Set(
          evidence.map((item) => item.source),
        ),
      ],
    })
  }

  return {
    activeWarId,
    targets: targets.sort(
      compareHospitalTargets,
    ),
    message: null,
  }
}

export function hospitalRemainingSeconds(
  target: HospitalTargetView,
  now: EpochSeconds,
): number | null {
  if (target.releaseAt === null) {
    return null
  }

  return Math.max(0, target.releaseAt - now)
}

export function filterHospitalTargets(
  targets: readonly HospitalTargetView[],
  filter: HospitalTimeFilter,
  now: EpochSeconds,
  warTargetsOnly: boolean,
): readonly HospitalTargetView[] {
  return targets.filter((target) => {
    if (warTargetsOnly && !target.isWarTarget) {
      return false
    }

    if (filter === 'all') {
      return true
    }

    const remaining = hospitalRemainingSeconds(
      target,
      now,
    )

    if (remaining === null) {
      return false
    }

    switch (filter) {
      case 'under-15m':
        return remaining < 15 * 60
      case 'under-1h':
        return remaining < 60 * 60
      case '1-to-3h':
        return (
          remaining >= 60 * 60 &&
          remaining < 3 * 60 * 60
        )
      case 'over-3h':
        return remaining >= 3 * 60 * 60
      default:
        return true
    }
  })
}

export function formatHospitalReleaseCountdown(
  target: HospitalTargetView,
  now: EpochSeconds,
): string {
  if (target.releaseAt === null) {
    return 'UNKNOWN'
  }

  const remaining =
    target.releaseAt - now

  if (remaining <= 0) {
    return 'AWAITING REFRESH'
  }

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor(
    (remaining % 3600) / 60,
  )
  const seconds = remaining % 60

  if (hours > 0) {
    return `${hours}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
  }

  return `${minutes
    .toString()
    .padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

export function hospitalSourceLabel(
  target: HospitalTargetView,
): string {
  if (target.isWarTarget) {
    return target.sources.length > 1
      ? 'WAR + SPY'
      : 'WAR TARGET'
  }

  return 'NON-WAR'
}
