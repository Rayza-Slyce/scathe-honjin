import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  FfScouterApiError,
  checkFfScouterRegistration,
  registerFfScouter,
} from '../../api/ffscouter/onboarding'
import type {
  MissingTornSelection,
} from '../../api/torn/onboarding'
import {
  HonjinConnectionError,
} from '../../app/connect'
import type {
  HonjinConnection,
} from '../../app/connect'
import { HonjinSession } from '../../app/session'
import type {
  TornApiKeyPersistence,
} from '../../security/api-key-storage'
import {
  FFSCOUTER_POLICY_URL,
  TORN_CUSTOM_KEY_URL,
} from './links'
import LiveAppShell from '../shell/LiveAppShell'
import { loadSharedTravelObservations } from '../../api/honjin-intel/live'
import { loadSharedActivitySummary } from '../../api/honjin-intel/activity'
import { registerSharedWatchInterest } from '../../api/honjin-intel/watch'
import ReadmeDialog from './ReadmeDialog'
import { startUsageDiagnostics } from '../../app/usage-diagnostics'
import './onboarding.css'

interface DisplayError {
  message: string
  missingSelections:
    readonly MissingTornSelection[]
}

function describeError(
  error: unknown,
): DisplayError {
  if (
    error instanceof HonjinConnectionError
  ) {
    return {
      message: error.message,
      missingSelections:
        error.missingSelections,
    }
  }

  return {
    message:
      error instanceof Error
        ? error.message
        : 'HONJIN could not complete the connection.',
    missingSelections: [],
  }
}

function formatSelection(
  selection: MissingTornSelection,
): string {
  const scope =
    selection.scope === 'user'
      ? 'User'
      : 'Faction'

  return `${scope}: ${selection.selection}`
}

function describeFfScouterError(
  error: unknown,
): string {
  if (
    error instanceof FfScouterApiError &&
    error.httpStatus === 429
  ) {
    if (
      error.retryAfterSeconds !== null
    ) {
      return (
        `${error.message} ` +
        `Retry in ${Math.ceil(
          error.retryAfterSeconds,
        )} seconds.`
      )
    }

    return (
      `${error.message} ` +
      'FFScouter returned HTTP 429.'
    )
  }

  return error instanceof Error
    ? error.message
    : 'FFScouter request failed.'
}

function formatBattleStats(
  value: number,
): string {
  return new Intl.NumberFormat(
    'en-GB',
  ).format(value)
}

