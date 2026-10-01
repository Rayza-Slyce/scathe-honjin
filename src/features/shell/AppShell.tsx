import {
  type FormEvent,
  useEffect,
  useState,
} from 'react'
import type {
  HonjinConnection,
} from '../../app/connect'
import type {
  FactionSearchMatch,
  PlayerSearchMatch,
} from '../../types'
import {
  deriveCurrentUserBattleStats,
} from '../../intel/current-user-battle-stats'
import {
  sortSpyTargets,
  type SpyRoomView,
  type SpyTargetSort,
  type SpyWorkspace,
} from '../targets/live-spy'
import type {
  WarBoardView,
  WarTargetView,
} from '../war/live-view'
import {
  filterHospitalTargets,
  formatHospitalReleaseCountdown,
  formatHospitalTimeRemaining,
  hospitalRemainingSeconds,
  hospitalSourceLabel,
} from '../hospital/live-hospital'
import type {
  HospitalTimeFilter,
  HospitalView,
} from '../hospital/live-hospital'
import type { LiveTravelWorkspace } from '../travel/workspace'
import { formatTravelTimeRemaining } from '../travel/timing'
import { filterTeamMembers, type TeamFilter, type TeamView } from '../team/live-team'
import ThemeControl from '../../theme/ThemeControl'
import ReadmeDialog from '../onboarding/ReadmeDialog'
import './shell.css'

export type AppScreen =
  | 'war'
  | 'targets'
  | 'hospital'
  | 'travel'
  | 'team'

type TargetsMode =
  | 'war-targets'
  | 'spy-room'

type SpyMode =
  | 'individual'
  | 'faction'

type WarFilter =
  | 'all'
  | 'okay'
  | 'hospital'
  | 'travelling'
  | 'abroad'

type WarSort =
  | 'best-for-me'
  | 'lowest-bs'
  | 'highest-ff'

type TravelFilter =
  | 'inbound'
  | 'outbound'
  | 'abroad'


interface AppShellProps {
  connection: HonjinConnection
  onDisconnect: () => void
  warBoard?: WarBoardView
  spyRoom?: SpyRoomView
  onSpyPlayerSearch?: (query: string) => void
  onSpyPlayerSelect?: (match: PlayerSearchMatch) => void
  onSpyPlayerRemove?: (playerId: number) => void
  onSpyPlayersRemoveAll?: () => void
  onSpyFactionSearch?: (query: string) => void
  onSpyFactionSelect?: (match: FactionSearchMatch) => void
  onSpyFactionRemove?: () => void
  onSpyWorkspaceChange?: (
    workspace: SpyWorkspace | null,
  ) => void
  onSpyRefresh?: (workspace: SpyWorkspace) => void
  hospitalView?: HospitalView
  hospitalNow?: number
  liveNow?: number
  travelWorkspace?: LiveTravelWorkspace | null
  teamView?: TeamView
  travelIncludeNonWar?: boolean
  onTravelIncludeNonWarChange?: (include: boolean) => void
  onScreenChange?: (screen: AppScreen) => void
}

interface TargetCardProps {
  name: string
  id: number
  level?: number | null
  battleStats: string
  fairFight: string
  suitability:
    | 'EASY'
    | 'GOOD'
    | 'VIABLE'
    | 'RISKY'
    | 'AVOID'
    | 'UNKNOWN'
  confidence: string
  status: string
  statusStale?: boolean
  presence?: 'online' | 'idle' | 'offline' | 'unknown'
  health?: string
  recommendation?:
    | 'GOOD FIT'
    | 'LOWER-STRENGTH OPTION'
    | 'LIMITED INTEL'
  attackable?: boolean
  onIntel: () => void
  onRemove?: () => void
}

const navItems: readonly {
  id: AppScreen
  label: string
  glyph: string
}[] = [
  {
    id: 'war',
    label: 'WAR',
    glyph: '⚔',
  },
  {
    id: 'targets',
    label: 'TARGETS',
    glyph: '◎',
  },
  {
    id: 'hospital',
    label: 'HOSPITAL',
    glyph: '✚',
  },
  {
    id: 'travel',
    label: 'TRAVEL',
    glyph: '✈',
  },
  {
    id: 'team',
    label: 'TEAM',
    glyph: '◆',
  },
]

const warTargets = [
  {
    name: 'Old_Nick',
    id: 410021,
    battleStats: '4.74k',
    battleStatsValue: 4740,
    fairFight: '2.11',
    fairFightValue: 2.11,
    suitability: 'GOOD' as const,
    confidence: 'HIGH',
    status: 'Okay · Active 2m',
    state: 'okay' as const,
    health: '820 / 4.5k · 18%',
    recommendation: 'GOOD FIT' as const,
    attackable: true,
  },
  {
    name: 'GlassTiger',
    id: 410024,
    battleStats: '5.16k',
    battleStatsValue: 5160,
    fairFight: '2.36',
    fairFightValue: 2.36,
    suitability: 'GOOD' as const,
    confidence: 'HIGH',
    status: 'Okay · Active 4m',
    state: 'okay' as const,
    health: '3.8k / 4.8k · 79%',
    recommendation: 'GOOD FIT' as const,
    attackable: true,
  },
  {
    name: 'AshenFox',
    id: 410025,
    battleStats: '5.83k',
    battleStatsValue: 5830,
    fairFight: '2.54',
    fairFightValue: 2.54,
    suitability: 'GOOD' as const,
    confidence: 'MEDIUM',
    status: 'Okay · Active 1m',
    state: 'okay' as const,
    health: '2.1k / 4.6k · 46%',
    recommendation: 'GOOD FIT' as const,
    attackable: true,
  },
  {
    name: 'IronVulture',
    id: 410022,
    battleStats: '2.18k',
    battleStatsValue: 2180,
    fairFight: '1.92',
    fairFightValue: 1.92,
    suitability: 'EASY' as const,
    confidence: 'HIGH',
    status: 'Okay · Active 5m',
    state: 'okay' as const,
    health: '4.2k / 4.5k · 93%',
    recommendation:
      'LOWER-STRENGTH OPTION' as const,
    attackable: true,
  },
  {
    name: 'RookSeven',
    id: 410023,
    battleStats: '8.96k',
    battleStatsValue: 8960,
    fairFight: '2.87',
    fairFightValue: 2.87,
    suitability: 'RISKY' as const,
    confidence: 'MEDIUM',
    status: 'Hospital · 08:42',
    state: 'hospital' as const,
    health: '0 / 5.1k · 0%',
    recommendation: undefined,
    attackable: false,
  },
  {
    name: 'Jetstream',
    id: 410026,
    battleStats: '5.92k',
    battleStatsValue: 5920,
    fairFight: '2.28',
    fairFightValue: 2.28,
    suitability: 'GOOD' as const,
    confidence: 'MEDIUM',
    status: 'Travelling · Argentina',
    state: 'travelling' as const,
    health: '4.0k / 4.4k · 91%',
    recommendation: undefined,
    attackable: false,
  },
  {
    name: 'ForeignGhost',
    id: 410027,
    battleStats: '6.12k',
    battleStatsValue: 6120,
    fairFight: '2.62',
    fairFightValue: 2.62,
    suitability: 'VIABLE' as const,
    confidence: 'MEDIUM',
    status: 'Abroad · Switzerland',
    state: 'abroad' as const,
    health: '3.4k / 4.7k · 72%',
    recommendation: undefined,
    attackable: false,
  },
] as const

type WarTargetCardData =
  | (typeof warTargets)[number]
  | WarTargetView

const individualRecon = [
  {
    name: 'NightMare',
    id: 510101,
    battleStats: '6.42k',
    fairFight: '2.34',
    suitability: 'VIABLE' as const,
    confidence: 'MEDIUM',
    status: 'Okay · Active 8m',
    health: '3.9k / 4.5k · 87%',
    recommendation: 'GOOD FIT' as const,
    attackable: true,
  },
  {
    name: 'RedHarbour',
    id: 510102,
    battleStats: '3.77k',
    fairFight: '2.05',
    suitability: 'GOOD' as const,
    confidence: 'HIGH',
    status: 'Travelling · Mexico',
    health: '4.1k / 4.3k · 95%',
    recommendation:
      'LOWER-STRENGTH OPTION' as const,
    attackable: false,
  },
] as const

