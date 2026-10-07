import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type {
  HonjinConnection,
} from '../app/connect'
import type {
  HonjinRuntime,
} from '../app/runtime'
import LiveAppShell from '../features/shell/LiveAppShell'
import {
  createMemorySpyRoomIdentityStore,
} from '../storage/spy-room-identity'
import {
  createMemoryTravelObservationStore,
} from '../storage/travel-observation'
import type {
  WarBoardSnapshot,
} from '../types'
import { createMemoryTeamSnapshotStore } from '../storage/team-snapshot'

const now = 1_800_000_000

const connection: HonjinConnection = {
  user: {
    id: 101,
    name: 'Rayza',
    faction: {
      id: 501,
      name: 'SCATHE',
    },
    battleStatsTotal: 10_000,
  },
  ffscouter: {
    status: 'registered',
  },
}

const snapshot: WarBoardSnapshot = {
  war: {
    warId: 900,
    ownFaction: {
      id: 501,
      name: 'SCATHE',
      score: 1_200,
      chain: 20,
    },
    enemyFaction: {
      id: 777,
      name: 'Live Enemy',
      score: 1_050,
      chain: 12,
    },
    status: 'active',
    targetScore: 2_500,
    startsAt: now - 100,
    endsAt: null,
    observedAt: now,
  },
  enemyRoster: {
    factionId: 777,
    observedAt: now,
    members: [
      {
        id: 9001,
        name: 'LiveTarget',
        level: 50,
        factionPosition: 'Member',
        status: {
          state: 'okay',
          description: 'Okay',
          details: '',
          planeImageType: null,
          hospitalUntil: null,
          lastAction: {
            status: 'Online',
            relative: '2 minutes ago',
            at: now - 120,
          },
        },
      },
    ],
  },
}

function runtimeWith(
  warBoard: WarBoardSnapshot,
): HonjinRuntime {
  return {
    loadCurrentWar: vi.fn(),
    loadWarBoardSnapshot: vi
      .fn()
      .mockResolvedValue(warBoard),
    loadFactionRoster: vi.fn(),
    loadFactionIdentity: vi.fn(),
    searchPlayers: vi.fn().mockResolvedValue([]),
    searchFactions: vi.fn().mockResolvedValue([]),
    loadTravelPropertyEvidence: vi.fn(),
    loadPlayerRecon: vi.fn(),
    loadBattleIntel: vi
      .fn()
      .mockResolvedValue({
        callerPlayerId: 101,
        observedAt: now,
        intel: [
          {
            playerId: 9001,
            estimatedBattleStats: 4_000,
            publicBss: 4_100,
            fairFight: 2.12,
            updatedAt: now - 60,
            source:
              'ffscouter-public-bss',
          },
        ],
      }),
    loadCurrentUserBattleStats: vi
      .fn()
      .mockResolvedValue({
        total: 10_000,
        strength: { value: 2_500, modifier: 0, modifiers: [] },
        defense: { value: 2_500, modifier: 0, modifiers: [] },
        speed: { value: 2_500, modifier: 0, modifiers: [] },
        dexterity: { value: 2_500, modifier: 0, modifiers: [] },
        observedAt: now,
      }),
    clearCache: vi.fn(),
  }
}

afterEach(() => {
  cleanup()
})

