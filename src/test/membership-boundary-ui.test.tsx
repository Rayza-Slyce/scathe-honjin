import { useEffect } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Onboarding from '../features/onboarding/Onboarding'
import { storeTornApiKey, readStoredTornApiKey } from '../security/api-key-storage'
import { MembershipDeniedError, MEMBERSHIP_VALID_MS } from '../app/membership'

const connectMock = vi.fn()
const startUsage = vi.fn()
const stopUsage = vi.fn()
const unmountOperational = vi.fn()
vi.mock('../app/connect', async (original) => ({
  ...await original<typeof import('../app/connect')>(),
  connectHonjin: (...args: unknown[]) => connectMock(...args),
}))
vi.mock('../app/usage-diagnostics', () => ({ startUsageDiagnostics: (...args: unknown[]) => { startUsage(...args); return stopUsage } }))
vi.mock('../features/shell/LiveAppShell', () => ({
  default: function OperationalFixture() {
    useEffect(() => () => { unmountOperational() }, [])
    return <nav aria-label="Operational fixture">WAR · TARGETS · SPY ROOM · HOSPITAL · TRAVEL · TEAM</nav>
  },
}))
const TEST_KEY = 'SYNTHETICKEY0001'
const connection = () => ({
  user: { id: 7, name: 'SyntheticMember', faction: { id: 48572, name: 'SCATHE' }, battleStatsTotal: 100 },
  ffscouter: { status: 'registered' as const }, membershipVerifiedAt: Date.now(),
})
let memberFaction: number | null
let failure = false
const fetcher = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
  vi.setSystemTime(new Date('2026-11-08T12:00:00Z'))
  sessionStorage.clear(); localStorage.clear(); vi.clearAllMocks()
  memberFaction = 48572; failure = false
  connectMock.mockReset().mockImplementation(async () => connection())
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  fetcher.mockReset().mockImplementation(async () => new Response(JSON.stringify(failure
    ? { error: { code: 5, error: 'Synthetic temporary error' } }
    : { profile: { id: 7, name: 'SyntheticMember', level: 10, faction_id: memberFaction,
      status: { state: 'Okay', description: 'Okay', details: null, until: null, plane_image_type: null },
      last_action: { status: 'Online', relative: 'now', timestamp: Date.now() / 1000 }, life: { current: 10, maximum: 10 } } }),
    { headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetcher)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
const flush = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(0) }) }

describe('membership enforcement at the real onboarding/session boundary', () => {
  it('never mounts operational UI or telemetry during an unverified remembered restoration', async () => {
    storeTornApiKey(TEST_KEY, 'device')
    let fail: (error: Error) => void = () => {}
    connectMock.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject }))
    render(<Onboarding />)
    expect(screen.queryByRole('navigation', { name: 'Operational fixture' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Verifying current SCATHE membership')
    expect(startUsage).not.toHaveBeenCalled()
    await act(async () => { fail(new MembershipDeniedError(7)); await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByRole('alert')).toHaveTextContent('only to current SCATHE members')
    expect(screen.queryByRole('navigation', { name: 'Operational fixture' })).not.toBeInTheDocument()
    expect(readStoredTornApiKey()).toBeNull()
    expect(screen.getByLabelText('Torn API key')).toHaveValue('')
  })

  it('unmounts all operational screens and stops telemetry on confirmed departure', async () => {
    storeTornApiKey(TEST_KEY, 'device')
    render(<Onboarding />); await flush()
    expect(screen.getByRole('navigation', { name: 'Operational fixture' })).toBeInTheDocument()
    expect(startUsage).toHaveBeenCalledExactlyOnceWith(7)
    memberFaction = null
    await act(async () => { await vi.advanceTimersByTimeAsync(MEMBERSHIP_VALID_MS - 30_000) })
    expect(screen.queryByRole('navigation', { name: 'Operational fixture' })).not.toBeInTheDocument()
    expect(unmountOperational).toHaveBeenCalledOnce()
    expect(stopUsage).toHaveBeenCalledOnce()
    expect(screen.getByRole('alert')).toHaveTextContent('only to current SCATHE members')
    expect(readStoredTornApiKey()).toBeNull()
    expect(screen.getByLabelText('Torn API key')).toHaveValue('')
  })

  it('withholds expired operational UI on a temporary error, keeps the key and resumes on retry', async () => {
    storeTornApiKey(TEST_KEY, 'device')
    render(<Onboarding />); await flush()
    failure = true
    await act(async () => { await vi.advanceTimersByTimeAsync(MEMBERSHIP_VALID_MS) })
    expect(screen.queryByRole('navigation', { name: 'Operational fixture' })).not.toBeInTheDocument()
    expect(readStoredTornApiKey()?.apiKey).toBe(TEST_KEY)
    expect(screen.getByLabelText('Torn API key')).toHaveValue(TEST_KEY)
    expect(screen.getByRole('alert')).toHaveTextContent('Your key has been kept')
    failure = false
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'RETRY CONNECTION' })); await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByRole('navigation', { name: 'Operational fixture' })).toBeInTheDocument()
    expect(connectMock).toHaveBeenCalledOnce()
    expect(startUsage).toHaveBeenCalledTimes(2)
  })
})
