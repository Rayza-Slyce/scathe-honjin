import type {
  EpochSeconds,
  FactionId,
  FactionRosterSnapshot,
  FactionSearchMatch,
  LastAction,
  PlaneImageType,
  Player,
  PlayerHealth,
  PlayerId,
  PlayerReconSnapshot,
  PlayerSearchMatch,
  TravelPropertyEvidence,
  PlayerState,
  WarState,
  WarStatus,
} from '../../types'
import type {
  TornFactionMemberDto,
  TornFactionSearchResultDto,
  TornFactionMembersResponseDto,
  TornFactionWarsResponseDto,
  TornUserProfileResponseDto,
  TornUserPropertyResponseDto,
  TornUserSearchResultDto,
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
      statusUntil: member.status?.until ?? null,
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

export function normaliseTornUserSearchResult(
  result: TornUserSearchResultDto,
): PlayerSearchMatch {
  return {
    id: result.id,
    name: result.name,
    level: result.level,
    factionId:
      Number.isSafeInteger(
        result.faction_id,
      ) && result.faction_id > 0
        ? result.faction_id
        : null,
  }
}

export function normaliseTornFactionSearchResult(
  result: TornFactionSearchResultDto,
): FactionSearchMatch {
  return {
    id: result.id,
    name: result.name,
    members: result.members,
    respect: result.respect,
  }
}

function normaliseProfileHealth(
  life:
    TornUserProfileResponseDto['profile']['life'],
  observedAt: number,
): PlayerHealth | null {
  if (
    !Number.isFinite(life.current) ||
    !Number.isFinite(life.maximum) ||
    life.current < 0 ||
    life.maximum <= 0
  ) {
    return null
  }

  return {
    current: life.current,
    maximum: life.maximum,
    observedAt,
  }
}

export function normaliseTornUserProfile(
  response: TornUserProfileResponseDto,
  observedAt: number,
): PlayerReconSnapshot {
  const profile = response.profile
  const player = normaliseTornFactionMember({
    id: profile.id,
    name: profile.name,
    level: profile.level,
    position: null,
    status: profile.status,
    last_action: profile.last_action,
  })

  return {
    player,
    factionId:
      profile.faction_id !== null &&
      Number.isSafeInteger(
        profile.faction_id,
      ) &&
      profile.faction_id > 0
        ? profile.faction_id
        : null,
    health: normaliseProfileHealth(
      profile.life,
      observedAt,
    ),
    observedAt,
  }
}

function hasPropertyValue(
  values: readonly (string | { name?: string | null })[] | null,
  expected: string,
): boolean | null {
  if (values === null) {
    return null
  }

  const normalised = expected.toLowerCase()
  return values.some((value) => {
    const name = typeof value === 'string' ? value : value?.name
    return typeof name === 'string' && name.trim().toLowerCase() === normalised
  })
}

export function normaliseTornUserPropertyTravelEvidence(
  playerId: PlayerId,
  response: TornUserPropertyResponseDto,
  checkedAt: number,
): TravelPropertyEvidence {
  const property = response.property

  const propertyTypeValue = property?.property ?? null
  const propertyType =
    typeof propertyTypeValue === 'string'
      ? propertyTypeValue.trim() || null
      : propertyTypeValue?.name?.trim() || null

  return {
    playerId,
    propertyType,
    airstripPresent: property === null
      ? null
      : hasPropertyValue(property.modifications, 'Airstrip'),
    pilotPresent: property === null
      ? null
      : hasPropertyValue(property.staff, 'Pilot'),
    checkedAt,
  }
}
