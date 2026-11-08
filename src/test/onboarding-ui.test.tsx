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
const startUsageMock = vi.fn<(...args: unknown[]) => () => void>(() => vi.fn())

vi.mock('../app/usage-diagnostics', () => ({
  startUsageDiagnostics: (...args: unknown[]) => startUsageMock(...args),
}))

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
    storeTornApiKey: vi.fn(),
  }),
)

const TEST_KEY = '1234567890ABCDEF'

const connectedResult = {
  membershipVerifiedAt: Date.now(),
  user: {
    id: 123456,
    name: 'Rayza',
    faction: {
      id: 48572,
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
    connectedResult.membershipVerifiedAt = Date.now()
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

  it('opens the approved project README before an API key is entered', () => {
    render(<Onboarding />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'README / ABOUT HONJIN',
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
      'Your Torn API key is never stored on the HONJIN backend or sent to the Recon Engine.',
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
      screen.queryByRole('dialog'),
    ).not.toBeInTheDocument()
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
      expect.any(Function),
      expect.objectContaining({ persist: false }),
    )
    expect(startUsageMock).not.toHaveBeenCalled()
  })

  it('starts diagnostics with only the validated player ID after entering HONJIN', async () => {
    connectHonjinMock.mockResolvedValue(connectedResult)
    render(<Onboarding />)
    fireEvent.change(screen.getByLabelText('Torn API key'), { target: { value: TEST_KEY } })
    fireEvent.click(screen.getByRole('button', { name: 'CONNECT' }))
    const enter = await screen.findByRole('button', { name: 'ENTER HONJIN' })
    expect(startUsageMock).not.toHaveBeenCalled()
    fireEvent.click(enter)
    await waitFor(() => expect(startUsageMock).toHaveBeenCalledExactlyOnceWith(123456))
  })

  it('never starts diagnostics when identity validation fails', async () => {
    connectHonjinMock.mockRejectedValueOnce(new Error('Identity validation failed'))
    render(<Onboarding />)
    fireEvent.change(screen.getByLabelText('Torn API key'), { target: { value: TEST_KEY } })
    fireEvent.click(screen.getByRole('button', { name: 'CONNECT' }))
    expect(await screen.findByText('Identity validation failed')).toBeInTheDocument()
    expect(startUsageMock).not.toHaveBeenCalled()
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
        expect.any(Function),
        expect.objectContaining({ persist: false }),
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
        expect.any(Function),
        expect.objectContaining({ persist: false }),
      )
    })

    expect(
      screen.getByText('Rayza'),
    ).toBeInTheDocument()
  })
  it.each([
    ['unavailable', 'FFScouter status unavailable', 'RETRY FFSCOUTER'],
    ['policy-update-required', 'FFScouter policy update', 'RECHECK STATUS'],
    ['registration-required', 'Enable battle intel', 'ENABLE BATTLE INTEL'],
  ] as const)(
    'keeps a remembered device on the connection screen when FFScouter is %s',
    async (status, heading, action) => {
      readStoredKeyMock.mockReturnValue({
        apiKey: TEST_KEY,
        persistence: 'device',
      })
      connectHonjinMock.mockResolvedValue({
        ...connectedResult,
        ffscouter:
          status === 'unavailable'
            ? { status, message: 'Synthetic outage.' }
            : { status },
      })

      render(<Onboarding />)

      expect(
        await screen.findByText(heading),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: action }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'ENTER HONJIN' }),
      ).toBeInTheDocument()

      if (status === 'unavailable') {
        expect(
          screen.getByText(/does not mean your registration has been lost/i),
        ).toBeInTheDocument()
        expect(
          screen.getByText(/only checks the existing registration/i),
        ).toBeInTheDocument()
        expect(registerFfScouterMock).not.toHaveBeenCalled()
      }

      if (status === 'registration-required') {
        expect(
          screen.getByText(/reports that this Torn key is not currently registered/i),
        ).toBeInTheDocument()
      }
    },
  )

})
