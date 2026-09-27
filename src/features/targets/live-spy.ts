import {
  assessBattleIntel,
} from '../../intel/battle-intel'
import {
  deriveAvailability,
} from '../../intel/availability'
import {
  selectCurrentUserBattleStats,
} from '../../intel/current-user-battle-stats'
import type {
  BattleIntel,
  BattleIntelSnapshot,
  Confidence,
  CurrentUser,
  EpochSeconds,
  FactionIdentity,
  FactionRosterSnapshot,
  FactionSearchMatch,
  Player,
  PlayerHealth,
  PlayerReconSnapshot,
  PlayerSearchMatch,
} from '../../types'
import {
  assessWarCandidate,
} from '../../recommendations/select'
import type {
  IntelFreshness,
  StrengthFit,
} from '../../recommendations/policy'
import {
  DEFAULT_RECOMMENDATION_POLICY,
} from '../../recommendations/policy'
import type {
  LiveWarEvidencePolicy,
} from '../../recommendations/live'
import type {
  SpyRoomIdentityState,
} from '../../storage/spy-room-identity'
import type {
  WarRecommendationLabel,
  WarTargetSuitabilityLabel,
} from '../war/live-view'

export type SpySearchPhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'

export interface SpyPlayerSearchState {
  phase: SpySearchPhase
  query: string
  results: readonly PlayerSearchMatch[]
  message: string | null
}

export interface SpyFactionSearchState {
  phase: SpySearchPhase
  query: string
  results: readonly FactionSearchMatch[]
  message: string | null
}

export interface SpyTargetView {
  id: number
  name: string
  level: number | null
  factionId: number | null
  battleStats: string
  battleStatsValue: number | null
  fairFight: string
  fairFightValue: number | null
  suitability: WarTargetSuitabilityLabel
  confidence: string
  confidenceValue: Confidence
  freshness: IntelFreshness
  availability:
    | 'attackable'
    | 'unavailable'
    | 'unknown'
  status: string
  statusStale: boolean
  state: Player['status']['state']
  presence: 'online' | 'idle' | 'offline' | 'unknown'
  statusDescription?: string | null
  statusDetails?: string | null
  travelDescription?: string | null
  planeImageType?: Player['status']['planeImageType']
  health?: string
  healthObservedAt: EpochSeconds | null
  recommendation?: WarRecommendationLabel
  attackable: boolean
  ratio: number | null
  strengthFit: StrengthFit
  ownBattleStatsUsed?: number
  ownBattleStatsAdjusted?: boolean
  source: BattleIntel['source']
  intelUpdatedAt: EpochSeconds | null
  statusObservedAt: EpochSeconds
  hospitalUntil?: EpochSeconds | null
}

export interface SpyFactionWorkspaceView {
  faction: FactionIdentity
  targets: readonly SpyTargetView[]
  observedAt: EpochSeconds
  message: string | null
}

export interface SpyRoomView {
  playerSearch: SpyPlayerSearchState
  factionSearch: SpyFactionSearchState
  individualTargets: readonly SpyTargetView[]
  individualMessage: string | null
  factionWorkspace: SpyFactionWorkspaceView | null
}

export type SpyWorkspace =
  | 'individual'
  | 'faction'

export type SpyTargetSort =
  | 'default'
  | 'level-desc'
  | 'level-asc'
  | 'bs-asc'
  | 'bs-desc'
  | 'ff-asc'
  | 'ff-desc'
  | 'status-ready'
  | 'status-blocked'
  | 'name-asc'

function compareIdentity(
  left: SpyTargetView,
  right: SpyTargetView,
): number {
  const leftName = left.name.toLowerCase()
  const rightName = right.name.toLowerCase()

  if (leftName < rightName) {
    return -1
  }

  if (leftName > rightName) {
    return 1
  }

  return left.id - right.id
}

function presenceFor(status: string | null): SpyTargetView['presence'] {
  const value = status?.toLowerCase()
  if (value === 'online') return 'online'
  if (value === 'idle') return 'idle'
  if (value === 'offline') return 'offline'
  return 'unknown'
}

function compareNullableNumber(
  left: number | null,
  right: number | null,
  direction: 'asc' | 'desc',
): number {
  if (left === null) {
    return right === null ? 0 : 1
  }

  if (right === null) {
    return -1
  }

  return direction === 'asc'
    ? left - right
    : right - left
}

function stateRank(
  target: SpyTargetView,
): number {
  if (target.statusStale) {
    return 5
  }

  switch (target.state) {
    case 'okay':
      return 0
    case 'hospital':
      return 1
    case 'travelling':
      return 2
    case 'abroad':
      return 3
    default:
      return 4
  }
}

