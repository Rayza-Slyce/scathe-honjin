import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  buildHospitalView,
  filterHospitalTargets,
  formatHospitalReleaseCountdown,
  hospitalSourceLabel,
} from '../features/hospital/live-hospital'
import type {
  SpyRoomView,
  SpyTargetView,
} from '../features/targets/live-spy'
import type {
  WarBoardView,
  WarTargetView,
} from '../features/war/live-view'

const now = 1_800_000_000

function warTarget(
  overrides: Partial<WarTargetView> &
    Pick<WarTargetView, 'id' | 'name'>,
): WarTargetView {
  return {
    level: 50,
    battleStats: '4.00k',
    battleStatsValue: 4_000,
    fairFight: '2.00',
    fairFightValue: 2,
    suitability: 'HIT NOW',
    confidence: 'UNKNOWN',
    confidenceValue: 'unknown',
    freshness: 'unknown',
    availability: 'unavailable',
    status: 'Hospital',
    state: 'hospital',
    attackable: false,
    ratio: 0.4,
    strengthFit: 'useful-larger-margin',
    source: 'ffscouter-public-bss',
    intelUpdatedAt: now,
    statusObservedAt: now,
    hospitalUntil: now + 600,
    healthObservedAt: null,
    ...overrides,
  }
}

function spyTarget(
  overrides: Partial<SpyTargetView> &
    Pick<SpyTargetView, 'id' | 'name'>,
): SpyTargetView {
  return {
    level: 20,
    factionId: 777,
    battleStats: '4.00k',
    battleStatsValue: 4_000,
    fairFight: '2.00',
    fairFightValue: 2,
    suitability: 'HIT NOW',
    confidence: 'UNKNOWN',
    confidenceValue: 'unknown',
    freshness: 'unknown',
    availability: 'unavailable',
    status: 'Hospital',
    statusStale: false,
    state: 'hospital',
    healthObservedAt: null,
    attackable: false,
    ratio: 0.4,
    strengthFit: 'useful-larger-margin',
    source: 'ffscouter-public-bss',
    intelUpdatedAt: now,
    statusObservedAt: now,
    hospitalUntil: now + 600,
    ...overrides,
  }
}

function warBoard(
  targets: readonly WarTargetView[],
  stale = false,
): WarBoardView {
  return {
    phase: 'ready',
    stale,
    message: null,
    war: {
      warId: 42,
      ownFaction: {
        id: 501,
        name: 'SCATHE',
        score: 100,
        chain: 10,
      },
      enemyFaction: {
        id: 777,
        name: 'Enemy',
        score: 90,
        chain: 4,
      },
      status: 'active',
      targetScore: 1_000,
      startsAt: now - 100,
      endsAt: null,
      observedAt: now,
    },
    targets,
    recommendations: [],
    observedAt: now,
  }
}

function spyRoom(
  individuals: readonly SpyTargetView[],
  factionTargets: readonly SpyTargetView[] = [],
): SpyRoomView {
  return {
    playerSearch: {
      phase: 'idle',
      query: '',
      results: [],
      message: null,
    },
    factionSearch: {
      phase: 'idle',
      query: '',
      results: [],
      message: null,
    },
    individualTargets: individuals,
    individualMessage: null,
    factionWorkspace: {
      faction: {
        id: 888,
        name: 'Spy Faction',
      },
      targets: factionTargets,
      observedAt: now,
      message: null,
    },
  }
}

describe('live Hospital view', () => {
  it('deduplicates WAR and Spy Room evidence and keeps war provenance', () => {
    const view = buildHospitalView(
      warBoard([
        warTarget({
          id: 1,
          name: 'Overlap',
          hospitalUntil: now + 900,
          statusObservedAt: now - 10,
        }),
      ]),
      spyRoom([
        spyTarget({
          id: 1,
          name: 'Overlap',
          hospitalUntil: now + 600,
          statusObservedAt: now,
        }),
      ]),
      new Set(),
    )

    expect(view.targets).toHaveLength(1)
    expect(view.targets[0]).toMatchObject({
      id: 1,
      level: 20,
      battleStats: '4.00k',
      fairFight: '2.00',
      releaseAt: now + 600,
      isWarTarget: true,
      sources: ['war', 'spy-individual'],
    })
    expect(hospitalSourceLabel(view.targets[0]!)).toBe(
      'WAR + SPY',
    )
  })

  it('lets fresher non-hospital evidence remove an obsolete hospital card', () => {
    const view = buildHospitalView(
      warBoard([
        warTarget({
          id: 1,
          name: 'Recovered',
          statusObservedAt: now - 10,
        }),
      ]),
      spyRoom([
        spyTarget({
          id: 1,
          name: 'Recovered',
          state: 'okay',
          status: 'Okay',
          hospitalUntil: null,
          statusObservedAt: now,
        }),
      ]),
      new Set(),
    )

    expect(view.targets).toEqual([])
  })

  it('sorts known release times soonest first and unknown release last', () => {
    const view = buildHospitalView(
      warBoard([]),
      spyRoom([
        spyTarget({
          id: 1,
          name: 'Later',
          hospitalUntil: now + 3600,
        }),
        spyTarget({
          id: 2,
          name: 'Sooner',
          hospitalUntil: now + 300,
        }),
        spyTarget({
          id: 3,
          name: 'Unknown',
          hospitalUntil: null,
        }),
      ]),
      new Set([2]),
    )

    expect(
      view.targets.map((target) => target.name),
    ).toEqual(['Sooner', 'Later', 'Unknown'])
    expect(view.targets[0]?.watched).toBe(true)
  })

  it('applies time windows and the wartime-only filter independently', () => {
    const view = buildHospitalView(
      warBoard([
        warTarget({
          id: 1,
          name: 'War Soon',
          hospitalUntil: now + 5 * 60,
        }),
      ]),
      spyRoom([
        spyTarget({
          id: 2,
          name: 'Spy Soon',
          hospitalUntil: now + 10 * 60,
        }),
        spyTarget({
          id: 3,
          name: 'Spy Later',
          hospitalUntil: now + 2 * 60 * 60,
        }),
      ]),
      new Set(),
    )

    expect(
      filterHospitalTargets(
        view.targets,
        'under-15m',
        now,
        true,
      ).map((target) => target.name),
    ).toEqual(['War Soon'])

    expect(
      filterHospitalTargets(
        view.targets,
        'under-15m',
        now,
        false,
      ).map((target) => target.name),
    ).toEqual(['War Soon', 'Spy Soon'])

    expect(
      filterHospitalTargets(
        view.targets,
        '1-to-3h',
        now,
        false,
      ).map((target) => target.name),
    ).toEqual(['Spy Later'])
  })

  it('never turns an expired countdown into an attack assumption', () => {
    const target = buildHospitalView(
      warBoard([]),
      spyRoom([
        spyTarget({
          id: 1,
          name: 'Awaiting',
          hospitalUntil: now - 1,
        }),
      ]),
      new Set(),
    ).targets[0]!

    expect(
      formatHospitalReleaseCountdown(
        target,
        now,
      ),
    ).toBe('AWAITING REFRESH')
  })
})
