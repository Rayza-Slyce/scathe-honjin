import { describe, expect, it, vi } from 'vitest'
import { buildTravelView } from '../features/travel/live-travel'
import { refreshLiveTravelWorkspace } from '../features/travel/workspace'
import { createMemoryTravelObservationStore } from '../storage/travel-observation'
import type { HonjinRuntime } from '../app/runtime'
import type { SpyTargetView } from '../features/targets/live-spy'
import type { WarBoardView, WarTargetView } from '../features/war/live-view'

const now = 1_800_000_000

function target(id: number, overrides: Partial<WarTargetView> = {}): WarTargetView {
  return {
    id, name: `Player ${id}`, level: 50,
    battleStats: '4.00k', battleStatsValue: 4_000,
    fairFight: '2.00', fairFightValue: 2,
    suitability: 'EASY', confidence: 'HIGH', confidenceValue: 'high', freshness: 'usable',
    availability: 'unavailable', status: 'Travelling', state: 'travelling',
    travelDescription: 'Traveling to Mexico', planeImageType: 'airliner',
    attackable: false, ratio: 0.5, strengthFit: 'useful-larger-margin',
    source: 'ffscouter-public-bss', intelUpdatedAt: now, statusObservedAt: now,
    healthObservedAt: null, ...overrides,
  }
}

function spyTarget(id: number, overrides: Partial<SpyTargetView> = {}): SpyTargetView {
  return {
    ...target(id), factionId: 777, statusStale: false, presence: 'unknown', healthObservedAt: null, ...overrides,
  }
}

function warBoard(targets: readonly WarTargetView[], active = true): WarBoardView {
  return {
    phase: active ? 'ready' : 'no-war', stale: false, message: null,
    war: active ? {
      warId: 42, ownFaction: { id: 501, name: 'SCATHE', score: 1, chain: 1 },
      enemyFaction: { id: 777, name: 'Enemy', score: 1, chain: 1 }, status: 'active',
      targetScore: 100, startsAt: now - 100, endsAt: null, observedAt: now,
    } : null,
    targets, recommendations: [], observedAt: now,
  }
}

describe('live Travel aggregation', () => {
  it('defaults an active war to war targets only', () => {
    const view = buildTravelView({
      war: warBoard([target(1)]), individualTargets: [spyTarget(2)], factionTargets: [], includeNonWar: false,
    })
    expect(view.warTargetsOnly).toBe(true)
    expect(view.targets.map((item) => item.id)).toEqual([1])
  })

  it('includes explicitly requested non-war tracked travellers with simple provenance', () => {
    const view = buildTravelView({
      war: warBoard([target(1)]), individualTargets: [spyTarget(2)], factionTargets: [], includeNonWar: true,
    })
    expect(view.targets.map((item) => [item.id, item.sourceLabel])).toEqual([[1, 'WAR TARGET'], [2, 'NON-WAR']])
  })

  it('deduplicates a player and retains internal provenance', () => {
    const view = buildTravelView({
      war: warBoard([target(1, { statusObservedAt: now - 10 })]),
      individualTargets: [spyTarget(1, { statusObservedAt: now, level: 55 })],
      factionTargets: [spyTarget(1, { statusObservedAt: now - 5 })], includeNonWar: true,
    })
    expect(view.targets).toHaveLength(1)
    expect(view.targets[0]).toMatchObject({ id: 1, level: 55, isWarTarget: true, sourceLabel: 'WAR TARGET' })
    expect(view.targets[0].sources).toEqual(['war', 'spy-individual', 'spy-faction'])
  })

  it('carries combat context and raw Torn timing evidence into deterministic inference', () => {
    const view = buildTravelView({
      war: warBoard([target(1, { statusUntil: now + 600, lastActionAt: now - 60 })]),
      individualTargets: [], factionTargets: [], includeNonWar: false,
    })
    expect(view.targets[0]).toMatchObject({
      level: 50, battleStats: '4.00k', fairFight: '2.00',
      statusUntil: now + 600,
      lastActionAt: now - 60,
      route: { origin: 'Torn', destination: 'Mexico', direction: 'outbound' },
      method: { method: 'airline', confidence: 'medium' },
    })
  })

  it('classifies a saved United Kingdom return flight as incoming', () => {
    const view = buildTravelView({
      war: warBoard([], false),
      individualTargets: [spyTarget(2, {
        travelDescription: 'Traveling from United Kingdom to Torn',
        state: 'travelling',
      })],
      factionTargets: [],
      includeNonWar: false,
    })

    expect(view.targets[0]?.route).toEqual({
      origin: 'United Kingdom',
      destination: 'Torn',
      direction: 'inbound',
    })
  })

  it('shows all tracked travellers outside war and excludes non-travel states', () => {
    const view = buildTravelView({
      war: warBoard([], false),
      individualTargets: [spyTarget(2), spyTarget(3, { state: 'okay', status: 'Okay' })],
      factionTargets: [], includeNonWar: false,
    })
    expect(view.warTargetsOnly).toBe(false)
    expect(view.targets.map((item) => item.id)).toEqual([2])
  })
  it('keeps a foreign-hospital target in Travel as ABROAD without treating a Torn hospital as travel', () => {
    const view = buildTravelView({
      war: warBoard([], false),
      individualTargets: [
        spyTarget(4, {
          state: 'hospital',
          status: 'Hospital',
          statusDescription: 'In a Caymanian hospital for 18 minutes',
          travelDescription: 'In a Caymanian hospital for 18 minutes',
          hospitalUntil: now + 18 * 60,
        }),
        spyTarget(5, {
          state: 'hospital',
          status: 'Hospital',
          statusDescription: 'In hospital for 20 minutes',
          travelDescription: 'In hospital for 20 minutes',
          hospitalUntil: now + 20 * 60,
        }),
      ],
      factionTargets: [],
      includeNonWar: false,
    })

    expect(view.targets).toHaveLength(1)
    expect(view.targets[0]).toMatchObject({
      id: 4,
      state: 'hospital',
      foreignHospitalDestination: 'Cayman Islands',
      hospitalUntil: now + 18 * 60,
      route: {
        origin: null,
        destination: 'Cayman Islands',
        direction: 'unknown',
      },
    })
  })

  it('preserves a foreign-hospital target through the live Travel workspace without extra evidence calls', async () => {
    const view = buildTravelView({
      war: warBoard([], false),
      individualTargets: [spyTarget(6, {
        state: 'hospital',
        status: 'Hospital',
        statusDescription: 'In a Caymanian hospital for 18 minutes',
        travelDescription: 'In a Caymanian hospital for 18 minutes',
        hospitalUntil: now + 18 * 60,
      })],
      factionTargets: [],
      includeNonWar: false,
    })
    const loadTravelPropertyEvidence = vi.fn()
    const runtime = {
      loadTravelPropertyEvidence,
    } as unknown as HonjinRuntime

    const workspace = await refreshLiveTravelWorkspace({
      userId: 101,
      view,
      runtime,
      store: createMemoryTravelObservationStore(),
    })

    expect(workspace.targets[0]).toMatchObject({
      id: 6,
      foreignHospitalDestination: 'Cayman Islands',
      eta: null,
    })
    expect(loadTravelPropertyEvidence).not.toHaveBeenCalled()
  })

})
