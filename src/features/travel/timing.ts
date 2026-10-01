import type { Confidence, EpochSeconds, EtaWindow, TravelMethod } from '../../types'
import type { DepartureObservationWindow } from './inference'

export type TravelTimingStatus = 'available' | 'unavailable'
export type TravelTimingSource = 'observed-transition' | 'none'

export interface TravelTimingEstimate {
  status: TravelTimingStatus
  source: TravelTimingSource
  eta: EtaWindow | null
  confidence: Confidence
  label: string
  reasoning: readonly string[]
}

type FlightMethod = 'standard' | 'airstrip' | 'wlt' | 'business'

interface DestinationTimes {
  standard: number
  airstrip: number
  wlt: number
  business: number
}

// One-way minutes, without Mailing Yourself Abroad. Torn Wiki table current
// after the 23 June 2026 travel-time reduction. Runtime variance is handled
// separately below rather than baked into these nominal values.
export const TRAVEL_MINUTES: Readonly<Record<string, DestinationTimes>> = {
  'Mexico': { standard: 24, airstrip: 17, wlt: 12, business: 7 },
  'Cayman Islands': { standard: 33, airstrip: 23, wlt: 17, business: 10 },
  'Canada': { standard: 39, airstrip: 27, wlt: 19, business: 12 },
  'Hawaii': { standard: 127, airstrip: 89, wlt: 63, business: 38 },
  'United Kingdom': { standard: 151, airstrip: 106, wlt: 75, business: 45 },
  'Argentina': { standard: 158, airstrip: 111, wlt: 79, business: 47 },
  'Switzerland': { standard: 166, airstrip: 116, wlt: 83, business: 50 },
  'Japan': { standard: 213, airstrip: 149, wlt: 107, business: 64 },
  'China': { standard: 229, airstrip: 160, wlt: 114, business: 69 },
  'United Arab Emirates': { standard: 257, airstrip: 180, wlt: 128, business: 77 },
  'South Africa': { standard: 282, airstrip: 197, wlt: 141, business: 85 },
}

const DESTINATION_ALIASES: Readonly<Record<string, string>> = {
  mexico: 'Mexico',
  'ciudad juarez': 'Mexico',
  'ciudad juárez': 'Mexico',
  'cayman islands': 'Cayman Islands',
  'george town': 'Cayman Islands',
  canada: 'Canada',
  toronto: 'Canada',
  hawaii: 'Hawaii',
  honolulu: 'Hawaii',
  'united kingdom': 'United Kingdom',
  uk: 'United Kingdom',
  london: 'United Kingdom',
  argentina: 'Argentina',
  'buenos aires': 'Argentina',
  switzerland: 'Switzerland',
  zurich: 'Switzerland',
  japan: 'Japan',
  tokyo: 'Japan',
  china: 'China',
  beijing: 'China',
  'united arab emirates': 'United Arab Emirates',
  uae: 'United Arab Emirates',
  dubai: 'United Arab Emirates',
  'south africa': 'South Africa',
  johannesburg: 'South Africa',
}

const FLIGHT_VARIANCE = 0.03
export const MAX_USABLE_DEPARTURE_WINDOW_SECONDS = 5 * 60

export function canonicalTravelDestination(value: string | null): string | null {
  if (value === null) return null
  return DESTINATION_ALIASES[value.trim().toLocaleLowerCase()] ?? null
}

function candidateMethods(method: TravelMethod): readonly FlightMethod[] {
  if (method === 'airstrip') return ['airstrip']
  if (method === 'airline') return ['standard', 'business']

  // HONJIN-01 has not established a safe live mapping for private_jet.
  // Do not silently equate it with WLT; retain the full duration envelope.
  return ['standard', 'airstrip', 'wlt', 'business']
}

function durationBoundsSeconds(
  destination: string,
  method: TravelMethod,
): { earliest: number; latest: number; methods: readonly FlightMethod[] } | null {
  const times = TRAVEL_MINUTES[destination]
  if (times === undefined) return null

  const methods = candidateMethods(method)
  const minutes = methods.map((candidate) => times[candidate])
  const minimum = Math.min(...minutes) * 60
  const maximum = Math.max(...minutes) * 60

  return {
    earliest: Math.floor(minimum * (1 - FLIGHT_VARIANCE)),
    latest: Math.ceil(maximum * (1 + FLIGHT_VARIANCE)),
    methods,
  }
}

