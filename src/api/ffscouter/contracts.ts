/**
 * Narrow FFScouter contracts required by HONJIN.
 *
 * HONJIN-01 verified the free/public BSS bucket at:
 *
 *   available_estimates.bss
 *
 * Premium, spies, merged top-level estimates, and flight APIs are deliberately
 * outside HONJIN's canonical battle-intel contract.
 */

export interface FfScouterBssEstimateDto {
  bss_public: number | null
  bs_estimate: number | null
  bs_estimate_human: string | null

  /**
   * HONJIN-01 verified field presence but did not record the live runtime type.
   * Keep this unknown until production evidence establishes the contract.
   */
  last_updated: unknown

  /**
   * Fair Fight is specific to the caller/current Torn user.
   */
  fair_fight: number | null
}

export interface FfScouterAvailableEstimatesDto {
  bss?: FfScouterBssEstimateDto | null

  /**
   * Explicitly represented only so the boundary makes it clear that HONJIN
   * does not consume these sources for v0.1.
   */
  premium?: unknown
  spies?: unknown
}

export interface FfScouterStatsRowDto {
  source?: string | null
  available_estimates?: FfScouterAvailableEstimatesDto | null
}
