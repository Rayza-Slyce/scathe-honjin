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

const DEFAULT_BUDGET = 'default'

interface CacheEntry {
  value: unknown
  expiresAt: number
}

interface QueuedRequest<T> {
  key: string
  priority: RequestPriority
  budget: string
  sequence: number
  cacheMs: number
  load: () => Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

interface BudgetState {
  maxRequestsPerMinute: number
  windowMs: number
  requestStarts: number[]
  wakeTimer: ReturnType<
    typeof setTimeout
  > | null
}

export interface RequestOptions {
  key: string
  priority: RequestPriority
  cacheMs?: number
  budget?: string
}

export interface RequestBudgetOptions {
  maxRequestsPerMinute: number
  windowMs?: number
}

export interface RequestCoordinatorOptions {
  maxRequestsPerMinute?: number
  windowMs?: number
  budgets?: Record<
    string,
    RequestBudgetOptions
  >
  now?: () => number
}

export const DEFAULT_TORN_SOFT_BUDGET = 40
const DEFAULT_WINDOW_MS = 60_000

function createBudgetState(
  options: RequestBudgetOptions,
  fallbackWindowMs: number,
): BudgetState {
  const maxRequestsPerMinute =
    options.maxRequestsPerMinute
  const windowMs =
    options.windowMs ?? fallbackWindowMs

  if (
    !Number.isSafeInteger(
      maxRequestsPerMinute,
    ) ||
    maxRequestsPerMinute <= 0
  ) {
    throw new Error(
      'Request budget must be a positive integer.',
    )
  }

  if (
    !Number.isFinite(windowMs) ||
    windowMs <= 0
  ) {
    throw new Error(
      'Request budget window must be positive.',
    )
  }

  return {
    maxRequestsPerMinute,
    windowMs,
    requestStarts: [],
    wakeTimer: null,
  }
}

export class RequestCoordinator {
  private readonly now: () => number
  private readonly budgets = new Map<
    string,
    BudgetState
  >()
  private readonly cache = new Map<
    string,
    CacheEntry
  >()
  private readonly inFlight = new Map<
    string,
    Promise<unknown>
  >()
  private readonly queue: QueuedRequest<unknown>[] = []
  private sequence = 0

  constructor(
    options: RequestCoordinatorOptions = {},
  ) {
    const defaultWindowMs =
      options.windowMs ?? DEFAULT_WINDOW_MS

    this.now = options.now ?? Date.now

    this.budgets.set(
      DEFAULT_BUDGET,
      createBudgetState(
        {
          maxRequestsPerMinute:
            options.maxRequestsPerMinute ??
            DEFAULT_TORN_SOFT_BUDGET,
          windowMs: defaultWindowMs,
        },
        defaultWindowMs,
      ),
    )

    for (const [name, budget] of Object.entries(
      options.budgets ?? {},
    )) {
      if (
        name.trim() === '' ||
        name === DEFAULT_BUDGET
      ) {
        throw new Error(
          'Additional request budgets require a unique non-empty name.',
        )
      }

      this.budgets.set(
        name,
        createBudgetState(
          budget,
          defaultWindowMs,
        ),
      )
    }
  }

  request<T>(
    options: RequestOptions,
    load: () => Promise<T>,
  ): Promise<T> {
    const budget =
      options.budget ?? DEFAULT_BUDGET

    if (!this.budgets.has(budget)) {
      throw new Error(
        `Unknown request budget: ${budget}.`,
      )
    }

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
          budget,
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
    budget: BudgetState,
    now: number,
  ): void {
    while (
      budget.requestStarts.length > 0 &&
      now - budget.requestStarts[0] >=
        budget.windowMs
    ) {
      budget.requestStarts.shift()
    }
  }

  private hasCapacity(
    budget: BudgetState,
    now: number,
  ): boolean {
    this.pruneRequestStarts(
      budget,
      now,
    )

    return (
      budget.requestStarts.length <
      budget.maxRequestsPerMinute
    )
  }

  private scheduleWakeForBudget(
    budgetName: string,
    budget: BudgetState,
    now: number,
  ): void {
    if (
      budget.wakeTimer !== null ||
      !this.queue.some(
        (task) =>
          task.budget === budgetName,
      )
    ) {
      return
    }

    this.pruneRequestStarts(
      budget,
      now,
    )

    if (
      budget.requestStarts.length <
      budget.maxRequestsPerMinute ||
      budget.requestStarts.length === 0
    ) {
      return
    }

    const delay = Math.max(
      0,
      budget.requestStarts[0] +
        budget.windowMs -
        now,
    )

    budget.wakeTimer = setTimeout(() => {
      budget.wakeTimer = null
      this.drain()
    }, delay)
  }

  private startTask(
    task: QueuedRequest<unknown>,
    budget: BudgetState,
    now: number,
  ): void {
    budget.requestStarts.push(now)

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

  private drain(): void {
    this.queue.sort((left, right) => {
      const priorityDifference =
        PRIORITY_RANK[left.priority] -
        PRIORITY_RANK[right.priority]

      return priorityDifference !== 0
        ? priorityDifference
        : left.sequence - right.sequence
    })

    let startedTask = true

    while (startedTask) {
      startedTask = false

      for (
        let index = 0;
        index < this.queue.length;
        index += 1
      ) {
        const task = this.queue[index]
        const budget = this.budgets.get(
          task.budget,
        )

        if (!budget) {
          this.queue.splice(index, 1)
          task.reject(
            new Error(
              `Unknown request budget: ${task.budget}.`,
            ),
          )
          this.inFlight.delete(task.key)
          startedTask = true
          break
        }

        const now = this.now()

        if (
          !this.hasCapacity(
            budget,
            now,
          )
        ) {
          continue
        }

        this.queue.splice(index, 1)
        this.startTask(
          task,
          budget,
          now,
        )
        startedTask = true
        break
      }
    }

    const now = this.now()

    for (const [name, budget] of this.budgets) {
      this.scheduleWakeForBudget(
        name,
        budget,
        now,
      )
    }
  }
}