describe('live HONJIN shell', () => {
  it('replaces static WAR data with the live war and roster', async () => {
    render(
      <LiveAppShell
        connection={connection}
        runtime={runtimeWith(snapshot)}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
      />,
    )

    expect(
      await screen.findByText(
        'Live Enemy',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      within(
        screen.getByRole(
          'navigation',
          { name: 'Primary' },
        ),
      ).getByRole(
        'button',
        { name: 'TARGETS' },
      ),
    )

    expect(
      await screen.findByText(
        'LiveTarget',
      ),
    ).toBeInTheDocument()

    expect(
      screen.queryByText('Old_Nick'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'ATTACK' }),
    ).toBeInTheDocument()
  })

  it('loads scheduled-matchup recon while keeping WAR attacks locked until start', async () => {
    const scheduledSnapshot: WarBoardSnapshot = {
      ...snapshot,
      war: {
        ...snapshot.war!,
        status: 'scheduled',
        targetScore: null,
        startsAt: now + 3_600,
      },
    }

    const sharedWatchRegistrar = vi.fn().mockResolvedValue(undefined)

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtimeWith(scheduledSnapshot)}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
        sharedWatchRegistrar={sharedWatchRegistrar}
      />,
    )

    expect(
      await screen.findByText('Live Enemy'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(sharedWatchRegistrar).toHaveBeenCalledWith({
        players: [],
        factionIds: [777],
      })
    })
    expect(
      screen.getByText('RANKED WAR MATCHUP'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('SCHEDULED'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Starts in 1h 0m'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('TARGET —'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('ACTIVE RANKED WAR'),
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: 'Primary' }),
      ).getByRole('button', { name: 'TARGETS' }),
    )

    expect(
      await screen.findByText('LiveTarget'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('WAR NOT STARTED'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'ATTACK' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/Matchup scheduled · reconnaissance is live/i),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Intel for LiveTarget' }),
    )

    const intelDrawer = screen.getByRole('dialog', {
      name: 'Intel for LiveTarget',
    })
    expect(
      within(intelDrawer).getByText('Status availability'),
    ).toBeInTheDocument()
    expect(
      within(intelDrawer).getByText('AVAILABLE'),
    ).toBeInTheDocument()
    expect(
      within(intelDrawer).queryByText('ATTACKABLE'),
    ).not.toBeInTheDocument()
  })

  it('records a war-target take-off from existing war polling without opening Travel', async () => {
    const travelStore = createMemoryTravelObservationStore()
    const travellingSnapshot: WarBoardSnapshot = {
      ...snapshot,
      enemyRoster: {
        ...snapshot.enemyRoster!,
        observedAt: now + 15,
        members: snapshot.enemyRoster!.members.map((member) => ({
          ...member,
          status: {
            ...member.status,
            state: 'travelling',
            description: 'Traveling to Mexico',
            planeImageType: 'airliner',
          },
        })),
      },
    }
    const runtime = runtimeWith(snapshot)
    vi.mocked(runtime.loadWarBoardSnapshot)
      .mockResolvedValueOnce(snapshot)
      .mockResolvedValue(travellingSnapshot)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    try {
      render(
        <LiveAppShell
          connection={connection}
          runtime={runtime}
          onDisconnect={vi.fn()}
          refreshIntervalMs={1_000}
          now={() => now * 1000}
          travelObservationStore={travelStore}
        />,
      )

      await waitFor(
        () => expect(runtime.loadWarBoardSnapshot).toHaveBeenCalledTimes(2),
        { timeout: 2_500 },
      )

      await waitFor(async () => {
        const state = await travelStore.load(101, 9001)
        expect(state.activeJourney?.departureWindow).toEqual({
          earliestAt: now,
          latestAt: now + 15,
        })
        expect(state.activeJourney?.originalTiming.source).toBe(
          'observed-transition',
        )
      })
    } finally {
      Reflect.deleteProperty(document, 'visibilityState')
    }
  })

  it('auto-promotes live targets when default public-BSS evidence is recent enough', async () => {
    render(
      <LiveAppShell
        connection={connection}
        runtime={runtimeWith(snapshot)}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
      />,
    )

    expect(
      await screen.findByText('LiveTarget'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('GOOD FIT'),
    ).toBeInTheDocument()
  })

  it('can show the existing deterministic recommendation when an explicit confidence policy is provided', async () => {
    render(
      <LiveAppShell
        connection={connection}
        runtime={runtimeWith(snapshot)}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
        evidencePolicy={{
          statusMaxAgeSeconds: 30,
          battleIntel: {
            highConfidenceMaxAgeSeconds: 300,
            mediumConfidenceMaxAgeSeconds: 600,
            usableMaxAgeSeconds: 900,
          },
        }}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByText('LiveTarget'),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText('GOOD FIT'),
    ).toBeInTheDocument()
  })

  it('bounds browser-side LIFE enrichment to the top eight actionable war targets', async () => {
    const members = Array.from(
      { length: 10 },
      (_, index) => ({
        ...snapshot.enemyRoster!.members[0],
        id: 9001 + index,
        name: `WarLife${index + 1}`,
        status:
          index === 0
            ? {
                ...snapshot.enemyRoster!.members[0].status,
                state: 'hospital' as const,
                description: 'Hospital',
                hospitalUntil: now + 300,
              }
            : snapshot.enemyRoster!.members[0].status,
      }),
    )
    const warLifeSnapshot: WarBoardSnapshot = {
      ...snapshot,
      enemyRoster: {
        ...snapshot.enemyRoster!,
        members,
      },
    }
    const runtime = runtimeWith(warLifeSnapshot)
    runtime.loadBattleIntel = vi.fn().mockResolvedValue({
      callerPlayerId: 101,
      observedAt: now,
      intel: members.map((member, index) => ({
        playerId: member.id,
        estimatedBattleStats: 4_000 + index * 50,
        publicBss: 4_100 + index * 50,
        fairFight: 2.12,
        updatedAt: now - 60,
        source: 'ffscouter-public-bss' as const,
      })),
    })
    runtime.loadPlayerRecon = vi.fn(
      async (playerId: number) => ({
        player: members.find(
          (member) => member.id === playerId,
        )!,
        factionId: 777,
        health: {
          current: 620,
          maximum: 4_500,
          observedAt: now,
        },
        observedAt: now,
      }),
    )

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
        evidencePolicy={{
          statusMaxAgeSeconds: 30,
          battleIntel: {
            highConfidenceMaxAgeSeconds: 300,
            mediumConfidenceMaxAgeSeconds: 600,
            usableMaxAgeSeconds: 900,
          },
        }}
      />,
    )

    await waitFor(() => {
      expect(runtime.loadPlayerRecon).toHaveBeenCalledTimes(8)
    })

    const calls = vi.mocked(runtime.loadPlayerRecon).mock.calls
    const enrichedPlayerIds = calls.map(([playerId]) => playerId)
    expect(new Set(enrichedPlayerIds).size).toBe(8)
    expect(enrichedPlayerIds).not.toContain(9001)
    expect(
      enrichedPlayerIds.every((playerId) =>
        members.some((member) => member.id === playerId),
      ),
    ).toBe(true)
    expect(
      calls.every(([, priority]) => priority === 'optional'),
    ).toBe(true)

    expect(
      (await screen.findAllByText('LIFE')).length,
    ).toBeGreaterThan(0)
    expect(
      (await screen.findAllByText('620 / 4.50k · 14%')).length,
    ).toBeGreaterThan(0)
  })

  it('refreshes current-user battlestats for the live shell', async () => {
    const runtime = runtimeWith(snapshot)
    runtime.loadCurrentUserBattleStats = vi.fn().mockResolvedValue({
      total: 10_000,
      strength: { value: 2_500, modifier: 25, modifiers: [] },
      defense: { value: 2_500, modifier: 25, modifiers: [] },
      speed: { value: 2_500, modifier: 25, modifiers: [] },
      dexterity: { value: 2_500, modifier: 25, modifiers: [] },
      observedAt: now,
    })

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        now={() => now * 1000}
        refreshIntervalMs={60_000}
        spyIdentityStore={createMemorySpyRoomIdentityStore()}
      />,
    )

    expect(
      await screen.findByText('MOD BS 12,500'),
    ).toBeInTheDocument()
    expect(
      runtime.loadCurrentUserBattleStats,
    ).toHaveBeenCalled()
  })

  it('loads the SCATHE roster only when TEAM becomes visible', async () => {
    const runtime = runtimeWith(snapshot)
    vi.mocked(runtime.loadFactionRoster).mockResolvedValue({
      factionId: 501, observedAt: now, members: [{
        id: 101, name: 'Rayza', level: 50, factionPosition: 'Co-leader',
        status: { state: 'okay', description: 'Okay', details: null, planeImageType: null, hospitalUntil: null, lastAction: { status: 'Online', relative: '1 minute ago', at: now - 60 } },
      }],
    })
    vi.mocked(runtime.loadBattleIntel).mockResolvedValue({
      callerPlayerId: 101,
      observedAt: now,
      intel: [{
        playerId: 101, estimatedBattleStats: 43_738, publicBss: 43_738, fairFight: 1,
        updatedAt: now - 120, source: 'ffscouter-public-bss',
      }],
    })
    render(<LiveAppShell connection={connection} runtime={runtime} onDisconnect={vi.fn()} now={() => now * 1000} refreshIntervalMs={60_000} spyIdentityStore={createMemorySpyRoomIdentityStore()} teamSnapshotStore={createMemoryTeamSnapshotStore()} />)
    await screen.findByText('Live Enemy')
    expect(runtime.loadFactionRoster).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('button', { name: 'TEAM' }))
    expect(await screen.findByRole('button', { name: 'Player details for Rayza' })).toBeInTheDocument()
    expect(screen.getByText('Okay · Co-leader')).toBeInTheDocument()
    expect(screen.getByText('1 minute ago')).toBeInTheDocument()
    expect(screen.getByText('1,200 SCORE · 20 CHAIN')).toBeInTheDocument()
    expect(runtime.loadFactionRoster).toHaveBeenCalledWith(501, 'explicit')
    expect(runtime.loadTravelPropertyEvidence).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Player details for Rayza' }))
    const drawer = screen.getByRole('dialog', { name: 'Intel for Rayza' })
    expect(within(drawer).getByText('101')).toBeInTheDocument()
    expect(within(drawer).getByText('50')).toBeInTheDocument()
    expect(within(drawer).getByText('1 minute ago')).toBeInTheDocument()
    expect(within(drawer).getByText('Faction rank')).toBeInTheDocument()
    expect(within(drawer).getByText('Co-leader')).toBeInTheDocument()
    expect(within(drawer).getByText(/43,738 · FFScouter public BSS/)).toBeInTheDocument()
    expect(within(drawer).queryByText('Fair Fight')).not.toBeInTheDocument()
    expect(within(drawer).queryByText('Suitability')).not.toBeInTheDocument()
    expect(within(drawer).queryByText('Static HONJIN-04 preview')).not.toBeInTheDocument()
  })


  it('hydrates the saved Team snapshot before a live Team refresh succeeds', async () => {
    const teamStore = createMemoryTeamSnapshotStore()
    await teamStore.save(101, {
      factionId: 501,
      roster: {
        factionId: 501,
        observedAt: now - 300,
        members: [{
          id: 202,
          name: 'SavedTeammate',
          level: 88,
          factionPosition: 'Member',
          status: {
            state: 'okay',
            description: 'Okay',
            details: null,
            planeImageType: null,
            hospitalUntil: null,
            lastAction: { status: 'Offline', relative: '8 minutes ago', at: now - 480 },
          },
        }],
      },
      battleIntel: {
        callerPlayerId: 101,
        observedAt: now - 300,
        intel: [{
          playerId: 202,
          estimatedBattleStats: 12_345,
          publicBss: 12_345,
          fairFight: 1.2,
          updatedAt: now - 400,
          source: 'ffscouter-public-bss',
        }],
      },
      savedAt: now - 300,
    })

    const runtime = runtimeWith(snapshot)
    vi.mocked(runtime.loadFactionRoster).mockRejectedValue(new Error('Synthetic Torn outage'))

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        now={() => now * 1000}
        refreshIntervalMs={60_000}
        spyIdentityStore={createMemorySpyRoomIdentityStore()}
        teamSnapshotStore={teamStore}
      />,
    )

    await screen.findByText('Live Enemy')
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('button', { name: 'TEAM' }))

    expect(await screen.findByText('SavedTeammate')).toBeInTheDocument()
    expect(screen.getByText(/SAVED SNAPSHOT/)).toBeInTheDocument()
    expect(await screen.findByText(/Team roster unavailable: Synthetic Torn outage/)).toBeInTheDocument()
  })

  it('keeps live Torn roster data visible when FFScouter fails', async () => {
    const runtime = runtimeWith(snapshot)
    runtime.loadBattleIntel = vi
      .fn()
      .mockRejectedValue(
        new Error('FFScouter unavailable.'),
      )

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
      />,
    )

    expect(
      await screen.findByText(
        'Live Enemy',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /Battle intel unavailable/i,
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      within(
        screen.getByRole(
          'navigation',
          { name: 'Primary' },
        ),
      ).getByRole(
        'button',
        { name: 'TARGETS' },
      ),
    )

    const card = screen
      .getByText('LiveTarget')
      .closest('article')

    expect(card).not.toBeNull()
    expect(
      within(card!).getAllByText(
        'UNKNOWN',
      ).length,
    ).toBeGreaterThan(0)
  })

  it('shows the no-war state and keeps Spy Room reachable', async () => {
    render(
      <LiveAppShell
        connection={connection}
        runtime={runtimeWith({
          war: null,
          enemyRoster: null,
        })}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
      />,
    )

    expect(
      await screen.findByText(
        'No active Ranked War',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'OPEN SPY ROOM',
      }),
    )

    expect(
      screen.getByText('Find a player'),
    ).toBeInTheDocument()
  })
})

