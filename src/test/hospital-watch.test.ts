import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  createMemoryHospitalWatchStore,
  normaliseHospitalWatchState,
} from '../storage/hospital-watch'

describe('Hospital watch persistence', () => {
  it('keeps only unique positive Torn player IDs', () => {
    expect(
      normaliseHospitalWatchState({
        watchedPlayerIds: [5, 5, -1, 0, 9, '7'],
      }),
    ).toEqual({
      watchedPlayerIds: [5, 9],
    })
  })

  it('scopes watch state by HONJIN user', async () => {
    const store = createMemoryHospitalWatchStore()

    await store.save(101, {
      watchedPlayerIds: [1, 2],
    })
    await store.save(202, {
      watchedPlayerIds: [3],
    })

    expect(await store.load(101)).toEqual({
      watchedPlayerIds: [1, 2],
    })
    expect(await store.load(202)).toEqual({
      watchedPlayerIds: [3],
    })
  })

  it('returns an empty state for a user with no saved watches', async () => {
    const store = createMemoryHospitalWatchStore()

    expect(await store.load(999)).toEqual({
      watchedPlayerIds: [],
    })
  })
})
