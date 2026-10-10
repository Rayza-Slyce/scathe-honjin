import {
  cleanup,
  fireEvent,
  render,
  screen,
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
  SharedActivityCell,
  SharedActivitySummary,
} from '../api/honjin-intel/activity'
import AppShell from '../features/shell/AppShell'
import type { TeamView } from '../features/team/live-team'

const connection = {
  user: {
    id: 123456,
    name: 'Rayza',
    faction: {
      id: 654321,
      name: 'SCATHE',
    },
    battleStatsTotal: 8_675,
  },
  ffscouter: {
    status: 'registered' as const,
  },
}

function emptyCell(): SharedActivityCell {
  return {
    activeCount: 0,
    inactiveCount: 0,
    knownCount: 0,
    totalCount: 0,
    sparse: true,
  }
}

function activitySummary(playerId = 410021): SharedActivitySummary {
  const cells = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, emptyCell),
  )
  cells[2][12] = {
    activeCount: 2,
    inactiveCount: 0,
    knownCount: 2,
    totalCount: 2,
    sparse: true,
  }
  cells[2][13] = {
    activeCount: 46,
    inactiveCount: 2,
    knownCount: 48,
    totalCount: 48,
    sparse: false,
  }

  return {
    playerId,
    windowStart: 1_780_000_000,
    windowEnd: 1_782_419_200,
    sampleCount: 50,
    knownSampleCount: 50,
    coveredHourCount: 2,
    lastObservedAt: 1_782_419_100,
    lastActiveObservedAt: 1_782_419_100,
    cells,
    peakWindows: [{
      dayIndex: 2,
      hour: 13,
      activeCount: 46,
      inactiveCount: 2,
      knownCount: 48,
      totalCount: 48,
    }],
  }
}


const teamView: TeamView = {
  phase: 'ready',
  stale: false,
  message: null,
  observedAt: 1_800_000_000,
  members: [{
    player: {
      id: 2_353_116,
      name: 'FatherFalco',
      level: 90,
      factionPosition: 'Leader',
      status: {
        state: 'okay',
        description: 'Okay',
        details: null,
        planeImageType: null,
        hospitalUntil: null,
        lastAction: {
          status: 'Offline',
          relative: '2 hours ago',
          at: 1_799_992_800,
        },
      },
    },
    presence: 'offline',
    stateLabel: 'Okay',
    lastActionLabel: '2 hours ago',
    battleStatsValue: 1_704_091_419,
    battleStatsUpdatedAt: 1_799_980_000,
    travelTiming: null,
  }],
}

afterEach(cleanup)

describe('Observed activity player detail', () => {
  it('loads activity only after target detail opens and exposes exact cell evidence', async () => {
    const loader = vi.fn().mockResolvedValue(activitySummary())

    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
        activitySummaryLoader={loader}
      />,
    )

    expect(loader).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', {
      name: 'Player details for Old_Nick',
    }))

    const drawer = screen.getByRole('dialog', {
      name: 'Intel for Old_Nick',
    })
    expect(within(drawer).getByText('Loading observed activity…')).toBeInTheDocument()

    await within(drawer).findByText('Most observed activity')
    expect(within(drawer).getByText('OBSERVED ACTIVITY')).toBeInTheDocument()
    const activityIdentity = drawer.querySelector('.observed-activity__identity')
    expect(activityIdentity).not.toBeNull()
    expect(
      within(activityIdentity as HTMLElement).getByText('Old_Nick'),
    ).toBeInTheDocument()
    expect(loader).toHaveBeenCalledTimes(1)
    expect(loader).toHaveBeenCalledWith(410021)
    expect(within(drawer).getByText('TCT / UTC')).toBeInTheDocument()
    expect(drawer.querySelector('.activity-grid__hours')?.textContent).toBe('0003060912151821')
    expect(within(drawer).getByText('7-day source window')).toBeInTheDocument()
    expect(within(drawer).getByText(/Only observed hours within the rolling 7-day window are counted/)).toBeInTheDocument()

    const sparseCell = within(drawer).getByRole('button', {
      name: /Wednesday 12:00–13:00 TCT · Active 2 \/ 2 known observations/,
    })
    expect(sparseCell).toHaveClass('activity-cell--sparse')

    const strongCell = within(drawer).getByRole('button', {
      name: /Wednesday 13:00–14:00 TCT · Active 46 \/ 48 known observations/,
    })
    fireEvent.click(strongCell)

    const cellDetail = within(drawer).getByRole('status')
    expect(within(cellDetail).getByText('Wednesday 13:00–14:00 TCT')).toBeInTheDocument()
    expect(within(cellDetail).getByText('Active 46 / 48 known observations')).toBeInTheDocument()
    expect(within(cellDetail).getByText('0 unknown observations excluded')).toBeInTheDocument()
  })

  it('loads existing shared activity when a Team member detail opens without preloading the Team list', async () => {
    const loader = vi.fn().mockResolvedValue(activitySummary(2_353_116))

    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
        teamView={teamView}
        activitySummaryLoader={loader}
      />,
    )

    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Primary' }))
        .getByRole('button', { name: 'TEAM' }),
    )

    expect(loader).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', {
      name: 'Player details for FatherFalco',
    }))

    const drawer = screen.getByRole('dialog', {
      name: 'Intel for FatherFalco',
    })
    expect(within(drawer).getByText('Faction rank')).toBeInTheDocument()
    expect(within(drawer).getByText('Loading observed activity…')).toBeInTheDocument()

    await within(drawer).findByText('Most observed activity')
    expect(loader).toHaveBeenCalledTimes(1)
    expect(loader).toHaveBeenCalledWith(2_353_116)
    expect(within(drawer).getByText('PLAYER HISTORY')).toBeInTheDocument()
    const activityIdentity = drawer.querySelector('.observed-activity__identity')
    expect(activityIdentity).not.toBeNull()
    expect(
      within(activityIdentity as HTMLElement).getByText('FatherFalco'),
    ).toBeInTheDocument()
    expect(within(drawer).getByText('7-day source window')).toBeInTheDocument()
  })

  it('shows the explicit sparse-data state when no cell meets the three-known-sample rule', async () => {
    const summary = activitySummary()
    const sparseCells = summary.cells.map((day) =>
      day.map(() => emptyCell()),
    )
    sparseCells[2][12] = {
      activeCount: 1,
      inactiveCount: 1,
      knownCount: 2,
      totalCount: 2,
      sparse: true,
    }

    const loader = vi.fn().mockResolvedValue({
      ...summary,
      sampleCount: 2,
      knownSampleCount: 2,
      coveredHourCount: 1,
      cells: sparseCells,
      peakWindows: [],
    })

    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
        activitySummaryLoader={loader}
      />,
    )

    fireEvent.click(screen.getByRole('button', {
      name: 'Player details for Old_Nick',
    }))

    const drawer = screen.getByRole('dialog', {
      name: 'Intel for Old_Nick',
    })
    expect(await within(drawer).findByText('NOT ENOUGH ACTIVITY DATA YET')).toBeInTheDocument()
  })
})