describe('live Spy Room shell', () => {
  function noWarRuntime(): HonjinRuntime {
    return runtimeWith({
      war: null,
      enemyRoster: null,
    })
  }

  async function openSpyRoom() {
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'OPEN SPY ROOM',
      }),
    )
  }

  it('shows ambiguous player search results and loads explicit player recon with LIFE', async () => {
    const runtime = noWarRuntime()
    const store =
      createMemorySpyRoomIdentityStore()
    const sharedWatchRegistrar = vi.fn().mockResolvedValue(undefined)
    runtime.searchPlayers = vi
      .fn()
      .mockResolvedValue([
        {
          id: 9001,
          name: 'ReconTarget',
          level: 42,
          factionId: 777,
        },
        {
          id: 9002,
          name: 'ReconTargetTwo',
          level: 30,
          factionId: null,
        },
      ])
    runtime.loadPlayerRecon = vi
      .fn()
      .mockResolvedValue({
        player: {
          id: 9001,
          name: 'ReconTarget',
          level: 42,
          factionPosition: null,
          status: {
            state: 'okay',
            description: 'Okay',
            details: '',
            planeImageType: null,
            hospitalUntil: null,
            lastAction: {
              status: 'Online',
              relative: '2 minutes ago',
              at: now - 120,
            },
          },
        },
        factionId: 777,
        health: {
          current: 620,
          maximum: 4_500,
          observedAt: now,
        },
        observedAt: now,
      })
    runtime.loadBattleIntel = vi
      .fn()
      .mockResolvedValue({
        callerPlayerId: 101,
        observedAt: now,
        intel: [
          {
            playerId: 9001,
            estimatedBattleStats: 4_000,
            publicBss: 4_100,
            fairFight: 2.12,
            updatedAt: now - 60,
            source:
              'ffscouter-public-bss',
          },
        ],
      })

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
        spyIdentityStore={store}
        sharedWatchRegistrar={sharedWatchRegistrar}
      />,
    )

    await openSpyRoom()

    const input = screen.getByLabelText(
      'Player name or ID',
    )
    fireEvent.change(input, {
      target: { value: 'Recon' },
    })
    fireEvent.submit(input.closest('form')!)

    const results =
      await screen.findByLabelText(
        'Player search results',
      )

    expect(
      within(results).getByText(
        'ReconTarget',
      ),
    ).toBeInTheDocument()
    expect(
      within(results).getByText(
        'ReconTargetTwo',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      within(results).getByRole(
        'button',
        { name: /ReconTarget · Level 42/ },
      ),
    )

    const health = await screen.findByText(
      '620 / 4.50k · 14%',
    )
    const article = health.closest('article')

    expect(article).not.toBeNull()
    expect(
      within(article!).getByText('LIFE'),
    ).toBeInTheDocument()
    expect(article?.querySelector('.presence--online')).not.toBeNull()
    expect(
      within(article!).getByText(
        'ReconTarget',
      ),
    ).toBeInTheDocument()
    expect(
      runtime.loadPlayerRecon,
    ).toHaveBeenCalledWith(
      9001,
      'explicit',
    )
    expect(await store.load(101)).toEqual({
      individualPlayerIds: [9001],
      factionId: null,
    })
    expect(sharedWatchRegistrar).toHaveBeenCalledWith({
      players: [{ playerId: 9001, factionId: 777 }],
      factionIds: [],
    })
  })

  it('loads one live faction workspace without per-player profile fan-out', async () => {
    const runtime = noWarRuntime()
    const store =
      createMemorySpyRoomIdentityStore()
    const sharedWatchRegistrar = vi.fn().mockResolvedValue(undefined)
    runtime.searchFactions = vi
      .fn()
      .mockResolvedValue([
        {
          id: 777,
          name: 'Recon Faction',
          members: 1,
          respect: 123_456,
        },
      ])
    runtime.loadFactionRoster = vi
      .fn()
      .mockResolvedValue({
        factionId: 777,
        observedAt: now,
        members: [
          {
            id: 9001,
            name: 'FactionTarget',
            level: 42,
            factionPosition: 'Member',
            status: {
              state: 'okay',
              description: 'Okay',
              details: '',
              planeImageType: null,
              hospitalUntil: null,
              lastAction: {
                status: 'Online',
                relative: '1 minute ago',
                at: now - 60,
              },
            },
          },
        ],
      })
    runtime.loadBattleIntel = vi
      .fn()
      .mockResolvedValue({
        callerPlayerId: 101,
        observedAt: now,
        intel: [],
      })

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
        spyIdentityStore={store}
        sharedWatchRegistrar={sharedWatchRegistrar}
      />,
    )

    await openSpyRoom()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'FACTION',
      }),
    )

    const input = screen.getByLabelText(
      'Faction name or ID',
    )
    fireEvent.change(input, {
      target: { value: 'Recon' },
    })
    fireEvent.submit(input.closest('form')!)

    const results =
      await screen.findByLabelText(
        'Faction search results',
      )
    fireEvent.click(
      within(results).getByRole(
        'button',
        { name: /Recon Faction \[777\]/ },
      ),
    )

    expect(
      await screen.findByText(
        'FactionTarget',
      ),
    ).toBeInTheDocument()
    expect(
      runtime.loadFactionRoster,
    ).toHaveBeenCalledWith(
      777,
      'explicit',
    )
    expect(
      runtime.loadPlayerRecon,
    ).not.toHaveBeenCalled()
    expect(await store.load(101)).toEqual({
      individualPlayerIds: [],
      factionId: 777,
    })
    expect(sharedWatchRegistrar).toHaveBeenCalledWith({
      players: [],
      factionIds: [777],
    })
  })

  it('sorts a live faction workspace by estimated BS', async () => {
    const runtime = noWarRuntime()
    runtime.searchFactions = vi
      .fn()
      .mockResolvedValue([
        {
          id: 777,
          name: 'Sort Faction',
          members: 2,
          respect: 123_456,
        },
      ])
    runtime.loadFactionRoster = vi
      .fn()
      .mockResolvedValue({
        factionId: 777,
        observedAt: now,
        members: [
          {
            id: 9001,
            name: 'SortHigh',
            level: 42,
            factionPosition: 'Member',
            status: {
              state: 'okay',
              description: 'Okay',
              details: '',
              planeImageType: null,
              hospitalUntil: null,
              lastAction: {
                status: 'Online',
                relative: '1 minute ago',
                at: now - 60,
              },
            },
          },
          {
            id: 9002,
            name: 'SortLow',
            level: 30,
            factionPosition: 'Member',
            status: {
              state: 'hospital',
              description: 'Hospital',
              details: '',
              planeImageType: null,
              hospitalUntil: now + 600,
              lastAction: {
                status: 'Offline',
                relative: '10 minutes ago',
                at: now - 600,
              },
            },
          },
        ],
      })
    runtime.loadBattleIntel = vi
      .fn()
      .mockResolvedValue({
        callerPlayerId: 101,
        observedAt: now,
        intel: [
          {
            playerId: 9001,
            estimatedBattleStats: 9_000,
            publicBss: 9_100,
            fairFight: 1.5,
            updatedAt: now - 60,
            source: 'ffscouter-public-bss',
          },
          {
            playerId: 9002,
            estimatedBattleStats: 2_000,
            publicBss: 2_100,
            fairFight: 3,
            updatedAt: now - 60,
            source: 'ffscouter-public-bss',
          },
        ],
      })

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
      />,
    )

    await openSpyRoom()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'FACTION',
      }),
    )

    const input = screen.getByLabelText(
      'Faction name or ID',
    )
    fireEvent.change(input, {
      target: { value: 'Sort Faction' },
    })
    fireEvent.submit(input.closest('form')!)

    const results =
      await screen.findByLabelText(
        'Faction search results',
      )
    fireEvent.click(
      within(results).getByRole(
        'button',
        { name: /Sort Faction \[777\]/ },
      ),
    )

    await screen.findByText('SortHigh')

    const targetOrder = () =>
      screen
        .getAllByRole('article')
        .map((article) => {
          if (
            within(article).queryByText(
              'SortHigh',
            )
          ) {
            return 'SortHigh'
          }

          if (
            within(article).queryByText(
              'SortLow',
            )
          ) {
            return 'SortLow'
          }

          return null
        })
        .filter((name) => name !== null)

    expect(targetOrder()).toEqual([
      'SortHigh',
      'SortLow',
    ])
    expect(screen.getByRole('combobox', { name: 'Sort faction recon' })).toHaveValue('level-desc')

    const highCard = screen.getByText('SortHigh').closest('article')
    const lowCard = screen.getByText('SortLow').closest('article')
    expect(highCard?.querySelector('.presence--online')).not.toBeNull()
    expect(lowCard?.querySelector('.presence--offline')).not.toBeNull()

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Sort faction recon',
      }),
      { target: { value: 'level-asc' } },
    )

    expect(targetOrder()).toEqual([
      'SortLow',
      'SortHigh',
    ])

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Sort faction recon',
      }),
      { target: { value: 'bs-asc' } },
    )

    expect(targetOrder()).toEqual([
      'SortLow',
      'SortHigh',
    ])
  })


  it('restores saved individual identities and refreshes them only when the visible page can use them', async () => {
    const store =
      createMemorySpyRoomIdentityStore()
    await store.save(101, {
      individualPlayerIds: [9001],
      factionId: null,
    })
    const runtime = noWarRuntime()
    const sharedWatchRegistrar = vi.fn().mockResolvedValue(undefined)
    runtime.loadPlayerRecon = vi
      .fn()
      .mockResolvedValue({
        player: {
          id: 9001,
          name: 'RestoredTarget',
          level: 42,
          factionPosition: null,
          status: {
            state: 'okay',
            description: 'Okay',
            details: '',
            planeImageType: null,
            hospitalUntil: null,
            lastAction: {
              status: 'Online',
              relative: '1 minute ago',
              at: now - 60,
            },
          },
        },
        factionId: 777,
        health: {
          current: 500,
          maximum: 500,
          observedAt: now,
        },
        observedAt: now,
      })
    runtime.loadBattleIntel = vi
      .fn()
      .mockResolvedValue({
        callerPlayerId: 101,
        observedAt: now,
        intel: [],
      })

    Object.defineProperty(
      document,
      'visibilityState',
      {
        configurable: true,
        value: 'hidden',
      },
    )

    try {
      render(
        <LiveAppShell
          connection={connection}
          runtime={runtime}
          onDisconnect={vi.fn()}
          refreshIntervalMs={60_000}
          now={() => now * 1000}
          spyIdentityStore={store}
          sharedWatchRegistrar={sharedWatchRegistrar}
        />,
      )

      await openSpyRoom()

      expect(
        await screen.findByText(
          'Saved player',
        ),
      ).toBeInTheDocument()
      expect(
        runtime.loadPlayerRecon,
      ).not.toHaveBeenCalled()
      expect(sharedWatchRegistrar).toHaveBeenCalledWith({
        players: [{ playerId: 9001, factionId: null }],
        factionIds: [],
      })

      Object.defineProperty(
        document,
        'visibilityState',
        {
          configurable: true,
          value: 'visible',
        },
      )
      document.dispatchEvent(
        new Event('visibilitychange'),
      )

      expect(
        await screen.findByText(
          'RestoredTarget',
        ),
      ).toBeInTheDocument()
      expect(
        runtime.loadPlayerRecon,
      ).toHaveBeenCalledWith(
        9001,
        'visible-spy',
      )

      fireEvent.click(
        screen.getByRole('button', {
          name: 'REMOVE ALL',
        }),
      )
      expect(await store.load(101)).toEqual({
        individualPlayerIds: [],
        factionId: null,
      })
      expect(screen.queryByText('RestoredTarget')).not.toBeInTheDocument()
    } finally {
      Reflect.deleteProperty(
        document,
        'visibilityState',
      )
    }
  })


  it('keeps the visible Spy Room workspace fresh without refreshing it while the page is hidden', async () => {
    const store = createMemorySpyRoomIdentityStore()
    await store.save(101, {
      individualPlayerIds: [9001],
      factionId: null,
    })
    const runtime = noWarRuntime()
    runtime.loadPlayerRecon = vi.fn().mockResolvedValue({
      player: {
        id: 9001,
        name: 'VisibleTarget',
        level: 42,
        factionPosition: null,
        status: {
          state: 'okay',
          description: 'Okay',
          details: '',
          planeImageType: null,
          hospitalUntil: null,
          lastAction: {
            status: 'Online',
            relative: '1 minute ago',
            at: now - 60,
          },
        },
      },
      factionId: 777,
      health: null,
      observedAt: now,
    })
    runtime.loadBattleIntel = vi.fn().mockResolvedValue({
      callerPlayerId: 101,
      observedAt: now,
      intel: [],
    })

    try {
      render(
        <LiveAppShell
          connection={connection}
          runtime={runtime}
          onDisconnect={vi.fn()}
          refreshIntervalMs={1_000}
          now={() => now * 1000}
          spyIdentityStore={store}
        />,
      )

      await openSpyRoom()
      expect(await screen.findByText('VisibleTarget')).toBeInTheDocument()

      expect(runtime.loadPlayerRecon).toHaveBeenCalledTimes(1)

      await waitFor(
        () => expect(runtime.loadPlayerRecon).toHaveBeenCalledTimes(2),
        { timeout: 2_000 },
      )
      expect(runtime.loadPlayerRecon).toHaveBeenCalledTimes(2)

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      })
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise((resolve) => window.setTimeout(resolve, 1_200))

      expect(runtime.loadPlayerRecon).toHaveBeenCalledTimes(2)
      expect(runtime.loadBattleIntel).toHaveBeenCalledWith(
        101,
        [9001],
        'visible-spy',
      )
    } finally {
      Reflect.deleteProperty(document, 'visibilityState')
    }
  })

  it('restores one faction identity and waits for the faction workspace before refreshing it', async () => {
    const store =
      createMemorySpyRoomIdentityStore()
    await store.save(101, {
      individualPlayerIds: [],
      factionId: 777,
    })
    const runtime = noWarRuntime()
    runtime.loadFactionIdentity = vi
      .fn()
      .mockResolvedValue({
        id: 777,
        name: 'Restored Faction',
      })
    runtime.loadFactionRoster = vi
      .fn()
      .mockResolvedValue({
        factionId: 777,
        observedAt: now,
        members: [
          {
            id: 9001,
            name: 'RestoredFactionTarget',
            level: 42,
            factionPosition: 'Member',
            status: {
              state: 'okay',
              description: 'Okay',
              details: '',
              planeImageType: null,
              hospitalUntil: null,
              lastAction: {
                status: 'Online',
                relative: '1 minute ago',
                at: now - 60,
              },
            },
          },
        ],
      })
    runtime.loadBattleIntel = vi
      .fn()
      .mockResolvedValue({
        callerPlayerId: 101,
        observedAt: now,
        intel: [],
      })

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
        spyIdentityStore={store}
      />,
    )

    await openSpyRoom()

    expect(
      runtime.loadFactionRoster,
    ).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'FACTION',
      }),
    )

    expect(
      await screen.findByText(
        'RestoredFactionTarget',
      ),
    ).toBeInTheDocument()
    expect(
      runtime.loadFactionIdentity,
    ).toHaveBeenCalledWith(
      777,
      'visible-spy',
    )
    expect(
      runtime.loadFactionRoster,
    ).toHaveBeenCalledWith(
      777,
      'visible-spy',
    )
    expect(
      runtime.loadPlayerRecon,
    ).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('button', { name: 'REMOVE' }),
    )
    expect(await store.load(101)).toEqual({
      individualPlayerIds: [],
      factionId: null,
    })
    expect(screen.queryByText('RestoredFactionTarget')).not.toBeInTheDocument()
  })

  it('persists explicit removal from the individual shortlist', async () => {
    const store =
      createMemorySpyRoomIdentityStore()
    await store.save(101, {
      individualPlayerIds: [9001],
      factionId: null,
    })
    const runtime = noWarRuntime()
    runtime.loadPlayerRecon = vi
      .fn()
      .mockResolvedValue({
        player: {
          id: 9001,
          name: 'RemoveMe',
          level: 42,
          factionPosition: null,
          status: {
            state: 'okay',
            description: 'Okay',
            details: '',
            planeImageType: null,
            hospitalUntil: null,
            lastAction: {
              status: 'Online',
              relative: '1 minute ago',
              at: now - 60,
            },
          },
        },
        factionId: null,
        health: null,
        observedAt: now,
      })
    runtime.loadBattleIntel = vi
      .fn()
      .mockResolvedValue({
        callerPlayerId: 101,
        observedAt: now,
        intel: [],
      })

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
        spyIdentityStore={store}
      />,
    )

    await openSpyRoom()
    const target = await screen.findByText(
      'RemoveMe',
    )
    const article = target.closest('article')

    expect(article).not.toBeNull()

    fireEvent.click(
      within(article!).getByRole(
        'button',
        { name: /Remove RemoveMe from Spy Room/i },
      ),
    )

    await waitFor(() => {
      expect(
        screen.queryByText('RemoveMe'),
      ).not.toBeInTheDocument()
    })

    expect(await store.load(101)).toEqual({
      individualPlayerIds: [],
      factionId: null,
    })
  })

  it('uses explicit priority when the user manually refreshes saved recon', async () => {
    const store =
      createMemorySpyRoomIdentityStore()
    await store.save(101, {
      individualPlayerIds: [9001],
      factionId: null,
    })
    const runtime = noWarRuntime()
    runtime.loadPlayerRecon = vi
      .fn()
      .mockResolvedValue({
        player: {
          id: 9001,
          name: 'RefreshMe',
          level: 42,
          factionPosition: null,
          status: {
            state: 'okay',
            description: 'Okay',
            details: '',
            planeImageType: null,
            hospitalUntil: null,
            lastAction: {
              status: 'Online',
              relative: '1 minute ago',
              at: now - 60,
            },
          },
        },
        factionId: null,
        health: null,
        observedAt: now,
      })
    runtime.loadBattleIntel = vi
      .fn()
      .mockResolvedValue({
        callerPlayerId: 101,
        observedAt: now,
        intel: [],
      })

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
        spyIdentityStore={store}
      />,
    )

    await openSpyRoom()
    await screen.findByText('RefreshMe')

    vi.mocked(
      runtime.loadPlayerRecon,
    ).mockClear()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'REFRESH',
      }),
    )

    await waitFor(() => {
      expect(
        runtime.loadPlayerRecon,
      ).toHaveBeenCalledWith(
        9001,
        'explicit',
      )
    })
  })

})
