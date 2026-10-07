import type {
  BattleIntel,
  BattleIntelSnapshot,
  CurrentUser,
  EpochSeconds,
  FactionRosterSnapshot,
  Player,
} from '../types'
import {
  deriveAvailability,
} from '../intel/availability'
import {
  selectCurrentUserBattleStats,
} from '../intel/current-user-battle-stats'
import {
  assessBattleIntel,
  type BattleIntelAssessmentPolicy,
} from '../intel/battle-intel'
import {
  assessWarCandidate,
  selectWarRecommendations,
  type WarCandidateAssessment,
  type WarCandidateInput,
} from './select'
import type {
  RecommendationPolicy,
} from './policy'
import {
  DEFAULT_RECOMMENDATION_POLICY,
} from './policy'

export interface LiveWarEvidencePolicy {
  statusMaxAgeSeconds: number
  battleIntel?: BattleIntelAssessmentPolicy
  recommendation?: RecommendationPolicy
}

export interface LiveWarTargetAssessment {
  player: Player
  intel: BattleIntel
  candidate: WarCandidateInput
  assessment: WarCandidateAssessment
}

export interface LiveWarAssessment {
  targets: readonly LiveWarTargetAssessment[]
  recommendations:
    readonly WarCandidateAssessment[]
}

function unavailableIntel(
  playerId: number,
): BattleIntel {
  return {
    playerId,
    estimatedBattleStats: null,
    publicBss: null,
    fairFight: null,
    updatedAt: null,
    source: 'unavailable',
  }
}

export function assessLiveWarTargets(
  currentUser: CurrentUser,
  roster: FactionRosterSnapshot,
  intelSnapshot: BattleIntelSnapshot,
  now: EpochSeconds,
  policy: LiveWarEvidencePolicy,
): LiveWarAssessment {
  if (
    intelSnapshot.callerPlayerId !==
    currentUser.id
  ) {
    throw new Error(
      'Battle intel belongs to a different HONJIN user.',
    )
  }

  const recommendationPolicy =
    policy.recommendation ??
    DEFAULT_RECOMMENDATION_POLICY
  const ownBattleStats =
    selectCurrentUserBattleStats(
      currentUser,
      now,
    ).total
  const intelByPlayerId = new Map(
    intelSnapshot.intel.map((intel) => [
      intel.playerId,
      intel,
    ]),
  )

  const targets = roster.members.map(
    (player): LiveWarTargetAssessment => {
      const intel =
        intelByPlayerId.get(player.id) ??
        unavailableIntel(player.id)
      const intelAssessment =
        policy.battleIntel
          ? assessBattleIntel(
              intel,
              now,
              policy.battleIntel,
            )
          : {
              confidence: 'unknown' as const,
              freshness: 'unknown' as const,
              ageSeconds: null,
            }
      const candidate: WarCandidateInput = {
        playerId: player.id,
        enemyBattleStats:
          intel.estimatedBattleStats,
        availability: deriveAvailability(
          player.status,
          roster.observedAt,
          now,
          policy.statusMaxAgeSeconds,
        ),
        confidence:
          intelAssessment.confidence,
        freshness:
          intelAssessment.freshness,
      }

      return {
        player,
        intel,
        candidate,
        assessment: assessWarCandidate(
          ownBattleStats,
          candidate,
          recommendationPolicy,
        ),
      }
    },
  )

  return {
    targets,
    recommendations:
      selectWarRecommendations(
        currentUser.id,
        ownBattleStats,
        targets.map(
          (target) =>
            target.candidate,
        ),
        recommendationPolicy,
        { requireAttackable: false },
      ),
  }
}
