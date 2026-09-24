import type {
  EpochSeconds,
  FactionId,
  FactionRosterSnapshot,
  LastAction,
  PlaneImageType,
  Player,
  PlayerState,
  WarState,
  WarStatus,
} from '../../types'
import type {
  TornFactionMemberDto,
  TornFactionMembersResponseDto,
  TornFactionWarsResponseDto,
} from './contracts'

function normalisePlayerState(state: string | null): PlayerState {
  switch (state?.trim().toLowerCase()) {
    case 'okay':
      return 'okay'
    case 'hospital':
      return 'hospital'
    case 'traveling':
    case 'travelling':
      return 'travelling'
    case 'abroad':
      return 'abroad'
    default:
      return 'unknown'
  }
}

function normalisePlaneImageType(
  planeImageType: string | null,
): PlaneImageType | null {
  if (planeImageType === null || planeImageType === '') {
    return null
  }

  switch (planeImageType) {
    case 'light_aircraft':
    case 'airliner':
    case 'private_jet':
      return planeImageType
    default:
      return 'unknown'
  }
}

function normaliseLastAction(
  lastAction: TornFactionMemberDto['last_action'],
): LastAction {
  return {
    status: lastAction?.status ?? null,
    relative: lastAction?.relative ?? null,
    at: lastAction?.timestamp ?? null,
  }
}

export function normaliseTornFactionMember(
  member: TornFactionMemberDto,
): Player {
  const state = normalisePlayerState(member.status?.state ?? null)

  return {
    id: member.id,
    name: member.name,
    level: member.level,
    factionPosition: member.position,
    status: {
      state,
      description: member.status?.description ?? null,
      details: member.status?.details ?? null,
      planeImageType: normalisePlaneImageType(
        member.status?.plane_image_type ?? null,
      ),
      hospitalUntil:
        state === 'hospital'
          ? member.status?.until ?? null
          : null,
      lastAction: normaliseLastAction(member.last_action),
    },
  }
}

export function normaliseTornFactionRoster(
  factionId: FactionId,
  response: TornFactionMembersResponseDto,
  observedAt: EpochSeconds,
): FactionRosterSnapshot {
  return {
    factionId,
    members: response.members.map(
      normaliseTornFactionMember,
    ),
    observedAt,
  }
}

function deriveWarStatus(
  start: number,
  end: number | null,
  observedAt: EpochSeconds,
): WarStatus {
  if (end !== null && observedAt >= end) {
    return 'ended'
  }

  if (observedAt < start) {
    return 'scheduled'
  }

  return 'active'
}

export function normaliseTornRankedWar(
  ownFactionId: FactionId,
  response: TornFactionWarsResponseDto,
  observedAt: EpochSeconds,
): WarState | null {
  const rankedWar = response.wars.ranked

  if (rankedWar === null) {
    return null
  }

  const ownFaction = rankedWar.factions.find(
    (faction) => faction.id === ownFactionId,
  )

  if (!ownFaction) {
    throw new Error(
      'Ranked War response does not include the current faction.',
    )
  }

  const enemies = rankedWar.factions.filter(
    (faction) => faction.id !== ownFactionId,
  )

  if (enemies.length !== 1) {
    throw new Error(
      'Ranked War response does not contain exactly one enemy faction.',
    )
  }

  const enemyFaction = enemies[0]

  return {
    warId: rankedWar.war_id,
    ownFaction: {
      id: ownFaction.id,
      name: ownFaction.name,
      score: ownFaction.score,
      chain: ownFaction.chain,
    },
    enemyFaction: {
      id: enemyFaction.id,
      name: enemyFaction.name,
      score: enemyFaction.score,
      chain: enemyFaction.chain,
    },
    status: deriveWarStatus(
      rankedWar.start,
      rankedWar.end,
      observedAt,
    ),
    targetScore: rankedWar.target,
    startsAt: rankedWar.start,
    endsAt: rankedWar.end,
    observedAt,
  }
}
