import {
  normaliseTornApiKey,
} from '../torn/client'
import type {
  FfScouterCheckKeyResponseDto,
  FfScouterErrorResponseDto,
} from './onboarding-contracts'

const FFSCOUTER_BASE_URL =
  'https://ffscouter.com/api/v1/'

export interface FfScouterRegistrationStatus {
  registered: boolean
  policyUpdateRequired: boolean
}

export type FfScouterErrorKind =
  | 'network'
  | 'http'
  | 'invalid-response'
  | 'consent-required'

export class FfScouterApiError extends Error {
  readonly kind: FfScouterErrorKind
  readonly httpStatus: number | null
  readonly code: number | null
  readonly retryAfterSeconds: number | null

  constructor(
    message: string,
    kind: FfScouterErrorKind,
    options: {
      httpStatus?: number | null
      code?: number | null
      retryAfterSeconds?: number | null
    } = {},
  ) {
    super(message)
    this.name = 'FfScouterApiError'
    this.kind = kind
    this.httpStatus =
      options.httpStatus ?? null
    this.code = options.code ?? null
    this.retryAfterSeconds =
      options.retryAfterSeconds ?? null
  }
}

async function readJsonBody(
  response: Response,
): Promise<unknown> {
  const text = await response.text()

  if (text.trim() === '') {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new FfScouterApiError(
      'FFScouter returned an unreadable response.',
      'invalid-response',
      {
        httpStatus: response.status,
      },
    )
  }
}

function readFfScouterError(
  body: unknown,
): FfScouterErrorResponseDto {
  if (
    typeof body !== 'object' ||
    body === null
  ) {
    return {}
  }

  return {
    code:
      'code' in body &&
      typeof body.code === 'number' &&
      Number.isInteger(body.code)
        ? body.code
        : undefined,
    error:
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : undefined,
    retry_after_seconds:
      'retry_after_seconds' in body &&
      typeof body.retry_after_seconds ===
        'number' &&
      Number.isFinite(
        body.retry_after_seconds,
      )
        ? body.retry_after_seconds
        : undefined,
  }
}

function normaliseCheckKeyResponse(
  body: unknown,
): FfScouterRegistrationStatus {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('is_registered' in body) ||
    typeof body.is_registered !== 'boolean' ||
    !('policy_update_required' in body) ||
    typeof body.policy_update_required !==
      'boolean'
  ) {
    throw new FfScouterApiError(
      'FFScouter returned an unexpected registration status.',
      'invalid-response',
    )
  }

  const response =
    body as FfScouterCheckKeyResponseDto

  return {
    registered: response.is_registered,
    policyUpdateRequired:
      response.policy_update_required,
  }
}

export async function checkFfScouterRegistration(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FfScouterRegistrationStatus> {
  const key = normaliseTornApiKey(apiKey)
  const url = new URL(
    'check-key',
    FFSCOUTER_BASE_URL,
  )

  url.searchParams.set('key', key)

  let response: Response

  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
      },
    })
  } catch {
    throw new FfScouterApiError(
      'Could not connect to FFScouter.',
      'network',
    )
  }

  const body = await readJsonBody(response)

  if (!response.ok) {
    const details =
      readFfScouterError(body)

    throw new FfScouterApiError(
      details.error ??
        `FFScouter request failed with HTTP ${response.status}.`,
      'http',
      {
        httpStatus: response.status,
        code: details.code,
        retryAfterSeconds:
          details.retry_after_seconds,
      },
    )
  }

  return normaliseCheckKeyResponse(body)
}

export async function registerFfScouter(
  apiKey: string,
  policyConsent: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<FfScouterRegistrationStatus> {
  if (!policyConsent) {
    throw new FfScouterApiError(
      'FFScouter registration requires explicit policy consent.',
      'consent-required',
    )
  }

  const key = normaliseTornApiKey(apiKey)

  let response: Response

  try {
    response = await fetchImpl(
      new URL(
        'register',
        FFSCOUTER_BASE_URL,
      ),
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          key,
          agree_to_data_policy: true,
          signup_source: 'ScatheHonjin',
        }),
      },
    )
  } catch {
    throw new FfScouterApiError(
      'Could not connect to FFScouter.',
      'network',
    )
  }

  const body = await readJsonBody(response)

  if (!response.ok) {
    const details =
      readFfScouterError(body)

    /*
     * Registration is idempotent from HONJIN's point of view.
     * FFScouter uses HTTP 409 / code 8 when the key is already
     * registered. Confirm that state through /check-key rather
     * than presenting it to the user as a failure.
     */
    if (
      response.status === 409 &&
      details.code === 8
    ) {
      const status =
        await checkFfScouterRegistration(
          key,
          fetchImpl,
        )

      if (!status.registered) {
        throw new FfScouterApiError(
          'FFScouter reported the key as already registered, but the status check did not confirm it.',
          'invalid-response',
          {
            httpStatus: response.status,
            code: details.code,
          },
        )
      }

      return status
    }

    throw new FfScouterApiError(
      details.error ??
        `FFScouter registration failed with HTTP ${response.status}.`,
      'http',
      {
        httpStatus: response.status,
        code: details.code,
        retryAfterSeconds:
          details.retry_after_seconds,
      },
    )
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
  ) {
    const details =
      readFfScouterError(body)

    throw new FfScouterApiError(
      body.error,
      'http',
      {
        httpStatus: response.status,
        code: details.code,
        retryAfterSeconds:
          details.retry_after_seconds,
      },
    )
  }

  /*
   * HONJIN-01 did not preserve a verified success-response
   * schema for /register. Confirm success through the already
   * verified /check-key endpoint rather than inventing one.
   */
  return checkFfScouterRegistration(
    key,
    fetchImpl,
  )
}
