import {
  type FormEvent,
  useEffect,
  useState,
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
  connectHonjin,
} from '../../app/connect'
import type {
  HonjinConnection,
} from '../../app/connect'
import {
  clearStoredTornApiKey,
  readStoredTornApiKey,
} from '../../security/api-key-storage'
import type {
  TornApiKeyPersistence,
} from '../../security/api-key-storage'
import {
  FFSCOUTER_POLICY_URL,
  TORN_CUSTOM_KEY_URL,
} from './links'
import AppShell from '../shell/AppShell'
import './onboarding.css'

type ConnectPhase =
  | 'idle'
  | 'connecting'

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
  const [initialStoredKey] =
    useState(() =>
      readStoredTornApiKey(),
    )

  const [apiKey, setApiKey] =
    useState(
      () =>
        initialStoredKey?.apiKey ?? '',
    )

  const [rememberDevice, setRememberDevice] =
    useState(
      () =>
        initialStoredKey?.persistence ===
        'device',
    )

  const [phase, setPhase] =
    useState<ConnectPhase>(
      () =>
        initialStoredKey
          ? 'connecting'
          : 'idle',
    )

  const [connection, setConnection] =
    useState<HonjinConnection | null>(
      null,
    )

  const [displayError, setDisplayError] =
    useState<DisplayError | null>(
      null,
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

  const [entered, setEntered] =
    useState(false)

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

  useEffect(() => {
    if (!initialStoredKey) {
      return
    }

    let active = true

    void connectHonjin(
      initialStoredKey.apiKey,
      initialStoredKey.persistence,
    )
      .then((result) => {
        if (!active) {
          return
        }

        setConnection(result)
        setDisplayError(null)
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setConnection(null)
        setDisplayError(
          describeError(error),
        )
      })
      .finally(() => {
        if (active) {
          setPhase('idle')
        }
      })

    return () => {
      active = false
    }
  }, [initialStoredKey])

  async function handleConnect(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const persistence:
      TornApiKeyPersistence =
        rememberDevice
          ? 'device'
          : 'session'

    setPhase('connecting')
    setDisplayError(null)
    setConnection(null)
    setFfError(null)
    setFfConsent(false)

    try {
      const result =
        await connectHonjin(
          apiKey,
          persistence,
        )

      setConnection(result)
    } catch (error) {
      setDisplayError(
        describeError(error),
      )
    } finally {
      setPhase('idle')
    }
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
    clearStoredTornApiKey()

    setApiKey('')
    setRememberDevice(false)
    setConnection(null)
    setDisplayError(null)
    setFfConsent(false)
    setFfError(null)
    setFfRetryUntil(null)
    setEntered(false)
  }

  if (entered && connection) {
    return (
      <AppShell
        connection={connection}
        onDisconnect={handleDisconnect}
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

        {!connection && (
          <>
            <p className="intro">
              HONJIN uses your read-only Torn
              API key to identify you, load
              your battle stats and personalise
              Ranked War intelligence.
            </p>

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
                  ? 'CONNECTING…'
                  : 'CONNECT'}
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
                  HONJIN uses FFScouter for
                  free opponent battle-stat
                  estimates and your Fair Fight
                  context.
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
                  FFScouter unavailable
                </strong>

                <p>
                  {
                    connection.ffscouter
                      .message
                  }
                </p>

                <p className="muted">
                  Torn functionality remains
                  available. Battle-stat
                  suitability will be unavailable
                  until FFScouter reconnects.
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
                setEntered(true)
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
    </main>
  )
}
