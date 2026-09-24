import type {
  Availability,
  EpochSeconds,
  PlayerStatus,
} from '../types'

export function isObservationFresh(
  observedAt: EpochSeconds,
  now: EpochSeconds,
  maxAgeSeconds: number,
): boolean {
  if (
    !Number.isFinite(observedAt) ||
    !Number.isFinite(now) ||
    !Number.isFinite(maxAgeSeconds) ||
    observedAt < 0 ||
    now < observedAt ||
    maxAgeSeconds < 0
  ) {
    return false
  }

  return now - observedAt <= maxAgeSeconds
}

export function deriveAvailability(
  status: PlayerStatus,
  observedAt: EpochSeconds,
  now: EpochSeconds,
  maxAgeSeconds: number,
): Availability {
  if (
    !isObservationFresh(
      observedAt,
      now,
      maxAgeSeconds,
    )
  ) {
    return 'unknown'
  }

  switch (status.state) {
    case 'okay':
      return 'attackable'
    case 'hospital':
    case 'travelling':
    case 'abroad':
      return 'unavailable'
    default:
      return 'unknown'
  }
}