export function estimateTravelEta(input: {
  destination: string | null
  method: TravelMethod
  departureWindow: DepartureObservationWindow | null
  observedAt: EpochSeconds
}): TravelTimingEstimate {
  if (input.departureWindow === null) {
    return {
      status: 'unavailable',
      source: 'none',
      eta: null,
      confidence: 'unknown',
      label: 'ETA unavailable · take-off not observed',
      reasoning: ['Timing: no observed transition into travelling'],
    }
  }

  const destination = canonicalTravelDestination(input.destination)
  if (destination === null) {
    return {
      status: 'unavailable',
      source: 'observed-transition',
      eta: null,
      confidence: 'unknown',
      label: 'ETA unavailable · route unknown',
      reasoning: ['Timing: destination does not match a supported Torn route'],
    }
  }

  const duration = durationBoundsSeconds(destination, input.method)
  if (duration === null) {
    return {
      status: 'unavailable',
      source: 'observed-transition',
      eta: null,
      confidence: 'unknown',
      label: 'ETA unavailable · route unknown',
      reasoning: ['Timing: no duration table entry for route'],
    }
  }

  const departureWidth = Math.max(
    0,
    input.departureWindow.latestAt - input.departureWindow.earliestAt,
  )

  if (departureWidth > MAX_USABLE_DEPARTURE_WINDOW_SECONDS) {
    return {
      status: 'unavailable',
      source: 'observed-transition',
      eta: null,
      confidence: 'low',
      label: 'ETA unavailable · departure window too broad',
      reasoning: [
        `Timing: take-off was observed within a ${departureWidth}-second window`,
        `Timing: windows over ${MAX_USABLE_DEPARTURE_WINDOW_SECONDS} seconds are not precise enough for a useful arrival estimate`,
        'Timing: HONJIN does not substitute first observation time for an unobserved exact departure',
      ],
    }
  }

  const earliestAt = Math.max(
    input.observedAt,
    input.departureWindow.earliestAt + duration.earliest,
  )
  const latestAt = input.departureWindow.latestAt + duration.latest

  if (latestAt < earliestAt) {
    return {
      status: 'unavailable',
      source: 'observed-transition',
      eta: null,
      confidence: 'low',
      label: 'ETA unavailable · timing evidence conflicts',
      reasoning: ['Timing: observed airborne state conflicts with the derived arrival window'],
    }
  }

  const etaWidth = latestAt - earliestAt
  if (etaWidth >= duration.latest) {
    return {
      status: 'unavailable',
      source: 'observed-transition',
      eta: null,
      confidence: 'low',
      label: 'ETA unavailable · departure window too broad',
      reasoning: [
        'Timing: observation gap is at least as broad as the longest plausible flight duration',
        'Timing: offline time is not treated as time already spent travelling',
      ],
    }
  }

  const exactMethod = duration.methods.length === 1
  const confidence: Confidence = exactMethod && departureWidth <= 60
    ? 'high'
    : exactMethod || input.method === 'airline'
      ? 'medium'
      : 'low'

  return {
    status: 'available',
    source: 'observed-transition',
    eta: { earliestAt, latestAt },
    confidence,
    label: confidence === 'low' ? 'Broad ETA' : 'ETA window',
    reasoning: [
      `Timing: ${destination} route`,
      `Timing methods: ${duration.methods.join('/')}`,
      'Timing: includes Torn flight-time variance of ±3%',
      'Estimate assumes normal travel time. Temporary travel-time effects can make the actual arrival earlier or later.',
      `Timing confidence: ${confidence}`,
    ],
  }
}


function formatRemainingMinutes(seconds: number): string {
  const totalMinutes = Math.max(0, Math.ceil(seconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  return `${minutes}m`
}

export function formatTravelTimeRemaining(
  eta: EtaWindow,
  now: EpochSeconds,
): string {
  if (eta.latestAt <= now) {
    return 'ARRIVAL DUE · AWAITING REFRESH'
  }

  const earliest = formatRemainingMinutes(eta.earliestAt - now)
  const latest = formatRemainingMinutes(eta.latestAt - now)

  return earliest === latest ? earliest : `${earliest}–${latest}`
}
