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

export interface TornUserBattlestatsResponseDto {
  battlestats: {
    total: number
  }
}

export interface TornFactionBasicResponseDto {
  basic: {
    id: number
    name: string
  }
}