const travelReasoning:
  Record<string, readonly string[]> = {
    RedHarbour: [
      'Observed aircraft image: light aircraft.',
      'Public property evidence includes an Airstrip.',
      'HONJIN rule: light aircraft plus a fresh Private Island Airstrip supports likely Airstrip travel.',
      'The ETA remains an approximate window rather than an exact arrival promise.',
    ],
    BlueAsh: [
      'Observed aircraft image: airliner.',
      'Airliner evidence does not distinguish Standard travel from Business Class travel.',
      'HONJIN therefore keeps the method ambiguous and confidence at MEDIUM.',
      'The ETA remains broad because the exact airline method is unresolved.',
    ],
    PalmGhost: [
      'Player is currently observed abroad rather than in flight.',
      'There is no active arrival leg to estimate.',
      'HONJIN shows the location state without inventing an ETA.',
    ],
  }

function formatBattleStats(
  value: number,
): string {
  return new Intl.NumberFormat(
    'en-GB',
  ).format(value)
}



function deriveModifiedBattleStats(
  stats: Parameters<typeof deriveCurrentUserBattleStats>[0],
): { total: number; baseTotal: number; delta: number } | null {
  const derived = deriveCurrentUserBattleStats(stats)

  return derived
    ? {
        total: derived.adjustedTotal,
        baseTotal: derived.baseTotal,
        delta: derived.delta,
      }
    : null
}

function deriveModifiedBattleStatValue(
  value: number,
  modifier: number,
): number {
  return Math.round(value * (1 + modifier / 100))
}

function formatSignedModifier(
  value: number,
): string {
  if (!Number.isFinite(value)) {
    return 'Unknown'
  }

  return `${value > 0 ? '+' : ''}${value}`
}

function formatModifierEvidence(
  modifiers: readonly {
    effect: string
    type: string
    value: number
  }[],
): string {
  if (modifiers.length === 0) {
    return 'No detail rows'
  }

  return modifiers
    .map((modifier) =>
      `${modifier.effect} · ${modifier.type} · ${formatSignedModifier(modifier.value)}`,
    )
    .join(' | ')
}

function formatObservedAt(
  value: number | null,
): string {
  if (value === null) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value * 1000))
}

function formatRatio(
  value: number | null,
): string {
  return value === null
    ? 'Unknown'
    : `${Math.round(value * 100)}% of your BS`
}

function formatStrengthFit(
  value: WarTargetView['strengthFit'],
): string {
  switch (value) {
    case 'useful-larger-margin':
      return 'Useful match · larger margin'
    case 'useful-smaller-margin':
      return 'Useful match · smaller margin'
    case 'undermatched':
      return 'Undermatched fallback'
    case 'close':
      return 'Close match · manual consideration'
    case 'above-own':
      return 'Above own estimated strength'
    default:
      return 'Unknown'
  }
}

function TargetCard({
  name,
  id,
  level,
  battleStats,
  fairFight,
  suitability,
  confidence,
  status,
  statusStale = false,
  presence,
  health,
  recommendation,
  attackable = true,
  onIntel,
  onRemove,
}: TargetCardProps) {
  const suitabilityClass =
    suitability
      .toLowerCase()
      .replace(' ', '-')

  return (
    <article className="target-card">
      <div className="target-card__top">
        <button
          type="button"
          className="player-detail-trigger target-card__identity"
          onClick={onIntel}
          aria-label={`Player details for ${name}`}
        >
          <strong className="target-card__player-name">
            {presence ? <span className={`presence presence--${presence}`} aria-hidden="true" /> : null}
            {name}
          </strong>
          {level !== undefined && level !== null ? <span>LVL {level}</span> : null}
        </button>

        <div className="target-card__actions">
          {onRemove && (
            <button
              type="button"
              className="remove-button"
              onClick={onRemove}
              aria-label={`Remove ${name} from Spy Room`}
            >
              REMOVE
            </button>
          )}

          <button
            type="button"
            className="intel-button"
            onClick={onIntel}
            aria-label={`Intel for ${name}`}
          >
            ⓘ
          </button>
        </div>
      </div>

      <div className="target-card__intel">
        <span>
          Est. BS
          <strong>{battleStats}</strong>
        </span>

        <span>
          FF for you
          <strong>{fairFight}</strong>
        </span>
      </div>

      {health && (
        <div className="target-card__health">
          <span>HP</span>
          <strong>{health}</strong>
        </div>
      )}

      <div className="target-card__classification">
        <span className="classification-key">
          SUITABILITY
        </span>

        <span
          className={
            `suitability suitability--${suitabilityClass}`
          }
        >
          {suitability}
        </span>

        <span className="confidence">
          {confidence}
        </span>
      </div>

      {recommendation && (
        <div className="recommendation-reason">
          {recommendation}
        </div>
      )}

      <div className="target-card__bottom">
        <span>
          {status}
          {statusStale ? ' · stale' : ''}
        </span>

        {attackable ? (
          <a
            className="attack-button"
            href={`https://www.torn.com/profiles.php?XID=${id}`}
            target="_blank"
            rel="noreferrer"
            title="Open Torn profile to attack"
          >
            ATTACK
          </a>
        ) : (
          <span
            className="attack-button attack-button--disabled"
            aria-label={`${name} unavailable`}
          >
            UNAVAILABLE
          </span>
        )}
      </div>
    </article>
  )
}

