import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  assessWarCandidate,
  selectWarRecommendations,
} from '../recommendations/select'

function candidate(
  playerId: number,
  enemyBattleStats: number,
  options: {
    availability?:
      | 'attackable'
      | 'unavailable'
      | 'unknown'
    confidence?:
      | 'high'
      | 'medium'
      | 'low'
      | 'unknown'
    freshness?:
      | 'usable'
      | 'stale'
      | 'unknown'
  } = {},
) {
  return {
    playerId,
    enemyBattleStats,
    availability:
      options.availability ??
      'attackable',
    confidence:
      options.confidence ??
      'high',
    freshness:
      options.freshness ??
      'usable',
  } as const
}

describe(
  'personalised WAR recommendations',
  () => {
    it(
      'treats the same enemy differently for users of different strength',
      () => {
        const enemy =
          candidate(
            9001,
            25_000,
          )

        expect(
          assessWarCandidate(
            5_000_000,
            enemy,
          ).strengthFit,
        ).toBe(
          'undermatched',
        )

        expect(
          assessWarCandidate(
            60_000,
            enemy,
          ).strengthFit,
        ).toBe(
          'useful-larger-margin',
        )

        expect(
          assessWarCandidate(
            20_000,
            enemy,
          ).suitability,
        ).toBe(
          'risky',
        )
      },
    )

    it(
      'prefers useful stronger opponents over tiny undermatches for a strong user',
      () => {
        const selected =
          selectWarRecommendations(
            100,
            5_000_000,
            [
              candidate(
                1,
                25_000,
              ),
              candidate(
                2,
                1_500_000,
              ),
              candidate(
                3,
                2_000_000,
              ),
              candidate(
                4,
                3_000_000,
              ),
            ],
          )

        expect(
          selected.slice(0, 3).map(
            (item) =>
              item.playerId,
          ),
        ).toEqual([2, 3, 4])

        expect(
          selected.at(-1)?.playerId,
        ).toBe(1)

        expect(
          selected,
        ).toHaveLength(4)
      },
    )

    it(
      'caps the default shortlist at ten qualified targets without padding',
      () => {
        const selected =
          selectWarRecommendations(
            100,
            1_000_000,
            Array.from(
              { length: 12 },
              (_, index) =>
                candidate(
                  index + 1,
                  300_000 +
                    index * 10_000,
                ),
            ),
          )

        expect(
          selected,
        ).toHaveLength(10)
      },
    )

    it(
      'retains undermatched opponents as fallbacks',
      () => {
        const selected =
          selectWarRecommendations(
            100,
            5_000_000,
            [
              candidate(
                1,
                100_000,
              ),
              candidate(
                2,
                200_000,
              ),
            ],
          )

        expect(
          selected,
        ).toHaveLength(2)

        expect(
          selected.every(
            (item) =>
              item.strengthFit ===
              'undermatched',
          ),
        ).toBe(true)
      },
    )

    it(
      'does not pad recommendations with unavailable targets',
      () => {
        const selected =
          selectWarRecommendations(
            100,
            1_000_000,
            [
              candidate(
                1,
                350_000,
              ),
              candidate(
                2,
                400_000,
                {
                  availability:
                    'unavailable',
                },
              ),
            ],
          )

        expect(
          selected.map(
            (item) =>
              item.playerId,
          ),
        ).toEqual([1])
      },
    )

    it(
      'can build a stable personalised pool without current-availability gating',
      () => {
        const selected =
          selectWarRecommendations(
            100,
            1_000_000,
            [
              candidate(
                1,
                350_000,
              ),
              candidate(
                2,
                400_000,
                {
                  availability:
                    'unavailable',
                },
              ),
            ],
            undefined,
            { requireAttackable: false },
          )

        expect(
          new Set(
            selected.map(
              (item) => item.playerId,
            ),
          ),
        ).toEqual(new Set([1, 2]))
        expect(
          selected.find(
            (item) => item.playerId === 2,
          ),
        ).toMatchObject({
          availability: 'unavailable',
          eligible: true,
          recommendationReason: 'good-fit',
        })
      },
    )

    it(
      'does not silently promote low-confidence or stale intelligence',
      () => {
        const selected =
          selectWarRecommendations(
            100,
            1_000_000,
            [
              candidate(
                1,
                350_000,
                {
                  confidence:
                    'low',
                },
              ),
              candidate(
                2,
                400_000,
                {
                  freshness:
                    'stale',
                },
              ),
              candidate(
                3,
                450_000,
              ),
            ],
          )

        expect(
          selected.map(
            (item) =>
              item.playerId,
          ),
        ).toEqual([3])
      },
    )

    it(
      'keeps close matches outside the automatic shortlist initially',
      () => {
        const selected =
          selectWarRecommendations(
            100,
            1_000_000,
            [
              candidate(
                1,
                800_000,
              ),
              candidate(
                2,
                950_000,
              ),
            ],
          )

        expect(
          selected,
        ).toEqual([])
      },
    )

    it(
      'is independent of incoming roster order',
      () => {
        const roster = [
          candidate(
            1,
            310_000,
          ),
          candidate(
            2,
            330_000,
          ),
          candidate(
            3,
            360_000,
          ),
          candidate(
            4,
            390_000,
          ),
        ]

        const first =
          selectWarRecommendations(
            123,
            1_000_000,
            roster,
          )

        const second =
          selectWarRecommendations(
            123,
            1_000_000,
            [...roster].reverse(),
          )

        expect(
          second.map(
            (item) =>
              item.playerId,
          ),
        ).toEqual(
          first.map(
            (item) =>
              item.playerId,
          ),
        )
      },
    )

    it(
      'can diversify comparable candidates across a population of users',
      () => {
        const roster = [
          candidate(
            11,
            310_000,
          ),
          candidate(
            12,
            320_000,
          ),
          candidate(
            13,
            330_000,
          ),
          candidate(
            14,
            340_000,
          ),
          candidate(
            15,
            345_000,
          ),
          candidate(
            16,
            349_000,
          ),
        ]

        const distinctOrders =
          new Set<string>()

        for (
          let userId = 1;
          userId <= 100;
          userId += 1
        ) {
          const selected =
            selectWarRecommendations(
              userId,
              1_000_000,
              roster,
            )

          distinctOrders.add(
            selected
              .map(
                (item) =>
                  item.playerId,
              )
              .join(','),
          )
        }

        expect(
          distinctOrders.size,
        ).toBeGreaterThan(1)
      },
    )

    it(
      'never lets diversification move an undermatch ahead of a preferred fit',
      () => {
        const selected =
          selectWarRecommendations(
            999999,
            1_000_000,
            [
              candidate(
                1,
                20_000,
              ),
              candidate(
                2,
                350_000,
              ),
            ],
          )

        expect(
          selected[0]
            ?.playerId,
        ).toBe(2)
      },
    )
  },
)
