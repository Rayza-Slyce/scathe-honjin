import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  assessBattleIntel,
  DEFAULT_BATTLE_INTEL_ASSESSMENT_POLICY,
  type BattleIntelAssessmentPolicy,
} from '../intel/battle-intel'
import {
  assessLiveWarTargets,
} from '../recommendations/live'
import type {
  BattleIntel,
  BattleIntelSnapshot,
  CurrentUser,
  FactionRosterSnapshot,
} from '../types'

const policy: BattleIntelAssessmentPolicy = {
  highConfidenceMaxAgeSeconds: 60,
  mediumConfidenceMaxAgeSeconds: 300,
  usableMaxAgeSeconds: 600,
}

function intel(
  overrides: Partial<BattleIntel> = {},
): BattleIntel {
  return {
    playerId: 9001,
    estimatedBattleStats: 400_000,
    publicBss: 380_000,
    fairFight: 1.7,
    updatedAt: 9_900,
    source: 'ffscouter-public-bss',
    ...overrides,
  }
}

describe('battle-intel confidence and freshness', () => {
  it('uses the initial field-calibrated public-BSS age bands', () => {
    const day = 24 * 60 * 60
    const now = 10 * day

    expect(
      assessBattleIntel(
        intel({ updatedAt: now - day }),
        now,
        DEFAULT_BATTLE_INTEL_ASSESSMENT_POLICY,
      ),
    ).toMatchObject({
      confidence: 'high',
      freshness: 'usable',
    })

    expect(
      assessBattleIntel(
        intel({ updatedAt: now - 3 * day }),
        now,
        DEFAULT_BATTLE_INTEL_ASSESSMENT_POLICY,
      ),
    ).toMatchObject({
      confidence: 'medium',
      freshness: 'usable',
    })

    expect(
      assessBattleIntel(
        intel({ updatedAt: now - 4 * day }),
        now,
        DEFAULT_BATTLE_INTEL_ASSESSMENT_POLICY,
      ),
    ).toMatchObject({
      confidence: 'low',
      freshness: 'usable',
    })

    expect(
      assessBattleIntel(
        intel({ updatedAt: now - 8 * day }),
        now,
        DEFAULT_BATTLE_INTEL_ASSESSMENT_POLICY,
      ),
    ).toMatchObject({
      confidence: 'low',
      freshness: 'stale',
    })
  })

  it('derives broad confidence from explicit age thresholds', () => {
    expect(
      assessBattleIntel(
        intel({ updatedAt: 9_950 }),
        10_000,
        policy,
      ),
    ).toEqual({
      confidence: 'high',
      freshness: 'usable',
      ageSeconds: 50,
    })

    expect(
      assessBattleIntel(
        intel({ updatedAt: 9_800 }),
        10_000,
        policy,
      ),
    ).toEqual({
      confidence: 'medium',
      freshness: 'usable',
      ageSeconds: 200,
    })
  })

  it('marks old evidence stale without changing the estimate itself', () => {
    expect(
      assessBattleIntel(
        intel({ updatedAt: 9_000 }),
        10_000,
        policy,
      ),
    ).toEqual({
      confidence: 'low',
      freshness: 'stale',
      ageSeconds: 1_000,
    })
  })

  it('uses unknown when usable source, estimate or timestamp evidence is missing', () => {
    expect(
      assessBattleIntel(
        intel({
          estimatedBattleStats: null,
        }),
        10_000,
        policy,
      ),
    ).toEqual({
      confidence: 'unknown',
      freshness: 'unknown',
      ageSeconds: null,
    })
  })

  it('rejects unordered threshold configuration', () => {
    expect(() =>
      assessBattleIntel(
        intel(),
        10_000,
        {
          highConfidenceMaxAgeSeconds: 600,
          mediumConfidenceMaxAgeSeconds: 300,
          usableMaxAgeSeconds: 900,
        },
      ),
    ).toThrow(
      'Battle-intel age thresholds must be non-negative and ordered high <= medium <= usable.',
    )
  })
})

describe('live WAR evidence composition', () => {
  const currentUser: CurrentUser = {
    id: 101,
    name: 'SCATHE member',
    faction: {
      id: 500,
      name: 'SCATHE',
    },
    battleStatsTotal: 1_000_000,
  }

  const roster: FactionRosterSnapshot = {
    factionId: 600,
    observedAt: 9_990,
    members: [
      {
        id: 9001,
        name: 'Available',
        level: 50,
        factionPosition: 'Member',
        status: {
          state: 'okay',
          description: 'Okay',
          details: null,
          planeImageType: null,
          hospitalUntil: null,
          lastAction: {
            status: 'Online',
            relative: '1 minute ago',
            at: 9_940,
          },
        },
      },
      {
        id: 9002,
        name: 'Hospital',
        level: 50,
        factionPosition: 'Member',
        status: {
          state: 'hospital',
          description: 'Hospital',
          details: null,
          planeImageType: null,
          hospitalUntil: 10_300,
          lastAction: {
            status: null,
            relative: null,
            at: null,
          },
        },
      },
      {
        id: 9003,
        name: 'No intel',
        level: 50,
        factionPosition: 'Member',
        status: {
          state: 'okay',
          description: 'Okay',
          details: null,
          planeImageType: null,
          hospitalUntil: null,
          lastAction: {
            status: null,
            relative: null,
            at: null,
          },
        },
      },
    ],
  }

  const intelSnapshot: BattleIntelSnapshot = {
    callerPlayerId: 101,
    observedAt: 10_000,
    intel: [
      intel({
        playerId: 9001,
        estimatedBattleStats: 400_000,
        updatedAt: 9_900,
      }),
      intel({
        playerId: 9002,
        estimatedBattleStats: 350_000,
        updatedAt: 9_950,
      }),
    ],
  }

  it('joins Torn availability and FFScouter intel by player ID before selecting recommendations', () => {
    const result = assessLiveWarTargets(
      currentUser,
      roster,
      intelSnapshot,
      10_000,
      {
        statusMaxAgeSeconds: 30,
        battleIntel: policy,
      },
    )

    expect(
      result.targets.map((target) => ({
        playerId: target.player.id,
        availability:
          target.candidate.availability,
        confidence:
          target.candidate.confidence,
        freshness:
          target.candidate.freshness,
        suitability:
          target.assessment.suitability,
      })),
    ).toEqual([
      {
        playerId: 9001,
        availability: 'attackable',
        confidence: 'medium',
        freshness: 'usable',
        suitability: 'hit-now',
      },
      {
        playerId: 9002,
        availability: 'unavailable',
        confidence: 'high',
        freshness: 'usable',
        suitability: 'hit-now',
      },
      {
        playerId: 9003,
        availability: 'attackable',
        confidence: 'unknown',
        freshness: 'unknown',
        suitability: 'unknown',
      },
    ])

    expect(
      result.recommendations.map(
        (target) => target.playerId,
      ),
    ).toEqual([9001])
  })

  it('refuses to reuse caller-specific FFScouter intel for another HONJIN user', () => {
    expect(() =>
      assessLiveWarTargets(
        {
          ...currentUser,
          id: 102,
        },
        roster,
        intelSnapshot,
        10_000,
        {
          statusMaxAgeSeconds: 30,
          battleIntel: policy,
        },
      ),
    ).toThrow(
      'Battle intel belongs to a different HONJIN user.',
    )
  })
})
