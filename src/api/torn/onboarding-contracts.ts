/**
 * Observed Torn v2 response contracts required by HONJIN onboarding.
 *
 * These are deliberately narrow. Add fields only when HONJIN consumes them.
 */

export interface TornKeyInfoResponseDto {
  info: {
    selections: {
      user: string[]
      faction: string[]
    }
    user: {
      id: number
      faction_id: number
      company_id: number
    }
  }
}

export interface TornUserBasicResponseDto {
  profile: {
    id: number
    name: string
  }
}

export interface TornUserBattleStatModifierDetailDto {
  effect: string
  type: string
  value: number
}

export interface TornUserBattleStatDetailDto {
  value: number
  modifier: number
  modifiers: TornUserBattleStatModifierDetailDto[]
}

export interface TornUserBattlestatsResponseDto {
  battlestats: {
    total: number
    strength?: TornUserBattleStatDetailDto
    defense?: TornUserBattleStatDetailDto
    speed?: TornUserBattleStatDetailDto
    dexterity?: TornUserBattleStatDetailDto
  }
}

export interface TornFactionBasicResponseDto {
  basic: {
    id: number
    name: string
  }
}
