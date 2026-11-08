import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { RequestCoordinator } from '../app/request-coordinator'

afterEach(() => {
  vi.useRealTimers()
})

describe('RequestCoordinator', () => {
  it('cancels queued session work without resetting the rolling request budget', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const coordinator = new RequestCoordinator({ maxRequestsPerMinute: 1 })
    await coordinator.request({ key: 'first', priority: 'explicit' }, async () => 1)
    const staleLoader = vi.fn(async () => 2)
    const stale = coordinator.request({ key: 'queued', priority: 'explicit' }, staleLoader)
    const rejected = expect(stale).rejects.toMatchObject({ name: 'AbortError' })
    coordinator.cancelRequests()
    await rejected
    const currentLoader = vi.fn(async () => 3)
    const current = coordinator.request({ key: 'current', priority: 'explicit' }, currentLoader)
    expect(currentLoader).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(60_000)
    await expect(current).resolves.toBe(3)
    expect(staleLoader).not.toHaveBeenCalled()
  })

  it('does not cache or deduplicate against a cancelled request when it finishes late', async () => {
    let finishOld: (value: number) => void = () => {}
    let finishNew: (value: number) => void = () => {}
    const coordinator = new RequestCoordinator()
    const options = { key: 'same', priority: 'explicit' as const, cacheMs: 60_000 }
    const old = coordinator.request(options, () => new Promise<number>((resolve) => { finishOld = resolve }))
    const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' })
    coordinator.cancelRequests()
    await rejected
    const current = coordinator.request(options, () => new Promise<number>((resolve) => { finishNew = resolve }))
    finishOld(1)
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    expect(coordinator.request(options, async () => 3)).toBe(current)
    finishNew(2)
    await expect(current).resolves.toBe(2)
    await expect(coordinator.request(options, async () => 3)).resolves.toBe(2)
  })
  it('deduplicates in-flight work and reuses fresh cached results', async () => {
    let finish:
      | ((value: string) => void)
      | undefined

    const load = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve
        }),
    )

    const coordinator =
      new RequestCoordinator()

    const first = coordinator.request(
      {
        key: 'torn:faction:202:members',
        priority: 'active-war',
        cacheMs: 15_000,
      },
      load,
    )
    const second = coordinator.request(
      {
        key: 'torn:faction:202:members',
        priority: 'active-war',
        cacheMs: 15_000,
      },
      load,
    )

    expect(load).toHaveBeenCalledTimes(1)

    finish?.('snapshot')

    await expect(first).resolves.toBe(
      'snapshot',
    )
    await expect(second).resolves.toBe(
      'snapshot',
    )

    await expect(
      coordinator.request(
        {
          key: 'torn:faction:202:members',
          priority: 'active-war',
          cacheMs: 15_000,
        },
        load,
      ),
    ).resolves.toBe('snapshot')

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('runs higher-priority queued work first when budget capacity returns', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    const order: string[] = []
    const coordinator =
      new RequestCoordinator({
        maxRequestsPerMinute: 1,
      })

    await coordinator.request(
      {
        key: 'first',
        priority: 'active-war',
      },
      async () => {
        order.push('first')
        return 'first'
      },
    )

    const background = coordinator.request(
      {
        key: 'background',
        priority: 'optional',
      },
      async () => {
        order.push('background')
        return 'background'
      },
    )

    const foreground = coordinator.request(
      {
        key: 'foreground',
        priority: 'active-war',
      },
      async () => {
        order.push('foreground')
        return 'foreground'
      },
    )

    expect(order).toEqual(['first'])

    await vi.advanceTimersByTimeAsync(
      60_000,
    )

    await expect(foreground).resolves.toBe(
      'foreground',
    )
    expect(order).toEqual([
      'first',
      'foreground',
    ])

    await vi.advanceTimersByTimeAsync(
      60_000,
    )

    await expect(background).resolves.toBe(
      'background',
    )
    expect(order).toEqual([
      'first',
      'foreground',
      'background',
    ])
  })
})

describe('RequestCoordinator priority promotion', () => {
  it('promotes a deduplicated queued request when active WAR needs the same resource', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    const order: string[] = []
    const coordinator =
      new RequestCoordinator({
        maxRequestsPerMinute: 1,
      })

    await coordinator.request(
      {
        key: 'budget-holder',
        priority: 'active-war',
      },
      async () => {
        order.push('budget-holder')
        return 'budget-holder'
      },
    )

    const sharedBackground =
      coordinator.request(
        {
          key: 'shared-roster',
          priority: 'background-spy',
        },
        async () => {
          order.push('shared-roster')
          return 'shared-roster'
        },
      )

    const competingExplicit =
      coordinator.request(
        {
          key: 'explicit-other',
          priority: 'explicit',
        },
        async () => {
          order.push('explicit-other')
          return 'explicit-other'
        },
      )

    const sharedWar = coordinator.request(
      {
        key: 'shared-roster',
        priority: 'active-war',
      },
      async () => {
        throw new Error(
          'Deduplicated loader must not run.',
        )
      },
    )

    await vi.advanceTimersByTimeAsync(
      60_000,
    )

    await expect(sharedWar).resolves.toBe(
      'shared-roster',
    )
    await expect(
      sharedBackground,
    ).resolves.toBe('shared-roster')

    expect(order).toEqual([
      'budget-holder',
      'shared-roster',
    ])

    await vi.advanceTimersByTimeAsync(
      60_000,
    )
    await competingExplicit
  })
})

describe('RequestCoordinator provider budgets', () => {
  it('keeps FFScouter capacity separate from the Torn soft-budget lane', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    const order: string[] = []
    const coordinator =
      new RequestCoordinator({
        maxRequestsPerMinute: 1,
        budgets: {
          ffscouter: {
            maxRequestsPerMinute: 1,
          },
        },
      })

    await coordinator.request(
      {
        key: 'torn:first',
        priority: 'active-war',
      },
      async () => {
        order.push('torn:first')
        return 'torn:first'
      },
    )

    await coordinator.request(
      {
        key: 'ff:first',
        priority: 'active-war',
        budget: 'ffscouter',
      },
      async () => {
        order.push('ff:first')
        return 'ff:first'
      },
    )

    const tornSecond = coordinator.request(
      {
        key: 'torn:second',
        priority: 'active-war',
      },
      async () => {
        order.push('torn:second')
        return 'torn:second'
      },
    )

    const ffSecond = coordinator.request(
      {
        key: 'ff:second',
        priority: 'active-war',
        budget: 'ffscouter',
      },
      async () => {
        order.push('ff:second')
        return 'ff:second'
      },
    )

    expect(order).toEqual([
      'torn:first',
      'ff:first',
    ])

    await vi.advanceTimersByTimeAsync(
      60_000,
    )

    await Promise.all([
      tornSecond,
      ffSecond,
    ])

    expect(order).toEqual([
      'torn:first',
      'ff:first',
      'torn:second',
      'ff:second',
    ])
  })

  it('rejects requests for an unknown provider budget', () => {
    const coordinator =
      new RequestCoordinator()

    expect(() =>
      coordinator.request(
        {
          key: 'unknown',
          priority: 'optional',
          budget: 'missing',
        },
        async () => 'never',
      ),
    ).toThrow(
      'Unknown request budget: missing.',
    )
  })
})