export default function AppShell({
  connection,
  onDisconnect,
  warBoard,
  spyRoom,
  onSpyPlayerSearch,
  onSpyPlayerSelect,
  onSpyPlayerRemove,
  onSpyPlayersRemoveAll,
  onSpyFactionSearch,
  onSpyFactionSelect,
  onSpyFactionRemove,
  onSpyWorkspaceChange,
  onSpyRefresh,
  hospitalView,
  hospitalNow,
  liveNow,
  travelWorkspace,
  teamView,
  travelIncludeNonWar = false,
  onTravelIncludeNonWarChange,
  onScreenChange,
}: AppShellProps) {
  const [screen, setScreen] =
    useState<AppScreen>('war')

  const [targetsMode, setTargetsMode] =
    useState<TargetsMode>('war-targets')

  const [spyMode, setSpyMode] =
    useState<SpyMode>('individual')

  const [userStatsOpen, setUserStatsOpen] =
    useState(false)

  const [readmeOpen, setReadmeOpen] =
    useState(false)

  const [intelPlayer, setIntelPlayer] = useState<{
    name: string
    id: number | null
    level?: number | null
    status?: string
    lastAction?: string
    source?: string
    kind?: 'target' | 'team'
    factionRank?: string | null
    battleStatsValue?: number | null
    battleStatsUpdatedAt?: number | null
    statusObservedAt?: number | null
    travelEta?: { earliestAt: number; latestAt: number } | null
    travelTimingConfidence?: string | null
    hospitalUntil?: number | null
  } | null>(null)
  const intelPlayerId = intelPlayer?.id ?? null

  const [
    individualSearch,
    setIndividualSearch,
  ] = useState('')

  const [
    factionSearch,
    setFactionSearch,
  ] = useState('')

  const [searchMessage, setSearchMessage] =
    useState<string | null>(null)

  const [warFilter, setWarFilter] =
    useState<WarFilter>('all')

  const [warSort, setWarSort] =
    useState<WarSort>('best-for-me')

  const [
    individualSpySort,
    setIndividualSpySort,
  ] = useState<SpyTargetSort>('default')

  const [
    factionSpySort,
    setFactionSpySort,
  ] = useState<SpyTargetSort>('level-desc')

  const [
    hospitalFilter,
    setHospitalFilter,
  ] = useState<HospitalTimeFilter>('all')

  const activeHospitalWarId =
    hospitalView?.activeWarId ?? null
  const [hospitalWarFilter, setHospitalWarFilter] =
    useState({
      warId: null as number | null,
      enabled: true,
    })
  const hospitalWarOnly =
    activeHospitalWarId !== null &&
    hospitalWarFilter.warId === activeHospitalWarId
      ? hospitalWarFilter.enabled
      : true

  const [travelFilter, setTravelFilter] =
    useState<TravelFilter>('inbound')

  const [teamFilter, setTeamFilter] =
    useState<TeamFilter>('all')

  useEffect(() => {
    onSpyWorkspaceChange?.(
      screen === 'targets' &&
        targetsMode === 'spy-room'
        ? spyMode
        : null,
    )
  }, [
    onSpyWorkspaceChange,
    screen,
    spyMode,
    targetsMode,
  ])

  useEffect(() => {
    onScreenChange?.(screen)
  }, [onScreenChange, screen])

  const liveWarIntelTarget =
    intelPlayerId !== null &&
    warBoard?.phase === 'ready'
      ? warBoard.targets.find(
          (target) =>
            target.id ===
            intelPlayerId,
        ) ?? null
      : null

  const liveSpyIntelTarget =
    intelPlayerId !== null && spyRoom
      ? spyRoom.individualTargets.find(
          (target) =>
            target.id ===
            intelPlayerId,
        ) ??
        spyRoom.factionWorkspace?.targets.find(
          (target) =>
            target.id ===
            intelPlayerId,
        ) ??
        null
      : null

  const liveIntelTarget =
    targetsMode === 'spy-room'
      ? liveSpyIntelTarget ??
        liveWarIntelTarget
      : liveWarIntelTarget ??
        liveSpyIntelTarget

  const intelNow =
    liveNow ?? intelPlayer?.statusObservedAt ?? null

  function openIntel(
    name: string,
    id: number | null = null,
    detail: {
      level?: number | null
      status?: string
      lastAction?: string
      source?: string
      kind?: 'target' | 'team'
      factionRank?: string | null
      battleStatsValue?: number | null
      battleStatsUpdatedAt?: number | null
      statusObservedAt?: number | null
      travelEta?: { earliestAt: number; latestAt: number } | null
      travelTimingConfidence?: string | null
      hospitalUntil?: number | null
    } = {},
  ) {
    setIntelPlayer({ name, id, ...detail })
  }

  function closeIntel() {
    setIntelPlayer(null)
  }

  function submitSearch(
    event: FormEvent<HTMLFormElement>,
    kind: 'player' | 'faction',
  ) {
    event.preventDefault()

    const query =
      kind === 'player'
        ? individualSearch.trim()
        : factionSearch.trim()

    if (!query) {
      return
    }

    const liveSearch =
      kind === 'player'
        ? onSpyPlayerSearch
        : onSpyFactionSearch

    if (liveSearch) {
      setSearchMessage(null)
      liveSearch(query)
      return
    }

    setSearchMessage(
      `Static HONJIN-04 ${kind} search: "${query}". Live Torn name/ID lookup is wired in HONJIN-05.`,
    )
  }

  function renderWar() {
    if (warBoard?.phase === 'loading') {
      return (
        <>
          <section className="screen-heading">
            <div>
              <p className="section-kicker">
                RANKED WAR
              </p>
              <h1>WAR</h1>
            </div>

            <span className="stale-pill">
              LOADING
            </span>
          </section>

          <section className="panel live-state-panel">
            <strong>Loading live war state…</strong>
            <span>
              Torn roster and war evidence are being refreshed.
            </span>
          </section>
        </>
      )
    }

    if (warBoard?.phase === 'error') {
      return (
        <>
          <section className="screen-heading">
            <div>
              <p className="section-kicker">
                RANKED WAR
              </p>
              <h1>WAR</h1>
            </div>

            <span className="stale-pill">
              UNAVAILABLE
            </span>
          </section>

          <section className="panel live-state-panel">
            <strong>Live war data unavailable</strong>
            <span>
              {warBoard.message ??
                'HONJIN could not refresh Torn war state.'}
            </span>
          </section>
        </>
      )
    }

    if (
      warBoard?.phase === 'no-war' ||
      (warBoard && warBoard.war === null)
    ) {
      return (
        <>
          <section className="screen-heading">
            <div>
              <p className="section-kicker">
                RANKED WAR
              </p>
              <h1>WAR</h1>
            </div>

            <span className="stale-pill">
              NO WAR
            </span>
          </section>

          <section className="panel live-state-panel">
            <strong>No active Ranked War</strong>
            <span>
              Spy Room remains available for reconnaissance.
            </span>
            <button
              type="button"
              className="text-action"
              onClick={() => {
                setScreen('targets')
                setTargetsMode('spy-room')
              }}
            >
              OPEN SPY ROOM
            </button>
          </section>
        </>
      )
    }

    const liveWar = warBoard?.war ?? null
    const topTargets = warBoard
      ? warBoard.recommendations.slice(0, 3)
      : warTargets
          .filter(
            (target) =>
              target.attackable &&
              target.recommendation !==
                undefined,
          )
          .slice(0, 3)
    const ownName =
      liveWar?.ownFaction.name ?? 'SCATHE'
    const ownScore =
      liveWar?.ownFaction.score ?? 1_842
    const ownChain =
      liveWar?.ownFaction.chain ?? 42
    const enemyName =
      liveWar?.enemyFaction.name ??
      'IRON ORDER'
    const enemyScore =
      liveWar?.enemyFaction.score ?? 1_706
    const targetScore =
      liveWar?.targetScore ?? 2_500
    const scoreProgress =
      targetScore > 0
        ? Math.min(
            100,
            Math.max(
              0,
              (ownScore / targetScore) *
                100,
            ),
          )
        : 0

    return (
      <>
        <section className="screen-heading">
          <div>
            <p className="section-kicker">
              ACTIVE RANKED WAR
            </p>
            <h1>WAR</h1>
          </div>

          <span
            className={
              warBoard?.stale
                ? 'stale-pill'
                : 'live-pill'
            }
          >
            {warBoard?.stale
              ? 'STALE'
              : 'LIVE'}
          </span>
        </section>

        <section className="war-score panel">
          <div>
            <span>{ownName}</span>
            <strong>
              {formatBattleStats(
                ownScore,
              )}
            </strong>
          </div>

          <div className="war-score__centre">
            <small>
              TARGET{' '}
              {formatBattleStats(
                targetScore,
              )}
            </small>
            <div className="score-track">
              <span
                style={{
                  width: `${scoreProgress}%`,
                }}
              />
            </div>
            <small>
              Chain {ownChain}
              {warBoard
                ? ''
                : ' / 100'}
            </small>
          </div>

          <div>
            <span>{enemyName}</span>
            <strong>
              {formatBattleStats(
                enemyScore,
              )}
            </strong>
          </div>
        </section>

        {warBoard?.message && (
          <p
            className="live-message"
            role="status"
          >
            {warBoard.message}
          </p>
        )}

        <section className="section-block">
          <div className="section-title-row">
            <div>
              <p className="section-kicker">
                PERSONALISED
              </p>
              <h2>Top targets</h2>
            </div>

            <button
              type="button"
              className="text-action"
              onClick={() => {
                setScreen('targets')
                setTargetsMode(
                  'war-targets',
                )
              }}
            >
              ALL TARGETS
            </button>
          </div>

          {topTargets.length > 0 ? (
            <div className="card-stack">
              {topTargets.map(
                (target) => (
                  <TargetCard
                    key={target.id}
                    {...target}
                    onIntel={() =>
                      openIntel(
                        target.name,
                        target.id,
                      )
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <section className="panel live-state-panel">
              <strong>
                No supported recommendations
              </strong>
              <span>
                Live roster intelligence is available under TARGETS. HONJIN will not auto-promote targets until availability and intelligence confidence are sufficiently supported.
              </span>
            </section>
          )}
        </section>
      </>
    )
  }


  function renderSpyRoom() {
    const isIndividual =
      spyMode === 'individual'
    const liveIndividualTargets =
      spyRoom?.individualTargets ?? null
    const individualCount =
      liveIndividualTargets?.length ??
      individualRecon.length
    const playerSearch =
      spyRoom?.playerSearch ?? null
    const factionSearchState =
      spyRoom?.factionSearch ?? null
    const factionWorkspace =
      spyRoom?.factionWorkspace ?? null
    const sortedIndividualTargets =
      liveIndividualTargets
        ? sortSpyTargets(
            liveIndividualTargets,
            individualSpySort,
          )
        : null
    const sortedFactionTargets =
      factionWorkspace
        ? sortSpyTargets(
            factionWorkspace.targets,
            factionSpySort,
          )
        : []

    const renderSpySort = (
      value: SpyTargetSort,
      onChange: (sort: SpyTargetSort) => void,
      ariaLabel: string,
      includeLevel = false,
    ) => (
      <label className="spy-sort-row">
        <span>SORT</span>
        <select
          aria-label={ariaLabel}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value as SpyTargetSort,
            )
          }
        >
          {includeLevel ? (
            <>
              <option value="level-desc">LEVEL · HIGH → LOW</option>
              <option value="level-asc">LEVEL · LOW → HIGH</option>
            </>
          ) : (
            <option value="default">DEFAULT ORDER</option>
          )}
          <option value="bs-asc">BS · LOW → HIGH</option>
          <option value="bs-desc">BS · HIGH → LOW</option>
          <option value="ff-asc">FF · LOW → HIGH</option>
          <option value="ff-desc">FF · HIGH → LOW</option>
          <option value="status-ready">STATUS · ATTACKABLE FIRST</option>
          <option value="status-blocked">STATUS · UNAVAILABLE FIRST</option>
          <option value="name-asc">NAME · A → Z</option>
        </select>
      </label>
    )

    return (
      <>
        <div className="segmented segmented--sub">
          <button
            type="button"
            className={
              isIndividual
                ? 'is-active'
                : ''
            }
            onClick={() =>
              setSpyMode('individual')
            }
          >
            INDIVIDUAL
          </button>

          <button
            type="button"
            className={
              !isIndividual
                ? 'is-active'
                : ''
            }
            onClick={() =>
              setSpyMode('faction')
            }
          >
            FACTION
          </button>
        </div>

        {isIndividual ? (
          <>
            <section className="recon-panel panel">
              <p className="section-kicker">
                PLAYER RECON
              </p>
              <h2>Find a player</h2>
              <p>
                Search by Torn player
                name or exact ID.
              </p>

              <form
                className="search-bar"
                onSubmit={(event) =>
                  submitSearch(
                    event,
                    'player',
                  )
                }
              >
                <label
                  htmlFor="player-recon-search"
                  className="sr-only"
                >
                  Player name or ID
                </label>

                <input
                  id="player-recon-search"
                  type="search"
                  value={
                    individualSearch
                  }
                  onChange={(event) =>
                    setIndividualSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Player name or ID"
                />

                <button type="submit">
                  SEARCH
                </button>
              </form>

              <div className="recon-panel__footer">
                <small>
                  {individualCount} / 10 saved
                </small>
                {spyRoom &&
                  individualCount > 0 && (
                    <span className="recon-panel__actions">
                      <button
                        type="button"
                        className="text-action"
                        onClick={() =>
                          onSpyRefresh?.(
                            'individual',
                          )
                        }
                      >
                        REFRESH
                      </button>
                      <button
                        type="button"
                        className="text-action"
                        onClick={onSpyPlayersRemoveAll}
                      >
                        REMOVE ALL
                      </button>
                    </span>
                  )}
              </div>
            </section>

            {playerSearch?.phase ===
              'loading' && (
              <p
                className="search-message"
                role="status"
              >
                Searching Torn players…
              </p>
            )}

            {playerSearch &&
              playerSearch.results.length >
                0 && (
                <section
                  className="search-results panel"
                  aria-label="Player search results"
                >
                  {playerSearch.results.map(
                    (match) => (
                      <button
                        key={match.id}
                        type="button"
                        aria-label={`${match.name} · Level ${match.level}${
                          match.factionId
                            ? ` · Faction [${match.factionId}]`
                            : ' · No faction'
                        } · LOAD`}
                        onClick={() =>
                          onSpyPlayerSelect?.(
                            match,
                          )
                        }
                      >
                        <span>
                          <strong>
                            {match.name}
                          </strong>
                          <small>
                            Level {match.level}
                            {match.factionId
                              ? ` · Faction [${match.factionId}]`
                              : ' · No faction'}
                          </small>
                        </span>
                        <strong>LOAD</strong>
                      </button>
                    ),
                  )}
                </section>
              )}

            {playerSearch?.message && (
              <p
                className="search-message"
                role="status"
              >
                {playerSearch.message}
              </p>
            )}

            {spyRoom?.individualMessage && (
              <p
                className="search-message"
                role="status"
              >
                {spyRoom.individualMessage}
              </p>
            )}

            {liveIndividualTargets &&
              liveIndividualTargets.length > 1 &&
              renderSpySort(
                individualSpySort,
                setIndividualSpySort,
                'Sort individual recon',
              )}

            <div className="card-stack">
              {sortedIndividualTargets ? (
                sortedIndividualTargets.length >
                0 ? (
                  sortedIndividualTargets.map(
                    (target) => (
                      <TargetCard
                        key={target.id}
                        {...target}
                        onIntel={() =>
                          openIntel(
                            target.name,
                            target.id,
                          )
                        }
                        onRemove={() =>
                          onSpyPlayerRemove?.(
                            target.id,
                          )
                        }
                      />
                    ),
                  )
                ) : (
                  <section className="panel live-state-panel">
                    <strong>
                      No individual recon targets
                    </strong>
                    <span>
                      Search for a player above or enter an exact Torn ID.
                    </span>
                  </section>
                )
              ) : (
                individualRecon.map(
                  (target) => (
                    <TargetCard
                      key={target.id}
                      {...target}
                      onIntel={() =>
                        openIntel(
                          target.name,
                          target.id,
                        )
                      }
                    />
                  ),
                )
              )}
            </div>
          </>
        ) : (
          <>
            <section className="recon-panel panel">
              <p className="section-kicker">
                FACTION RECON
              </p>
              <h2>Load a faction</h2>
              <p>
                Search by faction
                name or exact ID.
              </p>

              <form
                className="search-bar"
                onSubmit={(event) =>
                  submitSearch(
                    event,
                    'faction',
                  )
                }
              >
                <label
                  htmlFor="faction-recon-search"
                  className="sr-only"
                >
                  Faction name or ID
                </label>

                <input
                  id="faction-recon-search"
                  type="search"
                  value={factionSearch}
                  onChange={(event) =>
                    setFactionSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Faction name or ID"
                />

                <button type="submit">
                  SEARCH
                </button>
              </form>

              <small>
                One faction workspace
                at a time
              </small>
            </section>

            {factionSearchState?.phase ===
              'loading' && (
              <p
                className="search-message"
                role="status"
              >
                Loading Torn faction data…
              </p>
            )}

            {factionSearchState &&
              factionSearchState.results.length >
                0 && (
                <section
                  className="search-results panel"
                  aria-label="Faction search results"
                >
                  {factionSearchState.results.map(
                    (match) => (
                      <button
                        key={match.id}
                        type="button"
                        aria-label={`${match.name} [${match.id}] · ${match.members} members · LOAD`}
                        onClick={() =>
                          onSpyFactionSelect?.(
                            match,
                          )
                        }
                      >
                        <span>
                          <strong>
                            {match.name}
                          </strong>
                          <small>
                            [{match.id}] ·{' '}
                            {match.members}{' '}
                            members
                          </small>
                        </span>
                        <strong>LOAD</strong>
                      </button>
                    ),
                  )}
                </section>
              )}

            {factionSearchState?.message && (
              <p
                className="search-message"
                role="status"
              >
                {factionSearchState.message}
              </p>
            )}

            {spyRoom ? (
              factionWorkspace ? (
                <>
                  <section className="panel faction-preview">
                    <div>
                      <p className="section-kicker">
                        CURRENT WORKSPACE
                      </p>
                      <h2>
                        {factionWorkspace.faction.name}
                      </h2>
                      <span>
                        [{factionWorkspace.faction.id}]
                        {' · '}
                        {factionWorkspace.targets.length}{' '}
                        members
                      </span>
                    </div>

                    <div className="workspace-actions">
                      <span
                        className={
                          factionWorkspace.observedAt === 0 ||
                          (factionWorkspace.targets.length > 0 &&
                            factionWorkspace.targets.every(
                              (target) => target.statusStale,
                            ))
                            ? 'stale-pill'
                            : 'live-pill'
                        }
                      >
                        {factionWorkspace.observedAt === 0 ||
                        (factionWorkspace.targets.length > 0 &&
                          factionWorkspace.targets.every(
                            (target) => target.statusStale,
                          ))
                          ? 'STALE SNAPSHOT'
                          : 'LIVE SNAPSHOT'}
                      </span>
                      <span className="workspace-action-buttons">
                        <button
                          type="button"
                          className="text-action"
                          onClick={() =>
                            onSpyRefresh?.(
                              'faction',
                            )
                          }
                        >
                          REFRESH
                        </button>
                        <button
                          type="button"
                          className="text-action"
                          onClick={onSpyFactionRemove}
                        >
                          REMOVE
                        </button>
                      </span>
                    </div>
                  </section>

                  {factionWorkspace.message && (
                    <p
                      className="search-message"
                      role="status"
                    >
                      {factionWorkspace.message}
                    </p>
                  )}

                  {factionWorkspace.targets.length >
                    1 &&
                    renderSpySort(
                      factionSpySort,
                      setFactionSpySort,
                      'Sort faction recon',
                      true,
                    )}

                  <div className="card-stack">
                    {sortedFactionTargets.map(
                      (target) => (
                        <TargetCard
                          key={target.id}
                          {...target}
                          onIntel={() =>
                            openIntel(
                              target.name,
                              target.id,
                            )
                          }
                        />
                      ),
                    )}
                  </div>
                </>
              ) : (
                <section className="panel live-state-panel">
                  <strong>
                    No faction workspace loaded
                  </strong>
                  <span>
                    Search for a faction above or enter an exact Torn ID.
                  </span>
                </section>
              )
            ) : (
              <>
                <section className="panel faction-preview">
                  <div>
                    <p className="section-kicker">
                      CURRENT WORKSPACE
                    </p>
                    <h2>Black Flag</h2>
                    <span>
                      [918273] · 50 members
                    </span>
                  </div>

                  <span className="stale-pill">
                    STATIC
                  </span>
                </section>

                <div className="card-stack">
                  <TargetCard
                    name="BlackMamba"
                    id={610201}
                    battleStats="5.23k"
                    fairFight="2.22"
                    suitability="GOOD"
                    confidence="MEDIUM"
                    status="Okay · Active 11m"
                    onIntel={() =>
                      openIntel(
                        'BlackMamba',
                        610201,
                      )
                    }
                  />
                </div>
              </>
            )}
          </>
        )}

        {searchMessage && (
          <p
            className="search-message"
            role="status"
          >
            {searchMessage}
          </p>
        )}
      </>
    )
  }


  function renderTargets() {
    const sourceTargets:
      readonly WarTargetCardData[] =
        warBoard
          ? warBoard.phase === 'ready'
            ? warBoard.targets
            : []
          : warTargets

    let visibleTargets =
      sourceTargets.filter(
        (target) =>
          warFilter === 'all' ||
          target.state === warFilter,
      )

    if (warSort === 'lowest-bs') {
      visibleTargets = [
        ...visibleTargets,
      ].sort((left, right) => {
        const leftValue =
          left.battleStatsValue
        const rightValue =
          right.battleStatsValue

        if (leftValue === null) {
          return rightValue === null
            ? left.id - right.id
            : 1
        }

        if (rightValue === null) {
          return -1
        }

        return leftValue - rightValue
      })
    }

    if (warSort === 'highest-ff') {
      visibleTargets = [
        ...visibleTargets,
      ].sort((left, right) => {
        const leftValue =
          left.fairFightValue
        const rightValue =
          right.fairFightValue

        if (leftValue === null) {
          return rightValue === null
            ? left.id - right.id
            : 1
        }

        if (rightValue === null) {
          return -1
        }

        return rightValue - leftValue
      })
    }

    const cycleSort = () => {
      setWarSort((current) => {
        if (
          current === 'best-for-me'
        ) {
          return 'lowest-bs'
        }

        if (
          current === 'lowest-bs'
        ) {
          return 'highest-ff'
        }

        return 'best-for-me'
      })
    }

    const sortLabel =
      warSort === 'best-for-me'
        ? 'Best for me'
        : warSort === 'lowest-bs'
          ? 'Lowest BS'
          : 'Highest FF'

    const unavailableWarTargets =
      warBoard &&
      warBoard.phase !== 'ready'
        ? warBoard.phase === 'loading'
          ? {
              title: 'Loading live war targets…',
              detail:
                'HONJIN is refreshing the current Ranked War roster.',
            }
          : warBoard.phase === 'no-war'
            ? {
                title:
                  'No active Ranked War',
                detail:
                  'Use Spy Room for reconnaissance outside war.',
              }
            : {
                title:
                  'Live war targets unavailable',
                detail:
                  warBoard.message ??
                  'HONJIN could not refresh the current enemy roster.',
              }
        : null

    return (
      <>
        <section className="screen-heading">
          <div>
            <p className="section-kicker">
              COMBAT INTELLIGENCE
            </p>
            <h1>TARGETS</h1>
          </div>
        </section>

        <div className="segmented">
          <button
            type="button"
            className={
              targetsMode ===
              'war-targets'
                ? 'is-active'
                : ''
            }
            onClick={() =>
              setTargetsMode(
                'war-targets',
              )
            }
          >
            WAR TARGETS
          </button>

          <button
            type="button"
            className={
              targetsMode ===
              'spy-room'
                ? 'is-active'
                : ''
            }
            onClick={() =>
              setTargetsMode(
                'spy-room',
              )
            }
          >
            SPY ROOM
          </button>
        </div>

        {targetsMode ===
        'war-targets' ? (
          unavailableWarTargets ? (
            <section className="panel live-state-panel">
              <strong>
                {unavailableWarTargets.title}
              </strong>
              <span>
                {unavailableWarTargets.detail}
              </span>
              {warBoard?.phase ===
                'no-war' && (
                <button
                  type="button"
                  className="text-action"
                  onClick={() =>
                    setTargetsMode(
                      'spy-room',
                    )
                  }
                >
                  OPEN SPY ROOM
                </button>
              )}
            </section>
          ) : (
            <>
              {warBoard?.message && (
                <p
                  className="live-message"
                  role="status"
                >
                  {warBoard.message}
                </p>
              )}

              <div
                className="filter-strip"
                aria-label="War target filters"
              >
                {(
                  [
                    ['all', 'ALL'],
                    ['okay', 'OKAY'],
                    [
                      'hospital',
                      'HOSPITAL',
                    ],
                    [
                      'travelling',
                      'TRAVELLING',
                    ],
                    ['abroad', 'ABROAD'],
                  ] as const
                ).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        warFilter ===
                        value
                          ? 'is-active'
                          : ''
                      }
                      aria-pressed={
                        warFilter ===
                        value
                      }
                      onClick={() =>
                        setWarFilter(
                          value,
                        )
                      }
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>

              <div className="sort-row">
                <span>{sortLabel}</span>
                <button
                  type="button"
                  onClick={cycleSort}
                  aria-label="Change target sort"
                >
                  SORT ▾
                </button>
              </div>

              <div className="card-stack">
                {visibleTargets.map(
                  (target) => (
                    <TargetCard
                      key={target.id}
                      {...target}
                      onIntel={() =>
                        openIntel(
                          target.name,
                          target.id,
                        )
                      }
                    />
                  ),
                )}
              </div>
            </>
          )
        ) : (
          renderSpyRoom()
        )}
      </>
    )
  }


  function renderHospital() {
    if (hospitalView) {
      if (hospitalNow === undefined) {
        throw new Error(
          'hospitalNow is required when hospitalView is provided',
        )
      }
      const nowSeconds = hospitalNow
      const warOnly =
        hospitalView.activeWarId !== null &&
        hospitalWarOnly
      const visibleTargets =
        filterHospitalTargets(
          hospitalView.targets,
          hospitalFilter,
          nowSeconds,
          warOnly,
        )

      return (
        <>
          <section className="screen-heading">
            <div>
              <p className="section-kicker">
                OPPORTUNITY WINDOW
              </p>
              <h1>HOSPITAL</h1>
            </div>
          </section>

          {hospitalView.activeWarId !== null ? (
            <label className="war-only-control panel">
              <input
                type="checkbox"
                checked={hospitalWarOnly}
                onChange={(event) =>
                  setHospitalWarFilter({
                    warId: activeHospitalWarId,
                    enabled:
                      event.currentTarget.checked,
                  })
                }
              />
              <span>
                <strong>WAR TARGETS ONLY</strong>
                <small>
                  Keep non-war Spy Room targets out of the wartime opportunity list.
                </small>
              </span>
            </label>
          ) : null}

          {hospitalView.message ? (
            <p className="live-message">
              {hospitalView.message}
            </p>
          ) : null}

          <div
            className="filter-strip"
            aria-label="Hospital time filters"
          >
            {(
              [
                ['all', 'ALL'],
                ['under-15m', '<15M'],
                ['under-1h', '<1H'],
                ['1-to-3h', '1–3H'],
                ['over-3h', '3H+'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  hospitalFilter === value
                    ? 'is-active'
                    : ''
                }
                aria-pressed={
                  hospitalFilter === value
                }
                onClick={() =>
                  setHospitalFilter(value)
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="card-stack">
            {visibleTargets.length === 0 ? (
              <section className="panel empty-state">
                <strong>
                  No tracked hospital opportunities
                </strong>
                <small>
                  {warOnly
                    ? 'No current war targets match this hospital window.'
                    : 'Track opponents in WAR or Spy Room to populate this view.'}
                </small>
              </section>
            ) : (
              visibleTargets.map((target) => {
                const remaining =
                  hospitalRemainingSeconds(
                    target,
                    nowSeconds,
                  )
                const countdown =
                  formatHospitalReleaseCountdown(
                    target,
                    nowSeconds,
                  )

                return (
                  <article
                    className="status-card hospital-card"
                    key={target.id}
                  >
                    <div>
                      <button
                        type="button"
                        className="player-detail-trigger"
                        onClick={() => openIntel(target.name, target.id, {
                          level: target.level,
                          status: target.reason ?? 'Hospital',
                          source: hospitalSourceLabel(target),
                        })}
                        aria-label={`Player details for ${target.name}`}
                      >
                        <strong>{target.name}</strong>
                        <span>
                          {target.level !== null
                            ? `LVL ${target.level}`
                            : ''}
                        </span>
                      </button>
                      <small className="hospital-card__intel">
                        Est. BS {target.battleStats} · FF for you {target.fairFight} · {target.suitability}
                      </small>
                    </div>

                    <strong
                      className={
                        remaining !== null &&
                        remaining < 15 * 60
                          ? 'status-red'
                          : 'status-amber'
                      }
                    >
                      {countdown}
                    </strong>

                    {target.reason ? (
                      <small className="hospital-card__reason">
                        {target.reason}
                      </small>
                    ) : null}

                    <small>
                      {hospitalSourceLabel(target)}
                      {target.statusStale
                        ? ' · STALE SNAPSHOT'
                        : ''}
                    </small>
                  </article>
                )
              })
            )}
          </div>
        </>
      )
    }

    const hospitalTargets = [
      {
        name: 'RookSeven',
        id: 410023,
        minutes: 8,
        countdown: '08:42',
        watched: false,
      },
      {
        name: 'StoneCrown',
        id: 410031,
        minutes: 16,
        countdown: '16:08',
        watched: true,
      },
      {
        name: 'LongShadow',
        id: 410041,
        minutes: 92,
        countdown: '1:32:14',
        watched: false,
      },
      {
        name: 'DeepVault',
        id: 410051,
        minutes: 224,
        countdown: '3:44:09',
        watched: false,
      },
    ] as const

    const visibleTargets =
      hospitalTargets.filter(
        (target) => {
          switch (
            hospitalFilter
          ) {
            case 'under-15m':
              return (
                target.minutes < 15
              )
            case 'under-1h':
              return (
                target.minutes < 60
              )
            case '1-to-3h':
              return (
                target.minutes >= 60 &&
                target.minutes < 180
              )
            case 'over-3h':
              return (
                target.minutes >= 180
              )
            default:
              return true
          }
        },
      )

    return (
      <>
        <section className="screen-heading">
          <div>
            <p className="section-kicker">
              OPPORTUNITY WINDOW
            </p>
            <h1>HOSPITAL</h1>
          </div>
        </section>

        <div
          className="filter-strip"
          aria-label="Hospital time filters"
        >
          {(
            [
              ['all', 'ALL'],
              [
                'under-15m',
                '<15M',
              ],
              ['under-1h', '<1H'],
              ['1-to-3h', '1–3H'],
              ['over-3h', '3H+'],
            ] as const
          ).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  hospitalFilter ===
                  value
                    ? 'is-active'
                    : ''
                }
                aria-pressed={
                  hospitalFilter ===
                  value
                }
                onClick={() =>
                  setHospitalFilter(
                    value,
                  )
                }
              >
                {label}
              </button>
            ),
          )}
        </div>

        <div className="card-stack">
          {visibleTargets.map(
            (target) => (
              <article
                className="status-card"
                key={target.id}
              >
                <div>
                  <strong>
                    {target.name}
                  </strong>
                </div>

                <strong
                  className={
                    target.minutes < 15
                      ? 'status-red'
                      : 'status-amber'
                  }
                >
                  {target.countdown}
                </strong>

                <small>
                  Hospital
                  {target.watched
                    ? ' · watched locally'
                    : ' · release countdown'}
                </small>
              </article>
            ),
          )}
        </div>
      </>
    )
  }


  function renderTravel() {
    const travellers = travelWorkspace?.targets ?? []
    const visibleTravellers = travellers.filter((traveller) => {
      if (travelFilter === 'abroad') return traveller.state === 'abroad'
      return traveller.state === 'travelling' && traveller.route.direction === travelFilter
    })

    return (
      <>
        <section className="screen-heading">
          <div><p className="section-kicker">TRAVEL INTELLIGENCE</p><h1>TRAVEL</h1></div>
        </section>

        {travelWorkspace?.activeWar && (
          <label className="war-only-control panel">
            <input
              type="checkbox"
              checked={!travelIncludeNonWar}
              onChange={(event) => onTravelIncludeNonWarChange?.(!event.target.checked)}
            />
            <span><strong>WAR TARGETS ONLY</strong><small>Default during an active Ranked War. Disable to include saved Spy Room opponents.</small></span>
          </label>
        )}

        {travelWorkspace?.message && <p className="live-message" role="status">{travelWorkspace.message}</p>}


        <div className="filter-strip" aria-label="Travel state filters">
          {([['inbound', 'INBOUND'], ['outbound', 'OUTBOUND'], ['abroad', 'ABROAD']] as const).map(([value, label]) => (
            <button key={value} type="button" className={travelFilter === value ? 'is-active' : ''} aria-pressed={travelFilter === value} onClick={() => setTravelFilter(value)}>{label}</button>
          ))}
        </div>

        <div className="card-stack">
          {visibleTravellers.length === 0 && (
            <section className="panel empty-state"><strong>No tracked opponents in this travel state</strong><small>HONJIN only shows current WAR and saved Spy Room identities. Timing is shown only from observed evidence.</small></section>
          )}
          {visibleTravellers.map((traveller) => (
            <article className="travel-card panel" key={traveller.id}>
              <div className="travel-card__top">
                <button
                  type="button"
                  className="player-detail-trigger"
                  onClick={() => openIntel(traveller.name, traveller.id, {
                    level: traveller.level,
                    status: traveller.state === 'abroad'
                      ? `In ${traveller.route.destination ?? 'an unknown country'}`
                      : `${traveller.route.origin ?? 'Unknown'} → ${traveller.route.destination ?? 'Unknown'}`,
                    source: traveller.sourceLabel,
                  })}
                  aria-label={`Player details for ${traveller.name}`}
                >
                  <strong>{traveller.name}</strong>
                  <span>
                    {traveller.state === 'abroad'
                      ? `In ${traveller.route.destination ?? 'an unknown country'}`
                      : `${traveller.route.origin ?? 'Unknown'} → ${traveller.route.destination ?? 'Unknown'}`}
                  </span>
                </button>
                <span className="travel-pill">{traveller.state === 'abroad' ? 'ABROAD' : traveller.route.direction.toUpperCase()}</span>
              </div>
              <div className="travel-card__context">
                <span>{traveller.sourceLabel}</span><span>LVL {traveller.level ?? '—'}</span><span>BS {traveller.battleStats}</span><span>FF {traveller.fairFight}</span>
              </div>
              {traveller.state === 'travelling' ? (
                <>
                  <div className="travel-eta">
                    {traveller.eta === null
                      ? traveller.timingLabel
                      : `${traveller.alternateEta != null ? 'STANDARD · ' : ''}LANDS IN ${formatTravelTimeRemaining(
                          traveller.eta,
                          liveNow ?? traveller.statusObservedAt,
                        )}`}
                  </div>
                  <details className="travel-reasoning">
                    <summary>ⓘ WHY THIS ESTIMATE</summary>
                    <div className="travel-reasoning__evidence">
                      <strong>{traveller.method.label} · {traveller.method.confidence.toUpperCase()} method confidence</strong>
                      <span>{traveller.timingSource === 'observed-transition' ? 'OBSERVED' : 'NO TIMING SOURCE'} · {traveller.timingLabel} · {traveller.timingConfidence.toUpperCase()} timing confidence</span>
                      {traveller.alternateEta != null ? (
                        <span>
                          {traveller.alternateLabel ?? 'Alternate'} · LANDS IN {formatTravelTimeRemaining(
                            traveller.alternateEta,
                            liveNow ?? traveller.statusObservedAt,
                          )}
                        </span>
                      ) : null}
                      {traveller.statusUntil != null && traveller.statusUntil > traveller.statusObservedAt ? <span>Candidate Torn status time {new Date(traveller.statusUntil * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · validation only</span> : null}
                    </div>
                    <ul>{traveller.reasoning.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  </details>
                </>
              ) : null}
            </article>
          ))}
        </div>
      </>
    )
  }


  function renderTeam() {
    return (
      <>
        <section className="screen-heading">
          <div>
            <p className="section-kicker">
              SCATHE STATUS
            </p>
            <h1>TEAM</h1>
          </div>
        </section>

        <section className="panel own-profile">
          <img
            src="/icons/pwa-192.png"
            alt=""
          />

          <div>
            <span>
              CONNECTED AS
            </span>
            <strong>
              {connection.user.name}
              {' '}
            </strong>
            <small>
              Battle stats{' '}
              {formatBattleStats(
                connection.user
                  .battleStatsTotal,
              )}
            </small>
            {connection.user.life ? (
              <small>
                LIFE {formatBattleStats(connection.user.life.current)} / {formatBattleStats(connection.user.life.maximum)}
              </small>
            ) : null}
          </div>
        </section>



        {warBoard?.war?.status === 'active' ? (
          <section className="panel team-war-context">
            <span>RANKED WAR</span>
            <strong>{warBoard.war.ownFaction.score.toLocaleString()} SCORE · {warBoard.war.ownFaction.chain} CHAIN</strong>
          </section>
        ) : null}

        <div className="filter-strip team-filter-strip" aria-label="Team status filters">
          {([
            ['all', 'ALL'],
            ['okay', 'OKAY'],
            ['hospital', 'HOSPITAL'],
            ['travelling', 'TRAVELLING'],
            ['online', 'ONLINE'],
            ['offline', 'OFFLINE'],
          ] as const).map(([filter, label]) => (
            <button
              key={filter}
              type="button"
              className={teamFilter === filter ? 'is-active' : ''}
              onClick={() => setTeamFilter(filter)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="team-list-heading" aria-hidden="true"><span>MEMBER STATUS</span><span>LAST ACTION</span></div>
        <div className="team-list panel">
          {teamView?.phase === 'loading' && teamView.members.length === 0 ? <p className="team-message">Loading SCATHE roster…</p> : null}
          {teamView?.phase === 'error' && teamView.members.length === 0 ? <p className="team-message">{teamView.message}</p> : null}
          {teamView?.phase === 'ready' && teamView.members.length === 0 ? <p className="team-message">No SCATHE roster members returned.</p> : null}
          {teamView?.phase === 'ready' && teamView.members.length > 0 && filterTeamMembers(teamView.members, teamFilter).length === 0 ? <p className="team-message">No members match this filter.</p> : null}
          {filterTeamMembers(teamView?.members ?? [], teamFilter).map((member) => (
            <div key={member.player.id}>
              <span className={`presence presence--${member.presence}`} />
              <button
                type="button"
                className="team-member-copy player-detail-trigger"
                onClick={() => openIntel(member.player.name, member.player.id, {
                  kind: 'team',
                  level: member.player.level,
                  status: member.stateLabel,
                  lastAction: member.lastActionLabel,
                  factionRank: member.player.factionPosition,
                  battleStatsValue: member.battleStatsValue,
                  battleStatsUpdatedAt: member.battleStatsUpdatedAt,
                  statusObservedAt: teamView?.observedAt ?? null,
                  travelEta: member.travelTiming?.eta ?? null,
                  travelTimingConfidence: member.travelTiming?.confidence ?? null,
                  hospitalUntil: member.player.status.hospitalUntil,
                })}
                aria-label={`Player details for ${member.player.name}`}
              >
                <strong className="team-member-name">{member.player.name}<span className="team-member-level">LVL {member.player.level ?? '—'}</span></strong>
                <small>{member.stateLabel}{member.player.factionPosition ? ` · ${member.player.factionPosition}` : ''}</small>
              </button>
              <small className="team-last-action">{member.lastActionLabel}</small>
            </div>
          ))}
        </div>
        {teamView?.observedAt !== null && teamView?.observedAt !== undefined ? (
          <p className="team-stale-message">
            ROSTER OBSERVED {formatObservedAt(teamView.observedAt)}{teamView.stale ? ' · SAVED SNAPSHOT' : ''}
          </p>
        ) : null}
        {teamView?.message && teamView.members.length > 0 ? <p className="team-stale-message">{teamView.message}</p> : null}

        <button
          type="button"
          className="disconnect-button"
          onClick={onDisconnect}
        >
          DISCONNECT / FORGET DEVICE
        </button>
      </>
    )
  }

  return (
    <div className="honjin-shell">
      <header className="app-header">
        <div className="app-brand">
          <img
            className="honjin-emblem"
            src="/icons/pwa-192.png"
            alt=""
          />

          <div>
            <span>SCATHE</span>
            <strong>HONJIN</strong>
          </div>
        </div>

        <ThemeControl className="app-theme-toggle" />

        <button
          type="button"
          className="app-about-button"
          aria-label="About HONJIN"
          title="About HONJIN"
          onClick={() => setReadmeOpen(true)}
        >
          <span aria-hidden="true">i</span>
        </button>

        <button
          type="button"
          className="app-user"
          onClick={() => setUserStatsOpen(true)}
          aria-label={`Battle stats for ${connection.user.name}`}
        >
          <strong>
            {connection.user.name}
          </strong>
          <span>
            BS{' '}
            {formatBattleStats(
              connection.user
                .battleStatsTotal,
            )}
          </span>
          {(() => {
            const modified = deriveModifiedBattleStats(
              connection.user.battleStatsCurrent,
            )

            if (!modified) {
              return null
            }

            const tone =
              modified.delta > 0
                ? 'positive'
                : modified.delta < 0
                  ? 'negative'
                  : 'neutral'

            return (
              <span
                className={`app-user__modified app-user__modified--${tone}`}
              >
                MOD BS {formatBattleStats(modified.total)}
              </span>
            )
          })()}
          {connection.user.life ? (
            <span>
              LIFE {formatBattleStats(connection.user.life.current)} / {formatBattleStats(connection.user.life.maximum)}
            </span>
          ) : null}
        </button>
      </header>

      <div className="faction-banner-strip">
        <img
          src="/assets/scathe-banner.jpg"
          alt="SCATHE"
        />
      </div>

      <main className="app-content">
        {screen === 'war' &&
          renderWar()}

        {screen === 'targets' &&
          renderTargets()}

        {screen === 'hospital' &&
          renderHospital()}

        {screen === 'travel' &&
          renderTravel()}

        {screen === 'team' &&
          renderTeam()}
      </main>

      <nav
        className="bottom-nav"
        aria-label="Primary"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              screen === item.id
                ? 'is-active'
                : ''
            }
            aria-current={
              screen === item.id
                ? 'page'
                : undefined
            }
            onClick={() =>
              setScreen(item.id)
            }
          >
            <span
              className="bottom-nav__glyph"
              aria-hidden="true"
            >
              {item.glyph}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <ReadmeDialog
        open={readmeOpen}
        onClose={() => setReadmeOpen(false)}
      />

      {userStatsOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setUserStatsOpen(false)}
        >
          <aside
            className="intel-drawer user-stats-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Battle stats for ${connection.user.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-handle" />

            <div className="drawer-title">
              <div>
                <p className="section-kicker">CURRENT USER</p>
                <h2>{connection.user.name}</h2>
              </div>

              <button
                type="button"
                onClick={() => setUserStatsOpen(false)}
                aria-label="Close battle stats"
              >
                ×
              </button>
            </div>

            <dl className="intel-grid">
              <div>
                <dt>Torn ID</dt>
                <dd>{connection.user.id}</dd>
              </div>
              <div>
                <dt>Faction</dt>
                <dd>{connection.user.faction.name}</dd>
              </div>
              <div>
                <dt>Torn BS total</dt>
                <dd>{formatBattleStats(connection.user.battleStatsTotal)}</dd>
              </div>
              {connection.user.battleStatsCurrent ? (() => {
                const modified = deriveModifiedBattleStats(
                  connection.user.battleStatsCurrent,
                )

                return modified ? (
                  <div>
                    <dt>Modified BS</dt>
                    <dd className={
                      modified.delta > 0
                        ? 'stat-positive'
                        : modified.delta < 0
                          ? 'stat-negative'
                          : undefined
                    }>
                      {formatBattleStats(modified.total)}
                    </dd>
                  </div>
                ) : null
              })() : null}
              {connection.user.life ? (
                <div>
                  <dt>Life</dt>
                  <dd>{formatBattleStats(connection.user.life.current)} / {formatBattleStats(connection.user.life.maximum)}</dd>
                </div>
              ) : null}
              {connection.user.battleStatsCurrent ? (
                <div>
                  <dt>Observed</dt>
                  <dd>{formatObservedAt(connection.user.battleStatsCurrent.observedAt)}</dd>
                </div>
              ) : null}
            </dl>


            {connection.user.battleStatsCurrent ? (
              <section className="user-stats-breakdown">
                <p>
                  Torn v2 per-stat values with the reported modifiers applied. Personalised suitability and recommendation ratios use this current value while the snapshot is fresh.
                </p>
                <dl>
                  {([
                    ['Strength', connection.user.battleStatsCurrent.strength],
                    ['Defense', connection.user.battleStatsCurrent.defense],
                    ['Speed', connection.user.battleStatsCurrent.speed],
                    ['Dexterity', connection.user.battleStatsCurrent.dexterity],
                  ] as const).map(([label, stat]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        <strong>
                          {formatBattleStats(stat.value)} → {formatBattleStats(deriveModifiedBattleStatValue(stat.value, stat.modifier))}
                        </strong>
                        <span>TORN MOD {formatSignedModifier(stat.modifier)}</span>
                        <small>{formatModifierEvidence(stat.modifiers)}</small>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : (
              <p className="drawer-note">
                No detailed Torn battlestat modifier observation is available for this session.
              </p>
            )}
          </aside>
        </div>
      )}

      {intelPlayer && (
        <div
          className="drawer-backdrop"
          onClick={closeIntel}
        >
          <aside
            className="intel-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Intel for ${intelPlayer.name}`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="drawer-handle" />

            <div className="drawer-title">
              <div>
                <p className="section-kicker">
                  EXPLAINABLE INTEL
                </p>
                <h2>{intelPlayer.name}</h2>
              </div>

              <button
                type="button"
                onClick={closeIntel}
                aria-label="Close intel"
              >
                ×
              </button>
            </div>

            <dl className="intel-grid">
              {intelPlayerId !== null && (
                <div>
                  <dt>Torn ID</dt>
                  <dd>{intelPlayerId}</dd>
                </div>
              )}
              {intelPlayer.level !== undefined && intelPlayer.level !== null && (
                <div>
                  <dt>Level</dt>
                  <dd>{intelPlayer.level}</dd>
                </div>
              )}
              {intelPlayer.status && (
                <div>
                  <dt>Status</dt>
                  <dd>
                    {intelPlayer.kind === 'team' &&
                    intelPlayer.hospitalUntil &&
                    intelNow !== null
                      ? `Hospital · ${formatHospitalTimeRemaining(
                          intelPlayer.hospitalUntil,
                          intelNow,
                        )}`
                      : intelPlayer.status}
                  </dd>
                </div>
              )}
              {intelPlayer.lastAction && (
                <div>
                  <dt>Last action</dt>
                  <dd>{intelPlayer.lastAction}</dd>
                </div>
              )}
              {intelPlayer.kind === 'team' ? (
                <div>
                  <dt>Faction rank</dt>
                  <dd>{intelPlayer.factionRank ?? 'Unknown'}</dd>
                </div>
              ) : intelPlayer.source ? (
                <div>
                  <dt>Context</dt>
                  <dd>{intelPlayer.source}</dd>
                </div>
              ) : null}
              {intelPlayer.kind === 'team' ? (
                <>
                  <div>
                    <dt>Estimated BS</dt>
                    <dd>
                      {intelPlayer.battleStatsValue === null || intelPlayer.battleStatsValue === undefined
                        ? 'UNKNOWN'
                        : `${formatBattleStats(intelPlayer.battleStatsValue)} · FFScouter public BSS`}
                    </dd>
                  </div>
                  {intelPlayer.battleStatsUpdatedAt !== null && intelPlayer.battleStatsUpdatedAt !== undefined ? (
                    <div>
                      <dt>Estimate updated</dt>
                      <dd>{formatObservedAt(intelPlayer.battleStatsUpdatedAt)}</dd>
                    </div>
                  ) : null}
                  {intelPlayer.statusObservedAt !== null && intelPlayer.statusObservedAt !== undefined ? (
                    <div>
                      <dt>Status observed</dt>
                      <dd>{formatObservedAt(intelPlayer.statusObservedAt)}</dd>
                    </div>
                  ) : null}
                  {intelPlayer.travelEta && intelNow !== null ? (
                    <div>
                      <dt>Lands in</dt>
                      <dd>
                        {formatTravelTimeRemaining(
                          intelPlayer.travelEta,
                          intelNow,
                        )}
                        {intelPlayer.travelTimingConfidence
                          ? ` · ${intelPlayer.travelTimingConfidence.toUpperCase()} timing confidence`
                          : ''}
                      </dd>
                    </div>
                  ) : null}
                </>
              ) : liveIntelTarget ? (
                <>
                  <div>
                    <dt>Battle estimate</dt>
                    <dd>
                      {liveIntelTarget.battleStats}
                      {' · '}
                      FFScouter public BSS
                    </dd>
                  </div>
                  <div>
                    <dt>Fair Fight</dt>
                    <dd>
                      {liveIntelTarget.fairFight}
                      {' · for you'}
                    </dd>
                  </div>
                  <div>
                    <dt>Your BS used</dt>
                    <dd>
                      {formatBattleStats(
                        liveIntelTarget.ownBattleStatsUsed ??
                          connection.user.battleStatsTotal,
                      )}
                      {' · '}
                      {liveIntelTarget.ownBattleStatsAdjusted
                        ? 'MODIFIED'
                        : 'BASE FALLBACK'}
                    </dd>
                  </div>
                  <div>
                    <dt>Suitability</dt>
                    <dd>
                      {liveIntelTarget.suitability}
                      {' · '}
                      {formatRatio(
                        liveIntelTarget.ratio,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Strength fit</dt>
                    <dd>
                      {formatStrengthFit(
                        liveIntelTarget.strengthFit,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>
                      {liveIntelTarget.confidence}
                      {' · '}
                      {liveIntelTarget.freshness.toUpperCase()}
                    </dd>
                  </div>
                  <div>
                    <dt>Estimate updated</dt>
                    <dd>
                      {formatObservedAt(
                        liveIntelTarget.intelUpdatedAt,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Status observed</dt>
                    <dd>
                      {formatObservedAt(
                        liveIntelTarget.statusObservedAt,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Availability</dt>
                    <dd>
                      {liveIntelTarget.availability.toUpperCase()}
                    </dd>
                  </div>
                  {liveIntelTarget.healthObservedAt !== null && (
                      <div>
                        <dt>Health observed</dt>
                        <dd>
                          {formatObservedAt(
                            liveIntelTarget.healthObservedAt,
                          )}
                        </dd>
                      </div>
                    )}
                </>
              ) : (
                <>
                  <div>
                    <dt>Battle estimate</dt>
                    <dd>
                      FFScouter public/free BSS
                    </dd>
                  </div>
                  <div>
                    <dt>Fair Fight</dt>
                    <dd>
                      Current-user specific
                    </dd>
                  </div>
                  <div>
                    <dt>Suitability</dt>
                    <dd>
                      Deterministic BS-ratio band
                    </dd>
                  </div>
                  <div>
                    <dt>Freshness</dt>
                    <dd>
                      Static HONJIN-04 preview
                    </dd>
                  </div>
                </>
              )}
            </dl>

            {travelReasoning[
              intelPlayer.name
            ] && (
              <section className="reasoning-panel">
                <h3>
                  WHY THIS ESTIMATE
                </h3>

                <ul>
                  {travelReasoning[
                    intelPlayer.name
                  ].map(
                    (reason) => (
                      <li key={reason}>
                        {reason}
                      </li>
                    ),
                  )}
                </ul>
              </section>
            )}

            {intelPlayerId !== null && (
              <a
                className="drawer-profile-link"
                href={`https://www.torn.com/profiles.php?XID=${intelPlayerId}`}
                target="_blank"
                rel="noreferrer"
              >
                OPEN TORN PROFILE
              </a>
            )}

            <p className="drawer-note">
              {liveIntelTarget
                ? 'No opaque score. Current-user modifiers affect HONJIN suitability and recommendation ratios when fresh. Fair Fight remains FFScouter caller-specific reward context and is not recalculated from MOD BS.'
                : 'No opaque score. Live evidence, timestamps and exact reasoning are added with the HONJIN-05 data layer.'}
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
