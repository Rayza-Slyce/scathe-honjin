import { describe, expect, it, vi } from 'vitest'
import type { TornUserPropertyResponseDto } from '../api/torn/contracts'
import { fetchUserProperty } from '../api/torn/recon'
import { normaliseTornUserPropertyTravelEvidence } from '../api/torn/normalise'
import { createHonjinRuntime } from '../app/runtime'

const checkedAt = 1_800_000_000

const supportedProperty: TornUserPropertyResponseDto = {
  property: {
    property: 'Private Island',
    modifications: ['Airstrip', 'Medical Facility'],
    staff: ['Pilot', 'Doctor'],
  },
}

describe('Torn opponent property travel evidence', () => {
  it('uses the public current-property endpoint for the requested player', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(input.toString()).toBe(
        'https://api.torn.com/v2/user/9001/property',
      )
      return new Response(JSON.stringify(supportedProperty), { status: 200 })
    }) as typeof fetch

    await expect(
      fetchUserProperty(9001, '1234567890ABCDEF', fetchImpl),
    ).resolves.toEqual(supportedProperty)
  })

  it('normalises the live v2 property object shape', () => {
    expect(
      normaliseTornUserPropertyTravelEvidence(
        9001,
        {
          property: {
            property: { id: 13, name: 'Private Island' },
            modifications: ['Airstrip'],
            staff: ['Pilot'],
          },
        },
        checkedAt,
      ),
    ).toMatchObject({
      propertyType: 'Private Island',
      airstripPresent: true,
      pilotPresent: true,
    })
  })

  it('normalises live v2 named modification and staff objects', () => {
    expect(
      normaliseTornUserPropertyTravelEvidence(
        9001,
        {
          property: {
            property: { id: 13, name: 'Private Island' },
            modifications: [{ id: 1, name: 'Airstrip' }],
            staff: [{ id: 1, name: 'Pilot' }],
          },
        },
        checkedAt,
      ),
    ).toMatchObject({
      propertyType: 'Private Island',
      airstripPresent: true,
      pilotPresent: true,
    })
  })

  it('normalises explicit Airstrip and Pilot evidence', () => {
    expect(
      normaliseTornUserPropertyTravelEvidence(
        9001,
        supportedProperty,
        checkedAt,
      ),
    ).toEqual({
      playerId: 9001,
      propertyType: 'Private Island',
      airstripPresent: true,
      pilotPresent: true,
      checkedAt,
    })
  })

  it('distinguishes explicit absence from unavailable property fields', () => {
    expect(
      normaliseTornUserPropertyTravelEvidence(
        9002,
        {
          property: {
            property: 'Palace',
            modifications: [],
            staff: [],
          },
        },
        checkedAt,
      ),
    ).toMatchObject({
      airstripPresent: false,
      pilotPresent: false,
    })

    expect(
      normaliseTornUserPropertyTravelEvidence(
        9003,
        {
          property: {
            property: 'Private Island',
            modifications: null,
            staff: null,
          },
        },
        checkedAt,
      ),
    ).toMatchObject({
      airstripPresent: null,
      pilotPresent: null,
    })
  })

  it('keeps a missing current property as unknown evidence', () => {
    expect(
      normaliseTornUserPropertyTravelEvidence(
        9004,
        { property: null },
        checkedAt,
      ),
    ).toEqual({
      playerId: 9004,
      propertyType: null,
      airstripPresent: null,
      pilotPresent: null,
      checkedAt,
    })
  })

  it('caches one opponent property observation through the request coordinator', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(supportedProperty), { status: 200 }),
    ) as typeof fetch

    const runtime = createHonjinRuntime('1234567890ABCDEF', {
      fetchImpl,
      now: () => checkedAt * 1000,
      propertyEvidenceCacheMs: 60_000,
    })

    const [first, second] = await Promise.all([
      runtime.loadTravelPropertyEvidence(9001, 'visible-spy'),
      runtime.loadTravelPropertyEvidence(9001, 'active-war'),
    ])

    expect(first).toEqual(second)
    expect(first.checkedAt).toBe(checkedAt)
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await runtime.loadTravelPropertyEvidence(9001, 'optional')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
