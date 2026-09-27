import { describe, expect, it } from 'vitest'
import { buildTeamView, filterTeamMembers } from '../features/team/live-team'
import type { FactionRosterSnapshot, PlayerState } from '../types'

const now = 1_800_000_000
function member(state: PlayerState, overrides: Record<string, unknown> = {}) {
  return {
    id: 101, name: 'Rayza', level: 50, factionPosition: 'Member',
    status: {
      state, description: state === 'travelling' ? 'Travelling to Mexico' : state,
      details: null, planeImageType: null,
      hospitalUntil: state === 'hospital' ? now + 241 : null,
      lastAction: { status: 'Online', relative: '2 minutes ago', at: now - 120 },
      ...overrides,
    },
  }
}
function roster(...members: ReturnType<typeof member>[]): FactionRosterSnapshot { return { factionId: 501, observedAt: now, members } }

describe('live Team view', () => {
  it('keeps roster identity, role and last-action evidence', () => {
    const view = buildTeamView(roster(member('okay')), now)
    expect(view.members[0]?.player.name).toBe('Rayza')
    expect(view.members[0]?.player.factionPosition).toBe('Member')
    expect(view.members[0]?.lastActionLabel).toBe('2 minutes ago')
    expect(view.members[0]?.presence).toBe('online')
  })
  it('formats hospital remaining time from the observed expiry', () => {
    expect(buildTeamView(roster(member('hospital')), now).members[0]?.stateLabel).toBe('Hospital · 5m')
  })
  it('uses Torn travel detail without inventing extra context', () => {
    expect(buildTeamView(roster(member('travelling')), now).members[0]?.stateLabel).toBe('Travelling to Mexico')
  })
  it('filters status groups deterministically, including abroad as travelling', () => {
    const view = buildTeamView(roster(
      member('okay'),
      { ...member('hospital'), id: 102, name: 'Hospital' },
      { ...member('abroad'), id: 103, name: 'Abroad' },
    ), now)
    expect(filterTeamMembers(view.members, 'okay').map((item) => item.player.name)).toEqual(['Rayza'])
    expect(filterTeamMembers(view.members, 'hospital').map((item) => item.player.name)).toEqual(['Hospital'])
    expect(filterTeamMembers(view.members, 'travelling').map((item) => item.player.name)).toEqual(['Abroad'])
  })
  it('orders Team views by level descending with deterministic ties', () => {
    const level20 = { ...member('okay'), id: 102, name: 'Level20', level: 20 }
    const level75B = { ...member('okay'), id: 104, name: 'Zulu', level: 75 }
    const level75A = { ...member('okay'), id: 103, name: 'Alpha', level: 75 }
    const view = buildTeamView(roster(level20, level75B, level75A, member('okay')), now)
    expect(filterTeamMembers(view.members, 'all').map((item) => item.player.name)).toEqual(['Alpha', 'Zulu', 'Rayza', 'Level20'])
    expect(filterTeamMembers(view.members, 'okay').map((item) => item.player.name)).toEqual(['Alpha', 'Zulu', 'Rayza', 'Level20'])
  })
  it('uses only Torn explicit presence status for online and offline filters', () => {
    const online = member('okay')
    const offline = { ...member('okay'), id: 102, name: 'Offline', status: { ...member('okay').status, lastAction: { status: 'Offline', relative: '1 hour ago', at: now - 3600 } } }
    const idle = { ...member('okay'), id: 103, name: 'Idle', status: { ...member('okay').status, lastAction: { status: 'Idle', relative: '10 minutes ago', at: now - 600 } } }
    const view = buildTeamView(roster(online, offline, idle), now)
    expect(view.members.map((item) => item.presence)).toEqual(['online', 'offline', 'idle'])
    expect(filterTeamMembers(view.members, 'online').map((item) => item.player.name)).toEqual(['Rayza'])
    expect(filterTeamMembers(view.members, 'offline').map((item) => item.player.name)).toEqual(['Offline'])
  })
})
