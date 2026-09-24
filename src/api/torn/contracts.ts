/**
 * Narrow Torn API contracts required by HONJIN.
 *
 * These types describe provider-facing data only. They must not be consumed
 * directly by UI/features.
 */

export interface TornLastActionDto {
  relative: string | null
  status: string | null
  timestamp: number | null
}

export interface TornPlayerStatusDto {
  description: string | null
  details: string | null
  plane_image_type: string | null
  state: string | null
  until: number | null
}

export interface TornFactionMemberDto {
  id: number
  name: string
  level: number | null
  position: string | null
  status: TornPlayerStatusDto | null
  last_action: TornLastActionDto | null
}

export interface TornFactionMembersResponseDto {
  members: TornFactionMemberDto[]
}

export interface TornRankedWarParticipantDto {
  id: number
  name: string
  score: number
  chain: number
}

export interface TornRankedWarDto {
  war_id: number
  start: number
  end: number | null
  target: number
  winner: number | null
  factions: TornRankedWarParticipantDto[]
}

export interface TornFactionWarsResponseDto {
  wars: {
    ranked: TornRankedWarDto | null
  }
}

export interface TornUserSearchResultDto {
  id: number
  name: string
  level: number
  online: string
  faction_id: number
}

export interface TornUserSearchResponseDto {
  search: TornUserSearchResultDto[]
}

export interface TornFactionSearchResultDto {
  id: number
  name: string
  respect: number
  members: number
  is_destroyed: boolean
  is_recruiting: boolean
}

export interface TornFactionSearchResponseDto {
  search: TornFactionSearchResultDto[]
}

export interface TornUserProfileResponseDto {
  profile: {
    id: number
    name: string
    level: number
    faction_id: number | null
    status: TornPlayerStatusDto
    last_action: TornLastActionDto
    life: {
      current: number
      maximum: number
    }
  }
}