function availabilityRank(
  target: SpyTargetView,
  blockedFirst: boolean,
): number {
  if (target.statusStale) {
    return 3
  }

  if (blockedFirst) {
    if (target.availability === 'unavailable') {
      return 0
    }

    if (target.availability === 'attackable') {
      return 1
    }

    return 2
  }

  if (target.availability === 'attackable') {
    return 0
  }

  if (target.availability === 'unavailable') {
    return 1
  }

  return 2
}

export function sortSpyTargets(
  targets: readonly SpyTargetView[],
  sort: SpyTargetSort,
): readonly SpyTargetView[] {
  if (sort === 'default') {
    return targets
  }

  return [...targets].sort((left, right) => {
    let comparison: number

    switch (sort) {
      case 'level-desc':
        comparison = compareNullableNumber(left.level, right.level, 'desc')
        break
      case 'level-asc':
        comparison = compareNullableNumber(left.level, right.level, 'asc')
        break
      case 'bs-asc':
        comparison = compareNullableNumber(
          left.battleStatsValue,
          right.battleStatsValue,
          'asc',
        )
        break
      case 'bs-desc':
        comparison = compareNullableNumber(
          left.battleStatsValue,
          right.battleStatsValue,
          'desc',
        )
        break
      case 'ff-asc':
        comparison = compareNullableNumber(
          left.fairFightValue,
          right.fairFightValue,
          'asc',
        )
        break
      case 'ff-desc':
        comparison = compareNullableNumber(
          left.fairFightValue,
          right.fairFightValue,
          'desc',
        )
        break
      case 'status-ready':
      case 'status-blocked': {
        const blockedFirst =
          sort === 'status-blocked'
        comparison =
          availabilityRank(left, blockedFirst) -
          availabilityRank(right, blockedFirst)

        if (comparison === 0) {
          comparison =
            stateRank(left) - stateRank(right)
        }
        break
      }
      case 'name-asc':
        return compareIdentity(left, right)
      default:
        return 0
    }

    return comparison !== 0
      ? comparison
      : compareIdentity(left, right)
  })
}

export function createEmptySpyRoomView(): SpyRoomView {
  return {
    playerSearch: {
      phase: 'idle',
      query: '',
      results: [],
      message: null,
    },
    factionSearch: {
      phase: 'idle',
      query: '',
      results: [],
      message: null,
    },
    individualTargets: [],
    individualMessage: null,
    factionWorkspace: null,
  }
}

function restoredIndividualTarget(
  playerId: number,
): SpyTargetView {
  return {
    id: playerId,
    name: 'Saved player',
    level: null,
    factionId: null,
    battleStats: 'UNKNOWN',
    battleStatsValue: null,
    fairFight: '—',
    fairFightValue: null,
    suitability: 'UNKNOWN',
    confidence: 'UNKNOWN',
    confidenceValue: 'unknown',
    freshness: 'unknown',
    availability: 'unknown',
    status: 'Saved identity · refresh pending',
    statusStale: true,
    state: 'unknown',
    presence: 'unknown',
    travelDescription: null,
    planeImageType: null,
    healthObservedAt: null,
    attackable: false,
    ratio: null,
    strengthFit: 'unknown',
    source: 'unavailable',
    intelUpdatedAt: null,
    statusObservedAt: 0,
  }
}

export function restoreSpyRoomIdentities(
  view: SpyRoomView,
  identities: SpyRoomIdentityState,
): SpyRoomView {
  const existingById = new Map(
    view.individualTargets.map((target) => [
      target.id,
      target,
    ]),
  )
  const individualTargets =
    identities.individualPlayerIds.map(
      (playerId) =>
        existingById.get(playerId) ??
        restoredIndividualTarget(playerId),
    )

  const factionWorkspace =
    identities.factionId === null
      ? null
      : view.factionWorkspace?.faction.id ===
          identities.factionId
        ? view.factionWorkspace
        : {
            faction: {
              id: identities.factionId,
              name: 'Saved faction',
            },
            targets: [],
            observedAt: 0,
            message:
              'Saved faction recon · refresh pending.',
          }

  return {
    ...view,
    individualTargets,
    factionWorkspace,
  }
}

function unavailableIntel(
  playerId: number,
): BattleIntel {
  return {
    playerId,
    estimatedBattleStats: null,
    publicBss: null,
    fairFight: null,
    updatedAt: null,
    source: 'unavailable',
  }
}

