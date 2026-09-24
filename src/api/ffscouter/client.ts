import type {
  FfScouterErrorResponseDto,
} from './onboarding-contracts'

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

export async function readFfScouterJsonBody(
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

export function readFfScouterError(
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
