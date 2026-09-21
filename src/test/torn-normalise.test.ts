import { describe, expect, it } from 'vitest'
import type { TornFactionMemberDto } from '../api/torn/contracts'
import { normaliseTornFactionMember } from '../api/torn/normalise'

describe('normaliseTornFactionMember', () => {
  it('normalises an observed Hospital member into HONJIN models', () => {
    const member: TornFactionMemberDto = {
      id: 123456,
      name: 'Hospital Target',
      level: 42,
      position: 'Member',
      status: {
        description: 'Hospital for 12 mins',
        details: '',
        plane_image_type: null,
        state: 'Hospital',
        until: 1_800_000_000,
      },
      last_action: {
        relative: '2 minutes ago',
        status: 'Offline',
        timestamp: 1_799_999_000,
      },
    }

    expect(normaliseTornFactionMember(member)).toEqual({
      id: 123456,
      name: 'Hospital Target',
      level: 42,
      factionPosition: 'Member',
      status: {
        state: 'hospital',
        description: 'Hospital for 12 mins',
        details: '',
        planeImageType: null,
        hospitalUntil: 1_800_000_000,
        lastAction: {
          relative: '2 minutes ago',
          status: 'Offline',
          at: 1_799_999_000,
        },
      },
    })
  })

  it('normalises Torn Traveling spelling and known aircraft evidence', () => {
    const member: TornFactionMemberDto = {
      id: 234567,
      name: 'Travel Target',
      level: 55,
      position: 'Member',
      status: {
        description: 'Traveling from Torn to Argentina',
        details: '',
        plane_image_type: 'airliner',
        state: 'Traveling',
        until: null,
      },
      last_action: {
        relative: '5 minutes ago',
        status: 'Offline',
        timestamp: 1_799_998_000,
      },
    }

    const player = normaliseTornFactionMember(member)

    expect(player.status.state).toBe('travelling')
    expect(player.status.planeImageType).toBe('airliner')
    expect(player.status.hospitalUntil).toBeNull()
  })

  it('never treats status.until as travel ETA evidence', () => {
    const member: TornFactionMemberDto = {
      id: 345678,
      name: 'Unexpected Until',
      level: 60,
      position: null,
      status: {
        description: 'Traveling from South Africa to Torn',
        details: null,
        plane_image_type: 'light_aircraft',
        state: 'Traveling',
        until: 1_900_000_000,
      },
      last_action: null,
    }

    expect(
      normaliseTornFactionMember(member).status.hospitalUntil,
    ).toBeNull()
  })

  it('preserves unknown provider values without inventing semantics', () => {
    const member: TornFactionMemberDto = {
      id: 456789,
      name: 'Future Status',
      level: null,
      position: null,
      status: {
        description: null,
        details: null,
        plane_image_type: 'future_aircraft',
        state: 'Future State',
        until: null,
      },
      last_action: null,
    }

    const player = normaliseTornFactionMember(member)

    expect(player.status.state).toBe('unknown')
    expect(player.status.planeImageType).toBe('unknown')
    expect(player.status.lastAction).toEqual({
      status: null,
      relative: null,
      at: null,
    })
  })
})