function formatCompactNumber(
  value: number | null,
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return 'UNKNOWN'
  }

  const absolute = Math.abs(value)

  if (absolute >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}b`
  }

  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}m`
  }

  if (absolute >= 1_000) {
    return `${(value / 1_000).toFixed(2)}k`
  }

  return Math.round(value).toString()
}

function formatFairFight(
  value: number | null,
): string {
  return value === null || !Number.isFinite(value)
    ? '—'
    : value.toFixed(2)
}

function suitabilityLabel(
  suitability:
    | 'hit-now'
    | 'good'
    | 'viable'
    | 'risky'
    | 'avoid'
    | 'unknown',
): WarTargetSuitabilityLabel {
  switch (suitability) {
    case 'hit-now':
      return 'EASY'
    case 'good':
      return 'GOOD'
    case 'viable':
      return 'VIABLE'
    case 'risky':
      return 'RISKY'
    case 'avoid':
      return 'AVOID'
    default:
      return 'UNKNOWN'
  }
}

function recommendationLabel(
  reason:
    | 'good-fit'
    | 'lower-strength-option'
    | null,
): WarRecommendationLabel | undefined {
  switch (reason) {
    case 'good-fit':
      return 'GOOD FIT'
    case 'lower-strength-option':
      return 'LOWER-STRENGTH OPTION'
    default:
      return undefined
  }
}

function formatHospitalCountdown(
  until: EpochSeconds | null,
  now: EpochSeconds,
): string {
  if (until === null) {
    return 'Hospital'
  }

  const remaining = until - now

  if (remaining <= 0) {
    return 'Hospital · awaiting refresh'
  }

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor(
    (remaining % 3600) / 60,
  )
  const seconds = remaining % 60
  const clock =
    hours > 0
      ? `${hours}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`
      : `${minutes
          .toString()
          .padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`

  return `Hospital · ${clock}`
}

function formatStatus(
  player: Player,
  now: EpochSeconds,
): string {
  const status = player.status

  switch (status.state) {
    case 'hospital':
      return formatHospitalCountdown(
        status.hospitalUntil,
        now,
      )
    case 'okay': {
      const description =
        status.description?.trim() || 'Okay'
      const activity =
        status.lastAction.relative?.trim()

      return activity
        ? `${description} · ${activity}`
        : description
    }
    case 'travelling':
      return (
        status.description?.trim() ||
        'Travelling'
      )
    case 'abroad':
      return (
        status.description?.trim() ||
        'Abroad'
      )
    default:
      return 'Status unknown'
  }
}

function formatHealth(
  health: PlayerHealth | null,
): string | undefined {
  if (!health) {
    return undefined
  }

  const percentage = Math.round(
    (health.current / health.maximum) * 100,
  )

  return `${formatCompactNumber(
    health.current,
  )} / ${formatCompactNumber(
    health.maximum,
  )} · ${percentage}%`
}

function intelAssessment(
  intel: BattleIntel,
  now: EpochSeconds,
  policy: LiveWarEvidencePolicy,
) {
  return policy.battleIntel
    ? assessBattleIntel(
        intel,
        now,
        policy.battleIntel,
      )
    : {
        confidence: 'unknown' as const,
        freshness: 'unknown' as const,
      }
}

function buildTarget(
  currentUser: CurrentUser,
  player: Player,
  factionId: number | null,
  statusObservedAt: EpochSeconds,
  health: PlayerHealth | null,
  intel: BattleIntel,
  now: EpochSeconds,
  policy: LiveWarEvidencePolicy,
): SpyTargetView {
  const intelligence = intelAssessment(
    intel,
    now,
    policy,
  )
  const availability = deriveAvailability(
    player.status,
    statusObservedAt,
    now,
    policy.statusMaxAgeSeconds,
  )
  const ownBattleStats = selectCurrentUserBattleStats(
    currentUser,
    now,
  )
  const assessment = assessWarCandidate(
    ownBattleStats.total,
    {
      playerId: player.id,
      enemyBattleStats:
        intel.estimatedBattleStats,
      availability,
      confidence:
        intelligence.confidence,
      freshness:
        intelligence.freshness,
    },
    policy.recommendation ??
      DEFAULT_RECOMMENDATION_POLICY,
  )

  return {
    id: player.id,
    name: player.name,
    level: player.level,
    factionId,
    battleStats: formatCompactNumber(
      intel.estimatedBattleStats,
    ),
    battleStatsValue:
      intel.estimatedBattleStats,
    fairFight: formatFairFight(
      intel.fairFight,
    ),
    fairFightValue: intel.fairFight,
    suitability: suitabilityLabel(
      assessment.suitability,
    ),
    confidence:
      intelligence.confidence.toUpperCase(),
    confidenceValue:
      intelligence.confidence,
    freshness:
      intelligence.freshness,
    availability,
    status: formatStatus(player, now),
    statusStale: false,
    state: player.status.state,
    presence: presenceFor(player.status.lastAction.status),
    statusDescription: player.status.description,
    statusDetails: player.status.details,
    travelDescription: player.status.description,
    planeImageType: player.status.planeImageType,
    health: formatHealth(health),
    healthObservedAt:
      health?.observedAt ?? null,
    recommendation:
      recommendationLabel(
        assessment.recommendationReason,
      ),
    attackable:
      availability === 'attackable',
    ratio: assessment.ratio,
    strengthFit: assessment.strengthFit,
    ownBattleStatsUsed: ownBattleStats.total,
    ownBattleStatsAdjusted: ownBattleStats.adjusted,
    source: intel.source,
    intelUpdatedAt: intel.updatedAt,
    statusObservedAt,
    hospitalUntil: player.status.hospitalUntil,
  }
}

