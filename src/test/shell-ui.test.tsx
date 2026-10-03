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
import AppShell from '../features/shell/AppShell'
import type { LiveTravelWorkspace } from '../features/travel/workspace'
import { THEME_STORAGE_KEY } from '../theme/theme'

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


const travelWorkspace: LiveTravelWorkspace = {
  activeWar: false,
  warTargetsOnly: false,
  message: null,
  targets: [
    {
      id: 510102,
      name: 'RedHarbour',
      level: 31,
      battleStats: '3.77k',
      battleStatsValue: 3770,
      fairFight: '2.05',
      fairFightValue: 2.05,
      suitability: 'GOOD',
      confidence: 'HIGH',
      confidenceValue: 'high',
      state: 'travelling',
      travelDescription: 'Traveling from Mexico to Torn',
      planeImageType: 'light_aircraft',
      statusUntil: 1_800_000_900,
      lastActionAt: 1_799_999_880,
      statusObservedAt: 1_800_000_000,
      isWarTarget: false,
      sources: ['spy-individual'],
      sourceLabel: 'NON-WAR',
      route: { origin: 'Mexico', destination: 'Torn', direction: 'inbound' },
      foreignHospitalDestination: null,
      method: {
        method: 'airstrip',
        label: 'Likely Airstrip',
        confidence: 'high',
        reasoning: [
          'Observed aircraft image: light aircraft.',
          'Public property evidence includes an Airstrip.',
          'HONJIN rule: light aircraft plus a fresh Private Island Airstrip supports likely Airstrip travel.',
        ],
      },
      observation: { playerId: 510102, previousSample: null, activeJourney: null, history: [] },
      timingLabel: 'ETA unavailable · take-off not observed',
      timingConfidence: 'unknown',
      timingSource: 'none',
      eta: null,
      reasoning: [
        'Observed aircraft image: light aircraft.',
        'Public property evidence includes an Airstrip.',
        'HONJIN rule: light aircraft plus a fresh Private Island Airstrip supports likely Airstrip travel.',
      ],
    },
    {
      id: 510103,
      name: 'BlueAsh',
      level: 28,
      battleStats: '4.20k',
      battleStatsValue: 4200,
      fairFight: '1.95',
      fairFightValue: 1.95,
      suitability: 'GOOD',
      confidence: 'MEDIUM',
      confidenceValue: 'medium',
      state: 'travelling',
      travelDescription: 'Traveling from Torn to United Kingdom',
      planeImageType: 'airliner',
      statusObservedAt: 1_800_000_000,
      isWarTarget: false,
      sources: ['spy-individual'],
      sourceLabel: 'NON-WAR',
      route: { origin: 'Torn', destination: 'United Kingdom', direction: 'outbound' },
      foreignHospitalDestination: null,
      method: {
        method: 'airline',
        label: 'Airline travel · Standard/BCT unclear',
        confidence: 'medium',
        reasoning: ['Observed aircraft image: airliner.'],
      },
      observation: { playerId: 510103, previousSample: null, activeJourney: null, history: [] },
      timingLabel: 'ETA unavailable · take-off not observed',
      timingConfidence: 'unknown',
      timingSource: 'none',
      eta: null,
      reasoning: ['Observed aircraft image: airliner.'],
    },
    {
      id: 510104,
      name: 'CaymanHospital',
      level: 15,
      battleStats: '1.92k',
      battleStatsValue: 1920,
      fairFight: '1.50',
      fairFightValue: 1.5,
      suitability: 'EASY',
      confidence: 'HIGH',
      confidenceValue: 'high',
      state: 'hospital',
      travelDescription: 'In a Caymanian hospital for 18 minutes',
      planeImageType: null,
      hospitalUntil: 1_800_001_080,
      statusObservedAt: 1_800_000_000,
      isWarTarget: false,
      sources: ['spy-individual'],
      sourceLabel: 'NON-WAR',
      route: { origin: null, destination: 'Cayman Islands', direction: 'unknown' },
      foreignHospitalDestination: 'Cayman Islands',
      method: {
        method: 'unknown',
        label: 'Travel method unavailable',
        confidence: 'low',
        reasoning: [],
      },
      observation: { playerId: 510104, previousSample: null, activeJourney: null, history: [] },
      timingLabel: 'No active ETA',
      timingConfidence: 'unknown',
      timingSource: 'none',
      eta: null,
      reasoning: ['Timing: player is observed abroad, not currently airborne'],
    },
  ],
}

