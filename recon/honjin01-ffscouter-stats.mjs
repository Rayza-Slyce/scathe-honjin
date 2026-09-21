import { readFile, writeFile } from 'node:fs/promises'

const apiKey = process.env.TORN_API_KEY
const OUT_DIR = new URL('./private/', import.meta.url)

if (!apiKey) {
  console.error('ERROR: TORN_API_KEY was not supplied.')
  process.exit(1)
}

const rosterArtifact = JSON.parse(
  await readFile(
    new URL('./private/enemy-faction-members.json', import.meta.url),
    'utf8',
  ),
)

const members = rosterArtifact.response?.body?.members ?? []

const target = members.find(
  member => Number.isInteger(member?.id),
)

if (!target) {
  console.error('ERROR: Could not derive a target from enemy roster.')
  process.exit(2)
}

const url = new URL(
  'https://ffscouter.com/api/v1/get-stats',
)

url.searchParams.set('key', apiKey)
url.searchParams.set('targets', String(target.id))

const response = await fetch(url, {
  headers: {
    Accept: 'application/json',
  },
})

const text = await response.text()

let body

try {
  body = JSON.parse(text)
} catch {
  body = {
    non_json_response: true,
    preview: text.slice(0, 500),
  }
}

/*
 * Store the raw response privately. Never commit it.
 * Do not store the request URL because it contains the API key.
 */
await writeFile(
  new URL('ffscouter-get-stats.json', OUT_DIR),
  `${JSON.stringify({
    request: {
      method: 'GET',
      endpoint: '/api/v1/get-stats',
      targetCount: 1,
    },
    response: {
      status: response.status,
      statusText: response.statusText,
      body,
    },
  }, null, 2)}\n`,
  'utf8',
)

const row = Array.isArray(body)
  ? body[0]
  : null

const bss = row?.available_estimates?.bss

console.log(JSON.stringify({
  status: response.status,
  resultIsArray: Array.isArray(body),
  resultCount: Array.isArray(body) ? body.length : null,

  topLevelSource:
    typeof row?.source === 'string'
      ? row.source
      : null,

  hasBssBucket:
    bss !== null &&
    typeof bss === 'object',

  bssFields:
    bss && typeof bss === 'object'
      ? Object.keys(bss).sort()
      : [],

  bssPublicType:
    bss?.bss_public === null
      ? 'null'
      : typeof bss?.bss_public,

  bsEstimateType:
    bss?.bs_estimate === null
      ? 'null'
      : typeof bss?.bs_estimate,

  fairFightType:
    bss?.fair_fight === null
      ? 'null'
      : typeof bss?.fair_fight,

  premiumBucketPresent:
    row?.available_estimates?.premium !== null &&
    typeof row?.available_estimates?.premium === 'object',

  spiesBucketPresent:
    row?.available_estimates?.spies !== null &&
    typeof row?.available_estimates?.spies === 'object',

  savedTo: 'recon/private/ffscouter-get-stats.json',
}))

if (!response.ok) {
  process.exitCode = 1
}
