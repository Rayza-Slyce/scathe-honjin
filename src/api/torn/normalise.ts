import type {
  LastAction,
  PlaneImageType,
  Player,
  PlayerState,
} from '../../types'
import type { TornFactionMemberDto } from './contracts'

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
