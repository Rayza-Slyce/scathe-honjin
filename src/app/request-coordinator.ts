export type RequestPriority =
  | 'active-war'
  | 'explicit'
  | 'visible-spy'
  | 'background-spy'
  | 'optional'

const PRIORITY_RANK: Record<
  RequestPriority,
  number
> = {
  'active-war': 0,
  explicit: 1,
  'visible-spy': 2,
  'background-spy': 3,
  optional: 4,
}

interface CacheEntry {
  value: unknown
  expiresAt: number
}

interface QueuedRequest<T> {
  key: string
  priority: RequestPriority
  sequence: number
  cacheMs: number
  load: () => Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

export interface RequestOptions {
  key: string
  priority: RequestPriority
  cacheMs?: number
}

export interface RequestCoordinatorOptions {
  maxRequestsPerMinute?: number
  windowMs?: number
  now?: () => number
}

export const DEFAULT_TORN_SOFT_BUDGET = 40
const DEFAULT_WINDOW_MS = 60_000

export class RequestCoordinator {
  private readonly maxRequestsPerMinute: number
  private readonly windowMs: number
  private readonly now: () => number
  private readonly cache = new Map<
    string,
    CacheEntry
  >()
  private readonly inFlight = new Map<
    string,
    Promise<unknown>
  >()
  private readonly requestStarts: number[] = []
  private readonly queue: QueuedRequest<unknown>[] = []
  private wakeTimer: ReturnType<
    typeof setTimeout
  > | null = null
  private sequence = 0

  constructor(
    options: RequestCoordinatorOptions = {},
  ) {
    this.maxRequestsPerMinute =
      options.maxRequestsPerMinute ??
      DEFAULT_TORN_SOFT_BUDGET
    this.windowMs =
      options.windowMs ?? DEFAULT_WINDOW_MS
    this.now = options.now ?? Date.now

    if (
      !Number.isSafeInteger(
        this.maxRequestsPerMinute,
      ) ||
      this.maxRequestsPerMinute <= 0
    ) {
      throw new Error(
        'Request budget must be a positive integer.',
      )
    }

    if (
      !Number.isFinite(this.windowMs) ||
      this.windowMs <= 0
    ) {
      throw new Error(
        'Request budget window must be positive.',
      )
    }
  }

  request<T>(
    options: RequestOptions,
    load: () => Promise<T>,
  ): Promise<T> {
    const now = this.now()
    const cached = this.cache.get(
      options.key,
    )

    if (
      cached &&
      cached.expiresAt > now
    ) {
      return Promise.resolve(
        cached.value as T,
      )
    }

    if (cached) {
      this.cache.delete(options.key)
    }

    const existing = this.inFlight.get(
      options.key,
    )

    if (existing) {
      const queued = this.queue.find(
        (task) =>
          task.key === options.key,
      )

      if (
        queued &&
        PRIORITY_RANK[options.priority] <
          PRIORITY_RANK[queued.priority]
      ) {
        queued.priority = options.priority
      }

      return existing as Promise<T>
    }

    const promise = new Promise<T>(
      (resolve, reject) => {
        this.queue.push({
          key: options.key,
          priority: options.priority,
          sequence: this.sequence,
          cacheMs: Math.max(
            0,
            options.cacheMs ?? 0,
          ),
          load,
          resolve,
          reject,
        } as QueuedRequest<unknown>)

        this.sequence += 1
        this.drain()
      },
    )

    this.inFlight.set(
      options.key,
      promise,
    )

    return promise
  }

  clearCache(): void {
    this.cache.clear()
  }

  private pruneRequestStarts(
    now: number,
  ): void {
    while (
      this.requestStarts.length > 0 &&
      now - this.requestStarts[0] >=
        this.windowMs
    ) {
      this.requestStarts.shift()
    }
  }

  private scheduleWake(now: number): void {
    if (
      this.wakeTimer !== null ||
      this.requestStarts.length === 0
    ) {
      return
    }

    const delay = Math.max(
      0,
      this.requestStarts[0] +
        this.windowMs -
        now,
    )

    this.wakeTimer = setTimeout(() => {
      this.wakeTimer = null
      this.drain()
    }, delay)
  }

  private drain(): void {
    let now = this.now()
    this.pruneRequestStarts(now)

    while (
      this.queue.length > 0 &&
      this.requestStarts.length <
        this.maxRequestsPerMinute
    ) {
      this.queue.sort((left, right) => {
        const priorityDifference =
          PRIORITY_RANK[left.priority] -
          PRIORITY_RANK[right.priority]

        return priorityDifference !== 0
          ? priorityDifference
          : left.sequence - right.sequence
      })

      const task = this.queue.shift()

      if (!task) {
        break
      }

      now = this.now()
      this.pruneRequestStarts(now)

      if (
        this.requestStarts.length >=
        this.maxRequestsPerMinute
      ) {
        this.queue.unshift(task)
        break
      }

      this.requestStarts.push(now)

      void task
        .load()
        .then((value) => {
          if (task.cacheMs > 0) {
            this.cache.set(task.key, {
              value,
              expiresAt:
                this.now() + task.cacheMs,
            })
          }

          task.resolve(value)
        })
        .catch((error: unknown) => {
          task.reject(error)
        })
        .finally(() => {
          this.inFlight.delete(task.key)
          this.drain()
        })
    }

    if (this.queue.length > 0) {
      this.scheduleWake(this.now())
    }
  }
}