export default function Onboarding() {
  const [session] = useState(() => new HonjinSession())
  const access = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const connection = access.connection
  const runtime = access.runtime
  const phase = access.phase === 'connecting' || access.phase === 'verifying' ? 'connecting' : 'idle'
  const displayError = access.error ? describeError(access.error) : null
  const setConnection = (update: (current: HonjinConnection | null) => HonjinConnection | null) => session.updateConnection(update, connection)

  const [apiKey, setApiKey] =
    useState(
      () =>
        session.initialKey(),
    )

  const [rememberDevice, setRememberDevice] =
    useState(
      () =>
        session.remembered(),
    )

  const [
    ffConsent,
    setFfConsent,
  ] = useState(false)

  const [
    ffBusy,
    setFfBusy,
  ] = useState(false)

  const [
    ffError,
    setFfError,
  ] = useState<string | null>(null)

  const [
    ffRetryUntil,
    setFfRetryUntil,
  ] = useState<number | null>(null)

  const entered = access.entered

  const [readmeOpen, setReadmeOpen] =
    useState(false)

  const shared = useMemo(() => {
    const transport = access.transport
    if (!transport) return null
    return {
      travel: (ids: readonly number[]) => loadSharedTravelObservations(ids, transport),
      activity: (id: number) => loadSharedActivitySummary(id, transport),
      watch: (interest: Parameters<typeof registerSharedWatchInterest>[0]) => registerSharedWatchInterest(interest, transport),
    }
  }, [access.transport])

  useEffect(() => {
    session.start(() => {
      setApiKey('')
      setRememberDevice(false)
      setFfConsent(false)
      setFfBusy(false)
      setFfError(null)
      setFfRetryUntil(null)
    })
    return () => session.stop()
  }, [session])

  const usagePlayerId = entered && runtime ? connection?.user.id : undefined
  useEffect(() => {
    if (usagePlayerId === undefined) return
    return startUsageDiagnostics(usagePlayerId)
  }, [usagePlayerId])

  useEffect(() => {
    if (ffRetryUntil === null) {
      return
    }

    const delay = Math.max(
      0,
      ffRetryUntil - Date.now(),
    )

    const timeoutId =
      window.setTimeout(
        () => setFfRetryUntil(null),
        delay,
      )

    return () =>
      window.clearTimeout(timeoutId)
  }, [ffRetryUntil])

  async function handleConnect(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const persistence:
      TornApiKeyPersistence =
        rememberDevice
          ? 'device'
          : 'session'

    setFfError(null)
    setFfConsent(false)
    await session.retry(apiKey, persistence)
  }

  function applyFfStatus(
    status: {
      registered: boolean
      policyUpdateRequired: boolean
    },
  ) {
    if (status.policyUpdateRequired) {
      setConnection((current) =>
        current
          ? {
              ...current,
              ffscouter: {
                status:
                  'policy-update-required',
              },
            }
          : current,
      )
      return
    }

    setConnection((current) =>
      current
        ? {
            ...current,
            ffscouter: {
              status: status.registered
                ? 'registered'
                : 'registration-required',
            },
          }
        : current,
    )
  }

  async function handleRegisterFfScouter() {
    setFfBusy(true)
    setFfError(null)

    try {
      const status =
        await registerFfScouter(
          apiKey,
          ffConsent,
        )

      applyFfStatus(status)
      setFfConsent(false)
      setFfRetryUntil(null)
    } catch (error) {
      /*
       * A provider/edge 429 can be ambiguous. Recheck once on
       * the separate status route before treating registration
       * as failed. This never retries the registration POST.
       */
      if (
        error instanceof FfScouterApiError &&
        error.httpStatus === 429
      ) {
        try {
          const status =
            await checkFfScouterRegistration(
              apiKey,
            )

          if (
            status.registered ||
            status.policyUpdateRequired
          ) {
            applyFfStatus(status)

            if (status.registered) {
              setFfConsent(false)
            }

            setFfRetryUntil(null)
            return
          }
        } catch {
          // Preserve the original registration error.
        }

        if (
          error.retryAfterSeconds !== null
        ) {
          setFfRetryUntil(
            Date.now() +
              Math.max(
                1,
                error.retryAfterSeconds,
              ) *
                1000,
          )
        }
      }

      setFfError(
        describeFfScouterError(error),
      )
    } finally {
      setFfBusy(false)
    }
  }

  async function handleRecheckFfScouter() {
    setFfBusy(true)
    setFfError(null)

    try {
      const status =
        await checkFfScouterRegistration(
          apiKey,
        )

      applyFfStatus(status)
    } catch (error) {
      setFfError(
        describeFfScouterError(error),
      )
    } finally {
      setFfBusy(false)
    }
  }

  function handleDisconnect() {
    session.disconnect()
  }

  if (
    entered &&
    connection &&
    runtime &&
    shared
  ) {
    return (
      <LiveAppShell
        connection={connection}
        runtime={runtime}
        onDisconnect={handleDisconnect}
        sharedTravelObservationLoader={shared.travel}
        sharedActivitySummaryLoader={shared.activity}
        sharedWatchRegistrar={shared.watch}
      />
    )
  }

  return (
    <main className="onboarding">
      <section className="onboarding-card">
        <img
          className="scathe-banner"
          src="/assets/scathe-banner.jpg"
          alt="SCATHE"
        />

        <p className="eyebrow">
          SCATHE HONJIN
        </p>

        <h1>
          {connection
            ? 'CONNECTED'
            : 'WELCOME'}
        </h1>

        {phase === 'connecting' && (
          <p className="status-panel" role="status">
            Verifying current SCATHE membership with Torn…
          </p>
        )}

        {!connection && (
          <>
            <p className="intro">
              HONJIN uses your read-only Torn
              API key to identify you, load
              your battle stats and personalise
              Ranked War intelligence.
            </p>

            <p className="muted">
              Private usage diagnostics: after you connect and enter HONJIN,
              the owner records your Torn player ID, visits and approximate
              visible usage time for 30 days. No API keys or battle stats are
              included. This is separate from Recon observations.
            </p>

            <button
              type="button"
              className="secondary-button readme-button"
              onClick={() =>
                setReadmeOpen(true)
              }
            >
              README / ABOUT HONJIN
            </button>

            <a
              className="primary-button link-button"
              href={TORN_CUSTOM_KEY_URL}
              target="_blank"
              rel="noreferrer"
            >
              CREATE TORN KEY
            </a>

            <p className="helper">
              Torn will show the requested
              selections before you use the
              generated key.
            </p>

            <form
              className="connect-form"
              onSubmit={handleConnect}
            >
              <label htmlFor="torn-key">
                Torn API key
              </label>

              <input
                id="torn-key"
                name="torn-key"
                type="password"
                value={apiKey}
                onChange={(event) =>
                  setApiKey(
                    event.target.value,
                  )
                }
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={16}
                placeholder="Paste 16-character key"
                disabled={
                  phase === 'connecting'
                }
              />

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(event) =>
                    setRememberDevice(
                      event.target.checked,
                    )
                  }
                  disabled={
                    phase === 'connecting'
                  }
                />

                <span>
                  <strong>
                    Remember this device
                  </strong>
                  <small>
                    Keeps your read-only key
                    in this browser. Do not
                    enable on a shared device.
                  </small>
                </span>
              </label>

              <button
                className="primary-button"
                type="submit"
                disabled={
                  phase === 'connecting' ||
                  apiKey.trim().length === 0
                }
              >
                {phase === 'connecting'
                  ? access.phase === 'verifying' ? 'VERIFYING MEMBERSHIP…' : 'CONNECTING…'
                  : access.phase === 'unavailable' ? 'RETRY CONNECTION' : 'CONNECT'}
              </button>
            </form>
          </>
        )}

        {displayError && (
          <div
            className="status-panel error-panel"
            role="alert"
          >
            <strong>
              Connection failed
            </strong>

            <p>
              {displayError.message}
            </p>

            {displayError
              .missingSelections
              .length > 0 && (
              <ul>
                {displayError
                  .missingSelections
                  .map((selection) => (
                    <li
                      key={
                        selection.scope +
                        selection.selection
                      }
                    >
                      {formatSelection(
                        selection,
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        {connection && (
          <>
            <div className="identity-panel">
              <div>
                <span>
                  Torn connected
                </span>
                <strong>
                  {connection.user.name}
                  <small>
                    {' '}
                    [{connection.user.id}]
                  </small>
                </strong>
              </div>

              <div>
                <span>
                  Faction
                </span>
                <strong>
                  {
                    connection.user
                      .faction.name
                  }
                  <small>
                    {' '}
                    [
                    {
                      connection.user
                        .faction.id
                    }
                    ]
                  </small>
                </strong>
              </div>

              <div>
                <span>
                  Battle stats
                </span>
                <strong>
                  {formatBattleStats(
                    connection.user
                      .battleStatsTotal,
                  )}
                </strong>
              </div>
            </div>

            {connection.ffscouter.status ===
              'registered' && (
              <div className="status-panel success-panel">
                <strong>
                  ✓ FFScouter connected
                </strong>
                <p>
                  Free battle-stat intelligence
                  is enabled.
                </p>
              </div>
            )}

            {connection.ffscouter.status ===
              'registration-required' && (
              <div className="status-panel">
                <strong>
                  Enable battle intel
                </strong>

                <p>
                  FFScouter reports that this
                  Torn key is not currently
                  registered. HONJIN uses
                  FFScouter for free opponent
                  battle-stat estimates and your
                  Fair Fight context.
                </p>

                <a
                  href={FFSCOUTER_POLICY_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read FFScouter Data Policy
                  and Terms
                </a>

                <label className="check-row ff-consent">
                  <input
                    type="checkbox"
                    checked={ffConsent}
                    onChange={(event) =>
                      setFfConsent(
                        event.target.checked,
                      )
                    }
                  />

                  <span>
                    I have read and agree
                  </span>
                </label>

                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    !ffConsent ||
                    ffBusy ||
                    ffRetryUntil !== null
                  }
                  onClick={
                    handleRegisterFfScouter
                  }
                >
                  {ffBusy
                    ? 'ENABLING…'
                    : ffRetryUntil !== null
                      ? 'WAIT TO RETRY'
                      : 'ENABLE BATTLE INTEL'}
                </button>
              </div>
            )}

            {connection.ffscouter.status ===
              'policy-update-required' && (
              <div className="status-panel warning-panel">
                <strong>
                  FFScouter policy update
                </strong>

                <p>
                  Review and accept the current
                  FFScouter policy, then recheck
                  your connection.
                </p>

                <a
                  href={FFSCOUTER_POLICY_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open FFScouter policy
                </a>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={ffBusy}
                  onClick={
                    handleRecheckFfScouter
                  }
                >
                  {ffBusy
                    ? 'CHECKING…'
                    : 'RECHECK STATUS'}
                </button>
              </div>
            )}

            {connection.ffscouter.status ===
              'unavailable' && (
              <div className="status-panel warning-panel">
                <strong>
                  FFScouter status unavailable
                </strong>

                <p>
                  {
                    connection.ffscouter
                      .message
                  }
                </p>

                <p>
                  HONJIN could not verify this
                  key&apos;s FFScouter status.
                  This does not mean your
                  registration has been lost.
                </p>

                <p className="muted">
                  RETRY FFSCOUTER only checks
                  the existing registration. It
                  does not register the key. Torn
                  functionality remains available
                  meanwhile.
                </p>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={ffBusy}
                  onClick={
                    handleRecheckFfScouter
                  }
                >
                  {ffBusy
                    ? 'CHECKING…'
                    : 'RETRY FFSCOUTER'}
                </button>
              </div>
            )}

            {ffError && (
              <div
                className="status-panel error-panel"
                role="alert"
              >
                <strong>
                  FFScouter error
                </strong>
                <p>{ffError}</p>
              </div>
            )}

            <button
              type="button"
              className="primary-button enter-button"
              onClick={() =>
                void session.enter()
              }
            >
              ENTER HONJIN
            </button>

            <button
              type="button"
              className="text-button"
              onClick={handleDisconnect}
            >
              Disconnect / forget key
            </button>
          </>
        )}

      </section>

      <ReadmeDialog
        open={readmeOpen}
        onClose={() =>
          setReadmeOpen(false)
        }
      />
    </main>
  )
}
