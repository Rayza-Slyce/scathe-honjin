import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import Onboarding from '../features/onboarding/Onboarding'
import {
  TORN_CUSTOM_KEY_URL,
} from '../features/onboarding/links'

const connectHonjinMock = vi.fn()
const registerFfScouterMock = vi.fn()
const checkFfScouterMock = vi.fn()
const clearStoredKeyMock = vi.fn()
const readStoredKeyMock = vi.fn()

vi.mock('../app/connect', () => ({
  HonjinConnectionError: class
    HonjinConnectionError extends Error {
    kind = 'missing-selections'
    missingSelections = []
  },
  connectHonjin: (
    ...args: unknown[]
  ) => connectHonjinMock(...args),
}))

vi.mock(
  '../api/ffscouter/onboarding',
  () => ({
    registerFfScouter: (
      ...args: unknown[]
    ) => registerFfScouterMock(...args),

    checkFfScouterRegistration: (
      ...args: unknown[]
    ) => checkFfScouterMock(...args),
  }),
)

vi.mock(
  '../security/api-key-storage',
  () => ({
    clearStoredTornApiKey: () =>
      clearStoredKeyMock(),

    readStoredTornApiKey: () =>
      readStoredKeyMock(),
  }),
)

const TEST_KEY = '1234567890ABCDEF'

const connectedResult = {
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

afterEach(() => {
  cleanup()
})

describe('Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readStoredKeyMock.mockReturnValue(null)
  })

  it('renders the first-run connection controls', () => {
    render(<Onboarding />)

    expect(
      screen.getByRole('heading', {
        name: 'WELCOME',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('link', {
        name: 'CREATE TORN KEY',
      }),
    ).toHaveAttribute(
      'href',
      TORN_CUSTOM_KEY_URL,
    )

    expect(
      screen.getByRole('checkbox', {
        name: /Remember this device/i,
      }),
    ).not.toBeChecked()

    expect(
      screen.getByLabelText(
        'Torn API key',
      ),
    ).toHaveAttribute(
      'type',
      'password',
    )
  })

  it('requests exactly the HONJIN key selections in the Torn creation link', () => {
    expect(TORN_CUSTOM_KEY_URL).toContain(
      'user=basic,battlestats,property,attacks,hof,profile,search',
    )

    expect(TORN_CUSTOM_KEY_URL).toContain(
      'faction=wars,chain,members,search',
    )
  })

  it('connects and displays player and faction names', async () => {
    connectHonjinMock.mockResolvedValue(
      connectedResult,
    )

    render(<Onboarding />)

    fireEvent.change(
      screen.getByLabelText(
        'Torn API key',
      ),
      {
        target: {
          value: TEST_KEY,
        },
      },
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'CONNECT',
      }),
    )

    await waitFor(() => {
      expect(
        screen.getByText('Rayza'),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText('SCATHE'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('8,675'),
    ).toBeInTheDocument()

    expect(
      connectHonjinMock,
    ).toHaveBeenCalledWith(
      TEST_KEY,
      'session',
    )
  })

  it('uses remembered-device persistence only after the user selects it', async () => {
    connectHonjinMock.mockResolvedValue(
      connectedResult,
    )

    render(<Onboarding />)

    fireEvent.change(
      screen.getByLabelText(
        'Torn API key',
      ),
      {
        target: {
          value: TEST_KEY,
        },
      },
    )

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /Remember this device/i,
      }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'CONNECT',
      }),
    )

    await waitFor(() => {
      expect(
        connectHonjinMock,
      ).toHaveBeenCalledWith(
        TEST_KEY,
        'device',
      )
    })
  })

  it('automatically reconnects a remembered device on startup', async () => {
    readStoredKeyMock.mockReturnValue({
      apiKey: TEST_KEY,
      persistence: 'device',
    })

    connectHonjinMock.mockResolvedValue(
      connectedResult,
    )

    render(<Onboarding />)

    await waitFor(() => {
      expect(
        connectHonjinMock,
      ).toHaveBeenCalledWith(
        TEST_KEY,
        'device',
      )
    })

    expect(
      screen.getByText('Rayza'),
    ).toBeInTheDocument()
  })
})
