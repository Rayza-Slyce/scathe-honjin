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
