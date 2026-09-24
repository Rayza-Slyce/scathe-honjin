/**
 * HONJIN-owned normalised domain types.
 *
 * Provider-specific Torn and FFScouter response shapes belong under src/api/.
 * UI/features should consume these domain models rather than raw provider JSON.
 */

export type PlayerId = number
export type FactionId = number
export type EpochSeconds = number

export interface FactionIdentity {
  id: FactionId
  name: string
}

export interface CurrentUser {
  id: PlayerId
  name: string
  faction: FactionIdentity
  battleStatsTotal: number
}

export type PlayerState =
  | 'okay'
  | 'hospital'
  | 'travelling'
  | 'abroad'
  | 'unknown'

export type PlaneImageType =
  | 'light_aircraft'
  | 'airliner'
  | 'private_jet'
  | 'unknown'

export interface LastAction {
  status: string | null
  relative: string | null
  at: EpochSeconds | null
}

export interface PlayerStatus {
  state: PlayerState
  description: string | null
  details: string | null
  planeImageType: PlaneImageType | null
  hospitalUntil: EpochSeconds | null
  lastAction: LastAction
}

export interface Player {
  id: PlayerId
  name: string
  level: number | null
  factionPosition: string | null
  status: PlayerStatus
}

export type BattleIntelSource =
  | 'ffscouter-public-bss'
  | 'unavailable'

export interface BattleIntel {
  playerId: PlayerId
  estimatedBattleStats: number | null
  publicBss: number | null
  fairFight: number | null
  updatedAt: EpochSeconds | null
  source: BattleIntelSource
}

export type Suitability =
  | 'hit-now'
  | 'good'
  | 'viable'
  | 'risky'
  | 'avoid'
  | 'unknown'

export type Confidence =
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown'

export type Availability =
  | 'attackable'
  | 'unavailable'
  | 'unknown'

export type WarStatus =
  | 'scheduled'
  | 'active'
  | 'ended'
  | 'unknown'

export interface WarFactionState {
  id: FactionId
  name: string
  score: number
  chain: number
}

export interface WarState {
  warId: number
  ownFaction: WarFactionState
  enemyFaction: WarFactionState
  status: WarStatus
  targetScore: number | null
  startsAt: EpochSeconds | null
  endsAt: EpochSeconds | null
  observedAt: EpochSeconds
}

export interface FactionRosterSnapshot {
  factionId: FactionId
  members: readonly Player[]
  observedAt: EpochSeconds
}

export interface WarBoardSnapshot {
  war: WarState | null
  enemyRoster: FactionRosterSnapshot | null
}

export interface HospitalState {
  playerId: PlayerId
  isHospitalised: boolean
  releaseAt: EpochSeconds | null
  description: string | null
}

export type TravelDirection =
  | 'inbound'
  | 'outbound'
  | 'unknown'

export type TravelMethod =
  | 'airstrip'
  | 'airline'
  | 'private'
  | 'unknown'

export interface TravelObservation {
  playerId: PlayerId
  origin: string | null
  destination: string | null
  direction: TravelDirection
  planeImageType: PlaneImageType | null
  propertyTypeAtObservation: string | null
  airstripPresent: boolean | null
  pilotPresent: boolean | null
  propertyEvidenceCheckedAt: EpochSeconds | null
  firstSeenTravelling: EpochSeconds | null
  previousStateLastSeen: EpochSeconds | null
  firstSeenArrived: EpochSeconds | null
  inferredMethod: TravelMethod
  inferenceReason: string | null
  confidence: Confidence
  contradictedByArrival: boolean
}

export interface EtaWindow {
  earliestAt: EpochSeconds
  latestAt: EpochSeconds
}

export type TravelState =
  | 'not-travelling'
  | 'travelling'
  | 'abroad'
  | 'unknown'

export interface TravelProfile {
  playerId: PlayerId
  state: TravelState
  origin: string | null
  destination: string | null
  planeImageType: PlaneImageType | null
  inferredMethod: TravelMethod
  confidence: Confidence
  eta: EtaWindow | null
  reasoning: readonly string[]
}

export interface ChainState {
  current: number
  target: number | null
}

export interface TeamStatus {
  factionId: FactionId
  members: readonly Player[]
  war: WarState | null
  chain: ChainState | null
}

export type ProviderConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'error'

export interface ConnectionState {
  torn: ProviderConnectionStatus
  ffscouter: ProviderConnectionStatus
}
