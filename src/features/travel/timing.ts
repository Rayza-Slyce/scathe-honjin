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
  alternateEta?: EtaWindow | null
  alternateLabel?: string | null
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
export const MAX_USABLE_DEPARTURE_WINDOW_SECONDS = 10 * 60
const HIGH_CONFIDENCE_DEPARTURE_WINDOW_SECONDS = 2 * 60
const MEDIUM_CONFIDENCE_DEPARTURE_WINDOW_SECONDS = 5 * 60
export const ARRIVAL_STATUS_GRACE_SECONDS = 2 * 60

export function canonicalTravelDestination(value: string | null): string | null {
  if (value === null) return null
  return DESTINATION_ALIASES[value.trim().toLocaleLowerCase()] ?? null
}

function candidateMethods(method: TravelMethod): readonly FlightMethod[] {
  if (method === 'airstrip') return ['airstrip']
  if (method === 'airline') return ['standard', 'business']
  if (method === 'private') return ['wlt']

  return ['standard', 'airstrip', 'wlt', 'business']
}

function timingConfidenceForDepartureWidth(departureWidth: number): Confidence {
  return departureWidth <= HIGH_CONFIDENCE_DEPARTURE_WINDOW_SECONDS
    ? 'high'
    : departureWidth <= MEDIUM_CONFIDENCE_DEPARTURE_WINDOW_SECONDS
      ? 'medium'
      : 'low'
}

function durationForMethodSeconds(
  destination: string,
  method: FlightMethod,
): { earliest: number; latest: number } | null {
  const times = TRAVEL_MINUTES[destination]
  if (times === undefined) return null

  const nominal = times[method] * 60
  return {
    earliest: Math.floor(nominal * (1 - FLIGHT_VARIANCE)),
    latest: Math.ceil(nominal * (1 + FLIGHT_VARIANCE)),
  }
}

function etaForDuration(input: {
  departureWindow: DepartureObservationWindow
  observedAt: EpochSeconds
  duration: { earliest: number; latest: number }
}): EtaWindow | null {
  const earliestAt = Math.max(
    input.observedAt,
    input.departureWindow.earliestAt + input.duration.earliest,
  )
  const latestAt = input.departureWindow.latestAt + input.duration.latest
  return latestAt < earliestAt ? null : { earliestAt, latestAt }
}