export function buildIndividualSpyTarget(
  currentUser: CurrentUser,
  recon: PlayerReconSnapshot,
  intelSnapshot: BattleIntelSnapshot,
  now: EpochSeconds,
  policy: LiveWarEvidencePolicy,
): SpyTargetView {
  if (
    intelSnapshot.callerPlayerId !==
    currentUser.id
  ) {
    throw new Error(
      'Battle intel belongs to a different HONJIN user.',
    )
  }

  const intel =
    intelSnapshot.intel.find(
      (item) =>
        item.playerId ===
        recon.player.id,
    ) ?? unavailableIntel(recon.player.id)

  return buildTarget(
    currentUser,
    recon.player,
    recon.factionId,
    recon.observedAt,
    recon.health,
    intel,
    now,
    policy,
  )
}

export function buildFactionSpyTargets(
  currentUser: CurrentUser,
  roster: FactionRosterSnapshot,
  intelSnapshot: BattleIntelSnapshot,
  now: EpochSeconds,
  policy: LiveWarEvidencePolicy,
): readonly SpyTargetView[] {
  if (
    intelSnapshot.callerPlayerId !==
    currentUser.id
  ) {
    throw new Error(
      'Battle intel belongs to a different HONJIN user.',
    )
  }

  const intelByPlayerId = new Map(
    intelSnapshot.intel.map((intel) => [
      intel.playerId,
      intel,
    ]),
  )

  return roster.members.map((player) =>
    buildTarget(
      currentUser,
      player,
      roster.factionId,
      roster.observedAt,
      null,
      intelByPlayerId.get(player.id) ??
        unavailableIntel(player.id),
      now,
      policy,
    ),
  )
}


export function expireSpyRoomStatus(
  view: SpyRoomView,
  now: EpochSeconds,
  statusMaxAgeSeconds: number,
): SpyRoomView {
  const expireTarget = (
    target: SpyTargetView,
  ): SpyTargetView => {
    if (
      Number.isFinite(now) &&
      Number.isFinite(
        statusMaxAgeSeconds,
      ) &&
      statusMaxAgeSeconds >= 0 &&
      now >= target.statusObservedAt &&
      now - target.statusObservedAt <=
        statusMaxAgeSeconds
    ) {
      return target
    }

    if (
      target.statusStale &&
      target.availability === 'unknown' &&
      !target.attackable
    ) {
      return target
    }

    return {
      ...target,
      statusStale: true,
      availability: 'unknown',
      attackable: false,
      health: undefined,
    }
  }

  const individualTargets =
    view.individualTargets.map(expireTarget)
  const factionWorkspace =
    view.factionWorkspace
      ? {
          ...view.factionWorkspace,
          targets:
            view.factionWorkspace.targets.map(
              expireTarget,
            ),
        }
      : null

  const changedIndividuals =
    individualTargets.some(
      (target, index) =>
        target !==
        view.individualTargets[index],
    )
  const changedFaction =
    factionWorkspace !== null &&
    view.factionWorkspace !== null &&
    factionWorkspace.targets.some(
      (target, index) =>
        target !==
        view.factionWorkspace?.targets[
          index
        ],
    )

  if (
    !changedIndividuals &&
    !changedFaction
  ) {
    return view
  }

  return {
    ...view,
    individualTargets,
    factionWorkspace,
  }
}
