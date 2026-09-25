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
import type {
  HospitalView,
} from '../features/hospital/live-hospital'
import AppShell from '../features/shell/AppShell'
import LiveAppShell from '../features/shell/LiveAppShell'
import {
  createMemoryHospitalWatchStore,
} from '../storage/hospital-watch'
import {
  createMemorySpyRoomIdentityStore,
} from '../storage/spy-room-identity'

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

function openHospital() {
  fireEvent.click(
    within(
      screen.getByRole('navigation', {
        name: 'Primary',
      }),
    ).getByRole('button', {
      name: 'HOSPITAL',
    }),
  )
}

function hospitalView(
  activeWarId: number | null,
): HospitalView {
  return {
    activeWarId,
    message: null,
    targets: [
      {
        id: 1,
        level: 20,
        battleStats: '4.00k',
        fairFight: '2.00',
        suitability: 'HIT NOW',
        confidence: 'UNKNOWN',
        name: 'WarHospital',
        releaseAt: now + 300,
        statusObservedAt: now,
        statusStale: false,
        watched: false,
        isWarTarget: true,
        sources: ['war'],
      },
      {
        id: 2,
        level: 20,
        battleStats: '4.00k',
        fairFight: '2.00',
        suitability: 'HIT NOW',
        confidence: 'UNKNOWN',
        name: 'SpyHospital',
        releaseAt: now + 600,
        statusObservedAt: now,
        statusStale: false,
        watched: false,
        isWarTarget: false,
        sources: ['spy-individual'],
      },
    ],
  }
}

afterEach(() => {
  cleanup()
})

describe('live Hospital shell', () => {
  it('defaults to WAR TARGETS ONLY during an active war and can explicitly include Spy targets', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
        hospitalView={hospitalView(42)}
        hospitalNow={now}
      />,
    )

    openHospital()

    const warOnly = screen.getByRole(
      'checkbox',
      { name: /WAR TARGETS ONLY/ },
    )
    expect(warOnly).toBeChecked()
    expect(
      screen.getByText('WarHospital'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/LVL 20/).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Est\. BS 4\.00k · FF for you 2\.00/).length,
    ).toBeGreaterThan(0)
    expect(
      screen.queryByText('SpyHospital'),
    ).not.toBeInTheDocument()

    fireEvent.click(warOnly)

    expect(
      screen.getByText('SpyHospital'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'NON-WAR',
      ),
    ).toBeInTheDocument()
  })

  it('shows all tracked hospital targets outside war and exposes local WATCH', () => {
    const onWatch = vi.fn()

    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
        hospitalView={hospitalView(null)}
        hospitalNow={now}
        onHospitalWatchToggle={onWatch}
      />,
    )

    openHospital()

    expect(
      screen.queryByRole('checkbox', {
        name: /WAR TARGETS ONLY/,
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('WarHospital'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('SpyHospital'),
    ).toBeInTheDocument()

    const spyCard = screen
      .getByText('SpyHospital')
      .closest('article')
    expect(spyCard).not.toBeNull()

    fireEvent.click(
      within(spyCard!).getByRole('button', {
        name: 'WATCH',
      }),
    )
    expect(onWatch).toHaveBeenCalledWith(2)
  })

  it('refreshes saved Spy Room identities when Hospital becomes the visible workspace', async () => {
    const identityStore =
      createMemorySpyRoomIdentityStore()
    const watchStore =
      createMemoryHospitalWatchStore()
    await identityStore.save(101, {
      individualPlayerIds: [9001],
      factionId: null,
    })

    const runtime: HonjinRuntime = {
      loadCurrentWar: vi.fn(),
      loadWarBoardSnapshot: vi
        .fn()
        .mockResolvedValue({
          war: null,
          enemyRoster: null,
        }),
      loadFactionRoster: vi.fn(),
      loadFactionIdentity: vi.fn(),
      searchPlayers: vi.fn(),
      searchFactions: vi.fn(),
      loadPlayerRecon: vi
        .fn()
        .mockResolvedValue({
          player: {
            id: 9001,
            name: 'HospitalTarget',
            level: 20,
            factionPosition: null,
            status: {
              state: 'hospital',
              description: 'Hospital',
              details: '',
              planeImageType: null,
              hospitalUntil: now + 900,
              lastAction: {
                status: 'Offline',
                relative: '5 minutes ago',
                at: now - 300,
              },
            },
          },
          factionId: 777,
          health: null,
          observedAt: now,
        }),
      loadBattleIntel: vi
        .fn()
        .mockResolvedValue({
          callerPlayerId: 101,
          intel: [],
          observedAt: now,
        }),
      clearCache: vi.fn(),
    }

    render(
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={vi.fn()}
        refreshIntervalMs={60_000}
        now={() => now * 1000}
        spyIdentityStore={identityStore}
        hospitalWatchStore={watchStore}
      />,
    )

    openHospital()

    expect(
      await screen.findByText(
        'HospitalTarget',
      ),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(
        runtime.loadPlayerRecon,
      ).toHaveBeenCalledWith(
        9001,
        'visible-spy',
      )
    })
  })
})
