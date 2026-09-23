const TORN_API_BASE_URL = 'https://api.torn.com/v2/'

export type TornApiErrorKind =
  | 'invalid-key'
  | 'network'
  | 'http'
  | 'permission'
  | 'api'
  | 'invalid-response'

export class TornApiError extends Error {
  readonly kind: TornApiErrorKind
  readonly httpStatus: number | null
  readonly code: number | null

  constructor(
    message: string,
    kind: TornApiErrorKind,
    httpStatus: number | null = null,
    code: number | null = null,
  ) {
    super(message)
    this.name = 'TornApiError'
    this.kind = kind
    this.httpStatus = httpStatus
    this.code = code
  }
}

export function isPlausibleTornApiKey(
  value: string,
): boolean {
  return /^[A-Za-z0-9]{16}$/.test(value.trim())
}

export function normaliseTornApiKey(
  value: string,
): string {
  const key = value.trim()

  if (!isPlausibleTornApiKey(key)) {
    throw new TornApiError(
      'Enter a valid Torn API key.',
      'invalid-key',
    )
  }

  return key
}

interface TornErrorDetails {
  code: number | null
  message: string | null
}

function readTornError(
  body: unknown,
): TornErrorDetails | null {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('error' in body)
  ) {
    return null
  }

  const error = body.error

  if (
    typeof error !== 'object' ||
    error === null
  ) {
    return null
  }

  const code =
    'code' in error &&
    typeof error.code === 'number' &&
    Number.isInteger(error.code)
      ? error.code
      : null

  const message =
    'error' in error &&
    typeof error.error === 'string'
      ? error.error
      : null

  return { code, message }
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
    throw new TornApiError(
      'Torn returned an unreadable response.',
      'invalid-response',
      response.status,
    )
  }
}

export async function requestTornJson<T>(
  endpoint: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const key = normaliseTornApiKey(apiKey)

  const url = new URL(
    endpoint.replace(/^\/+/, ''),
    TORN_API_BASE_URL,
  )

  let response: Response

  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `ApiKey ${key}`,
      },
    })
  } catch {
    throw new TornApiError(
      'Could not connect to Torn.',
      'network',
    )
  }

  const body = await readJsonBody(response)
  const tornError = readTornError(body)

  if (tornError) {
    const permissionDenied = tornError.code === 16

    throw new TornApiError(
      permissionDenied
        ? 'This Torn key is missing a required selection.'
        : tornError.message ?? 'Torn rejected the request.',
      permissionDenied ? 'permission' : 'api',
      response.status,
      tornError.code,
    )
  }

  if (!response.ok) {
    throw new TornApiError(
      `Torn request failed with HTTP ${response.status}.`,
      'http',
      response.status,
    )
  }

  if (body === null) {
    throw new TornApiError(
      'Torn returned an empty response.',
      'invalid-response',
      response.status,
    )
  }

  return body as T
}
