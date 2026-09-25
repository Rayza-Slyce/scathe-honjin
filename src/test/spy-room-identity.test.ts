import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  createMemorySpyRoomIdentityStore,
  normaliseSpyRoomIdentityState,
} from '../storage/spy-room-identity'

describe('Spy Room identity persistence', () => {
  it('normalises IDs, removes duplicates and caps individuals at ten', () => {
    expect(
      normaliseSpyRoomIdentityState({
        individualPlayerIds: [
          10,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          110,
          -1,
          2.5,
          '120',
        ],
        factionId: 777,
      }),
    ).toEqual({
      individualPlayerIds: [
        10,
        20,
        30,
        40,
        50,
        60,
        70,
        80,
        90,
        100,
      ],
      factionId: 777,
    })
  })

  it('rejects invalid persisted values rather than treating them as identities', () => {
    expect(
      normaliseSpyRoomIdentityState({
        individualPlayerIds: [0, -4, '12'],
        factionId: '777',
      }),
    ).toEqual({
      individualPlayerIds: [],
      factionId: null,
    })
  })

  it('keeps saved identities isolated by HONJIN user', async () => {
    const store =
      createMemorySpyRoomIdentityStore()

    await store.save(101, {
      individualPlayerIds: [9001],
      factionId: 777,
    })
    await store.save(202, {
      individualPlayerIds: [9002],
      factionId: 888,
    })

    await expect(store.load(101)).resolves.toEqual({
      individualPlayerIds: [9001],
      factionId: 777,
    })
    await expect(store.load(202)).resolves.toEqual({
      individualPlayerIds: [9002],
      factionId: 888,
    })
  })
})