function durationBoundsSeconds(
  destination: string,
  method: TravelMethod,
  departureWindow: DepartureObservationWindow,
  observedAt: EpochSeconds,
): {
  earliest: number
  latest: number
  methods: readonly FlightMethod[]
  eliminatedMethods: readonly FlightMethod[]
} | null {
  if (TRAVEL_MINUTES[destination] === undefined) return null

  const candidates = candidateMethods(method)
  const durationFor = (candidate: FlightMethod) =>
    durationForMethodSeconds(destination, candidate)!

  // Ambiguous aircraft evidence starts with every compatible duration.
  // As the player remains visibly airborne, a candidate can be eliminated
  // once even its latest normal arrival has passed. This narrows the ETA
  // from observed timing evidence without pretending the aircraft image
  // identifies a travel method that Torn does not expose.
  const canEliminateByElapsedTime = method === 'airline'
  const methods = canEliminateByElapsedTime
    ? candidates.filter((candidate) => {
        const duration = durationFor(candidate)
        return departureWindow.latestAt + duration.latest >= observedAt
      })
    : candidates

  const eliminatedMethods = candidates.filter(
    (candidate) => !methods.includes(candidate),
  )

  if (methods.length === 0) {
    return {
      earliest: 0,
      latest: 0,
      methods,
      eliminatedMethods,
    }
  }

  const bounds = methods.map(durationFor)

  return {
    earliest: Math.min(...bounds.map((bound) => bound.earliest)),
    latest: Math.max(...bounds.map((bound) => bound.latest)),
    methods,
    eliminatedMethods,
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

  const departureWidth = Math.max(
    0,
    input.departureWindow.latestAt - input.departureWindow.earliestAt,
  )
  const confidence = timingConfidenceForDepartureWidth(departureWidth)

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

  const duration = durationBoundsSeconds(
    destination,
    input.method,
    input.departureWindow,
    input.observedAt,
  )
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

  if (duration.methods.length === 0) {
    const latestCompatibleArrivalAt = Math.max(
      ...candidateMethods(input.method).map((candidate) =>
        input.departureWindow!.latestAt +
        durationForMethodSeconds(destination, candidate)!.latest,
      ),
    )
    const arrivalOverrun = input.observedAt - latestCompatibleArrivalAt

    if (arrivalOverrun > 0 && arrivalOverrun <= ARRIVAL_STATUS_GRACE_SECONDS) {
      return {
        status: 'available',
        source: 'observed-transition',
        eta: {
          earliestAt: latestCompatibleArrivalAt,
          latestAt: latestCompatibleArrivalAt,
        },
        confidence,
        label: 'Arrival due · awaiting travel update',
        alternateEta: null,
        alternateLabel: null,
        reasoning: [
          `Timing: latest normal arrival passed ${arrivalOverrun} seconds before the current travel observation`,
          `Timing: allowing up to ${ARRIVAL_STATUS_GRACE_SECONDS} seconds for Torn travel status to reconcile before declaring a conflict`,
          'Estimate assumes normal travel time. Temporary travel-time effects can make the actual arrival earlier or later.',
        ],
      }
    }

    return {
      status: 'unavailable',
      source: 'observed-transition',
      eta: null,
      confidence: 'low',
      label: 'ETA unavailable · timing evidence conflicts',
      reasoning: [
        'Timing: the player is still airborne beyond every normal-time method compatible with the aircraft evidence',
        `Timing: the ${ARRIVAL_STATUS_GRACE_SECONDS}-second arrival-status reconciliation grace has expired`,
        'Estimate assumes normal travel time. Temporary travel-time effects can make the actual arrival earlier or later.',
      ],
    }
  }

  const unresolvedAirline =
    input.method === 'airline' &&
    duration.methods.includes('standard') &&
    duration.methods.includes('business')

  const primaryDuration = unresolvedAirline
    ? durationForMethodSeconds(destination, 'standard')!
    : { earliest: duration.earliest, latest: duration.latest }
  const eta = etaForDuration({
    departureWindow: input.departureWindow,
    observedAt: input.observedAt,
    duration: primaryDuration,
  })

  if (eta === null) {
    const latestNormalArrivalAt =
      input.departureWindow.latestAt + primaryDuration.latest
    const arrivalOverrun = input.observedAt - latestNormalArrivalAt

    if (arrivalOverrun > 0 && arrivalOverrun <= ARRIVAL_STATUS_GRACE_SECONDS) {
      return {
        status: 'available',
        source: 'observed-transition',
        eta: {
          earliestAt: latestNormalArrivalAt,
          latestAt: latestNormalArrivalAt,
        },
        confidence,
        label: 'Arrival due · awaiting travel update',
        alternateEta: null,
        alternateLabel: null,
        reasoning: [
          `Timing: latest normal arrival passed ${arrivalOverrun} seconds before the current travel observation`,
          `Timing: allowing up to ${ARRIVAL_STATUS_GRACE_SECONDS} seconds for Torn travel status to reconcile before declaring a conflict`,
          'Estimate assumes normal travel time. Temporary travel-time effects can make the actual arrival earlier or later.',
        ],
      }
    }

    return {
      status: 'unavailable',
      source: 'observed-transition',
      eta: null,
      confidence: 'low',
      label: 'ETA unavailable · timing evidence conflicts',
      reasoning: ['Timing: observed airborne state conflicts with the derived arrival window'],
    }
  }

  const alternateEta = unresolvedAirline
    ? etaForDuration({
        departureWindow: input.departureWindow,
        observedAt: input.observedAt,
        duration: durationForMethodSeconds(destination, 'business')!,
      })
    : null

  return {
    status: 'available',
    source: 'observed-transition',
    eta,
    confidence,
    label: confidence === 'low' ? 'Broad ETA' : 'ETA window',
    alternateEta,
    alternateLabel: alternateEta === null ? null : 'Business Class alternate',
    reasoning: [
      `Timing: take-off was observed within a ${departureWidth}-second window`,
      `Timing: ${destination} route`,
      ...(unresolvedAirline
        ? [
            'Timing methods: Standard baseline shown as the primary ETA; Business Class is shown separately as an alternate',
            'Timing evidence: airliner image cannot distinguish Standard from Business Class',
          ]
        : [`Timing methods: ${duration.methods.join('/')}`]),
      ...(input.method === 'airline' &&
      duration.eliminatedMethods.includes('business')
        ? [
            'Timing evidence: player remains airborne beyond the latest normal Business Class arrival; ETA narrowed to Standard',
          ]
        : []),
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
    return 'ARRIVAL DUE · awaiting travel update'
  }

  const earliest = formatRemainingMinutes(eta.earliestAt - now)
  const latest = formatRemainingMinutes(eta.latestAt - now)

  return earliest === latest ? earliest : `${earliest}–${latest}`
}
