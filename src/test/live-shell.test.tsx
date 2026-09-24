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
import type {
  WarBoardSnapshot,
} from '../types'

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
  })

  it('does not auto-promote live targets under the uncalibrated production confidence policy', async () => {
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
        'No supported recommendations',
      ),
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
