import type { FactionRosterSnapshot, Player } from '../../types'

export type TeamViewPhase = 'idle' | 'loading' | 'ready' | 'error'
export type TeamFilter = 'all' | 'okay' | 'hospital' | 'travelling' | 'online' | 'offline'
export interface TeamMemberView { player: Player; presence: 'online' | 'idle' | 'offline' | 'unknown'; stateLabel: string; lastActionLabel: string }
export interface TeamView { phase: TeamViewPhase; stale: boolean; message: string | null; members: readonly TeamMemberView[]; observedAt: number | null }
export const EMPTY_TEAM_VIEW: TeamView = { phase: 'idle', stale: false, message: null, members: [], observedAt: null }
function presenceFor(status: string | null): TeamMemberView['presence'] { const value = status?.toLowerCase(); if (value === 'online') return 'online'; if (value === 'idle') return 'idle'; if (value === 'offline') return 'offline'; return 'unknown' }
function stateLabel(player: Player, now: number): string { const { status } = player; if (status.state === 'hospital' && status.hospitalUntil !== null) { const minutes = Math.ceil(Math.max(0, status.hospitalUntil - now) / 60); return minutes > 0 ? `Hospital · ${minutes}m` : 'Hospital' } return status.details || status.description || status.state.charAt(0).toUpperCase() + status.state.slice(1) }
export function buildTeamView(roster: FactionRosterSnapshot, now: number): TeamView { return { phase: 'ready', stale: false, message: null, observedAt: roster.observedAt, members: roster.members.map((player) => ({ player, presence: presenceFor(player.status.lastAction.status), stateLabel: stateLabel(player, now), lastActionLabel: player.status.lastAction.relative || player.status.lastAction.status || 'Last action unknown' })) } }

function byLevelDescending(a: TeamMemberView, b: TeamMemberView): number {
  const levelDifference = (b.player.level ?? -1) - (a.player.level ?? -1)
  if (levelDifference !== 0) return levelDifference
  const nameDifference = a.player.name.localeCompare(b.player.name)
  return nameDifference !== 0 ? nameDifference : a.player.id - b.player.id
}

export function filterTeamMembers(members: readonly TeamMemberView[], filter: TeamFilter): readonly TeamMemberView[] {
  let filtered: readonly TeamMemberView[] = members
  if (filter === 'online' || filter === 'offline') {
    filtered = members.filter(({ player }) => player.status.lastAction.status?.toLowerCase() === filter)
  } else if (filter === 'travelling') {
    filtered = members.filter(({ player }) => player.status.state === 'travelling' || player.status.state === 'abroad')
  } else if (filter !== 'all') {
    filtered = members.filter(({ player }) => player.status.state === filter)
  }
  return [...filtered].sort(byLevelDescending)
}