afterEach(() => {
  cleanup()
  window.localStorage.removeItem(
    THEME_STORAGE_KEY,
  )
  document.documentElement.dataset.theme =
    'dark'
  document.documentElement.dataset.themePreference =
    'dark'
})

function getPrimaryNav() {
  return screen.getByRole(
    'navigation',
    {
      name: 'Primary',
    },
  )
}

function openTargets() {
  const nav = within(
    getPrimaryNav(),
  )

  fireEvent.click(
    nav.getByRole(
      'button',
      {
        name: 'TARGETS',
      },
    ),
  )
}

describe('HONJIN mobile shell', () => {
  it('renders exactly five primary destinations', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    const nav = within(
      getPrimaryNav(),
    )

    expect(
      nav.getAllByRole('button'),
    ).toHaveLength(5)

    expect(
      nav.getByRole(
        'button',
        {
          name: 'WAR',
        },
      ),
    ).toBeInTheDocument()

    expect(
      nav.getByRole(
        'button',
        {
          name: 'TARGETS',
        },
      ),
    ).toBeInTheDocument()

    expect(
      nav.getByRole(
        'button',
        {
          name: 'HOSPITAL',
        },
      ),
    ).toBeInTheDocument()

    expect(
      nav.getByRole(
        'button',
        {
          name: 'TRAVEL',
        },
      ),
    ).toBeInTheDocument()

    expect(
      nav.getByRole(
        'button',
        {
          name: 'TEAM',
        },
      ),
    ).toBeInTheDocument()
  })

  it('opens current-user battlestat modifier detail from the header', () => {
    render(
      <AppShell
        connection={{
          ...connection,
          user: {
            ...connection.user,
            battleStatsCurrent: {
              total: 8_675,
              strength: {
                value: 3_000,
                modifier: 25,
                modifiers: [
                  {
                    effect: 'Vicodin',
                    type: 'Drug',
                    value: 25,
                  },
                ],
              },
              defense: {
                value: 2_000,
                modifier: 0,
                modifiers: [],
              },
              speed: {
                value: 1_800,
                modifier: -5,
                modifiers: [
                  {
                    effect: 'Addiction',
                    type: 'Passive',
                    value: -5,
                  },
                ],
              },
              dexterity: {
                value: 1_875,
                modifier: 10,
                modifiers: [
                  {
                    effect: 'Education',
                    type: 'Passive',
                    value: 10,
                  },
                ],
              },
              observedAt: 1_800_000_000,
            },
          },
        }}
        onDisconnect={vi.fn()}
      />,
    )

    expect(
      screen.getByText('MOD BS 9,523'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Battle stats for Rayza',
      }),
    )

    const drawer = screen.getByRole('dialog', {
      name: 'Battle stats for Rayza',
    })
    expect(drawer).toBeInTheDocument()
    expect(
      within(drawer).getByText('9,523'),
    ).toBeInTheDocument()
    expect(
      within(drawer).getByText('TORN MOD +25'),
    ).toBeInTheDocument()
    expect(
      within(drawer).getByText(
        'Vicodin · Drug · +25',
      ),
    ).toBeInTheDocument()
    expect(
      within(drawer).getByText(
        /personalised suitability and recommendation ratios use this current value/i,
      ),
    ).toBeInTheDocument()
  })


  it('opens the approved README from the logged-in header', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'About HONJIN',
      }),
    )

    const dialog = screen.getByRole(
      'dialog',
      {
        name: 'README / ABOUT',
      },
    )

    expect(dialog).toHaveTextContent(
      'Why HONJIN?',
    )
    expect(dialog).toHaveTextContent(
      'leave the streets of Torn stained with their blood.',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close README',
      }),
    )

    expect(
      screen.queryByRole('dialog', {
        name: 'README / ABOUT',
      }),
    ).not.toBeInTheDocument()
  })

  it('toggles and persists appearance from the compact header switch', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    expect(
      screen.queryByText('APPEARANCE'),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('switch', {
        name: 'Switch to light mode',
      }),
    )

    expect(
      document.documentElement.dataset.theme,
    ).toBe('light')
    expect(
      window.localStorage.getItem(
        THEME_STORAGE_KEY,
      ),
    ).toBe('light')

    fireEvent.click(
      screen.getByRole('switch', {
        name: 'Switch to dark mode',
      }),
    )

    expect(
      document.documentElement.dataset.theme,
    ).toBe('dark')
    expect(
      window.localStorage.getItem(
        THEME_STORAGE_KEY,
      ),
    ).toBe('dark')
  })

  it('exposes WAR TARGETS and SPY ROOM inside TARGETS', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    openTargets()

    expect(
      screen.getByRole(
        'button',
        {
          name: 'WAR TARGETS',
        },
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByRole(
        'button',
        {
          name: 'SPY ROOM',
        },
      ),
    ).toBeInTheDocument()
  })

  it('provides player name-or-ID search in Spy Room', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    openTargets()

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'SPY ROOM',
        },
      ),
    )

    expect(
      screen.getByLabelText(
        'Player name or ID',
      ),
    ).toBeInTheDocument()
  })

  it('provides faction name-or-ID search in Spy Room', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    openTargets()

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'SPY ROOM',
        },
      ),
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'FACTION',
        },
      ),
    )

    expect(
      screen.getByLabelText(
        'Faction name or ID',
      ),
    ).toBeInTheDocument()
  })

  it('shows the complete WAR TARGETS availability filters', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    openTargets()

    expect(
      screen.getByRole(
        'button',
        {
          name: 'TRAVELLING',
        },
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByRole(
        'button',
        {
          name: 'ABROAD',
        },
      ),
    ).toBeInTheDocument()
  })

  it('shows Hospital opportunity-window filters', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    fireEvent.click(
      within(
        getPrimaryNav(),
      ).getByRole(
        'button',
        {
          name: 'HOSPITAL',
        },
      ),
    )

    const filters =
      screen.getByLabelText(
        'Hospital time filters',
      )

    expect(
      within(filters).getByRole(
        'button',
        {
          name: '<15M',
        },
      ),
    ).toBeInTheDocument()

    expect(
      within(filters).getByRole(
        'button',
        {
          name: '3H+',
        },
      ),
    ).toBeInTheDocument()
  })

  it('shows Inbound, Outbound and Abroad travel filters', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    fireEvent.click(
      within(
        getPrimaryNav(),
      ).getByRole(
        'button',
        {
          name: 'TRAVEL',
        },
      ),
    )

    const filters =
      screen.getByLabelText(
        'Travel state filters',
      )

    for (
      const label of [
        'INBOUND',
        'OUTBOUND',
        'ABROAD',
      ]
    ) {
      expect(
        within(filters).getByRole(
          'button',
          {
            name: label,
          },
        ),
      ).toBeInTheDocument()
    }
  })

  it('keeps unavailable opponents out of WAR top targets', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    expect(
      screen.queryByText(
        'RookSeven',
      ),
    ).not.toBeInTheDocument()

    expect(
      screen.getByText(
        'AshenFox',
      ),
    ).toBeInTheDocument()
  })

  it('filters WAR TARGETS by current state', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    openTargets()

    const filters =
      screen.getByLabelText(
        'War target filters',
      )

    fireEvent.click(
      within(filters).getByRole(
        'button',
        {
          name: 'HOSPITAL',
        },
      ),
    )

    expect(
      screen.getByText(
        'RookSeven',
      ),
    ).toBeInTheDocument()

    expect(
      screen.queryByText(
        'Old_Nick',
      ),
    ).not.toBeInTheDocument()
  })

  it('does not offer ATTACK for an unavailable opponent', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    openTargets()

    const filters =
      screen.getByLabelText(
        'War target filters',
      )

    fireEvent.click(
      within(filters).getByRole(
        'button',
        {
          name: 'HOSPITAL',
        },
      ),
    )

    const card =
      screen
        .getByText('RookSeven')
        .closest('article')

    expect(card).not.toBeNull()

    expect(
      within(card!).queryByRole(
        'link',
        {
          name: 'ATTACK',
        },
      ),
    ).not.toBeInTheDocument()

    expect(
      within(card!).getByText(
        'UNAVAILABLE',
      ),
    ).toBeInTheDocument()
  })

  it('routes ATTACK through the Torn player profile', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    openTargets()

    const card =
      screen
        .getByText('Old_Nick')
        .closest('article')

    expect(card).not.toBeNull()

    expect(
      within(card!).getByRole(
        'link',
        {
          name: 'ATTACK',
        },
      ),
    ).toHaveAttribute(
      'href',
      'https://www.torn.com/profiles.php?XID=410021',
    )
  })

  it('cycles the WAR TARGETS sort control', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    openTargets()

    expect(
      screen.getByText(
        'Best for me',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'Change target sort',
        },
      ),
    )

    expect(
      screen.getByText(
        'Lowest BS',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'Change target sort',
        },
      ),
    )

    expect(
      screen.getByText(
        'Highest FF',
      ),
    ).toBeInTheDocument()
  })

  it('filters Hospital opportunities by release window', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    fireEvent.click(
      within(
        getPrimaryNav(),
      ).getByRole(
        'button',
        {
          name: 'HOSPITAL',
        },
      ),
    )

    const filters =
      screen.getByLabelText(
        'Hospital time filters',
      )

    fireEvent.click(
      within(filters).getByRole(
        'button',
        {
          name: '<15M',
        },
      ),
    )

    expect(
      screen.getByText(
        'RookSeven',
      ),
    ).toBeInTheDocument()

    expect(
      screen.queryByText(
        'StoneCrown',
      ),
    ).not.toBeInTheDocument()
  })

  it('filters Travel by state and explains the estimate evidence', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
        travelWorkspace={travelWorkspace}
      />,
    )

    fireEvent.click(
      within(
        getPrimaryNav(),
      ).getByRole(
        'button',
        {
          name: 'TRAVEL',
        },
      ),
    )

    const filters =
      screen.getByLabelText(
        'Travel state filters',
      )

    fireEvent.click(
      within(filters).getByRole(
        'button',
        {
          name: 'OUTBOUND',
        },
      ),
    )

    expect(
      screen.getByText(
        'BlueAsh',
      ),
    ).toBeInTheDocument()

    expect(
      screen.queryByText(
        'RedHarbour',
      ),
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(filters).getByRole(
        'button',
        {
          name: 'INBOUND',
        },
      ),
    )

    fireEvent.click(
      screen.getByText(
        'ⓘ WHY THIS ESTIMATE',
      ),
    )

    expect(
      screen.getByText(
        /Observed aircraft image: light aircraft/i,
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /Private Island Airstrip/i,
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      within(filters).getByRole('button', {
        name: 'ABROAD',
      }),
    )

    expect(screen.getByText('CaymanHospital')).toBeInTheDocument()
    expect(screen.getByText('In Cayman Islands · HOSPITAL')).toBeInTheDocument()
    expect(screen.getByText('IN HOSPITAL · 18:00')).toBeInTheDocument()
  })


  it('labels target suitability explicitly in Spy Room', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    openTargets()

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'SPY ROOM',
        },
      ),
    )

    expect(
      screen.getAllByText(
        'SUITABILITY',
      ).length,
    ).toBeGreaterThan(0)

    expect(
      screen.getByText(
        'GOOD FIT',
      ),
    ).toBeInTheDocument()
  })

  it('opens player detail by tapping a target identity', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Player details for Old_Nick',
      }),
    )

    const drawer = screen.getByRole('dialog', {
      name: 'Intel for Old_Nick',
    })
    expect(drawer).toBeInTheDocument()
    expect(within(drawer).getByText('410021')).toBeInTheDocument()
  })

  it('opens player detail from Travel', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
        travelWorkspace={travelWorkspace}
      />,
    )

    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Primary' }))
        .getByRole('button', { name: 'TRAVEL' }),
    )
    const travelPlayer = screen.getByRole('button', {
      name: 'Player details for RedHarbour',
    })
    expect(within(travelPlayer).queryByText('[510102]')).not.toBeInTheDocument()
    expect(within(travelPlayer).getByText('RedHarbour')).toBeInTheDocument()
    expect(screen.getByText('LVL 31')).toBeInTheDocument()

    fireEvent.click(travelPlayer)

    const drawer = screen.getByRole('dialog', {
      name: 'Intel for RedHarbour',
    })
    expect(within(drawer).getByText('510102')).toBeInTheDocument()
    expect(within(drawer).getByText('31')).toBeInTheDocument()
  })

  it('opens explainable intel in a drawer', () => {
    render(
      <AppShell
        connection={connection}
        onDisconnect={vi.fn()}
      />,
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'Intel for Old_Nick',
        },
      ),
    )

    expect(
      screen.getByRole(
        'dialog',
        {
          name: 'Intel for Old_Nick',
        },
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Deterministic BS-ratio band',
      ),
    ).toBeInTheDocument()
  })
})
