/**
 * Observed FFScouter onboarding contracts.
 */

export interface FfScouterCheckKeyResponseDto {
  key: string
  is_registered: boolean
  registered_at: unknown
  last_used: unknown
  policy_version: unknown
  policy_update_required: boolean
  is_premium: boolean
  premium_expires_at: unknown
  faction_id: number | null
  faction_premium_expires_at: unknown
  premium_entitlement_source: string
  elimination_team: unknown
}

export interface FfScouterErrorResponseDto {
  code?: number
  error?: string
  retry_after_seconds?: number
}
