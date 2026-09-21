import { readFile } from 'node:fs/promises'

const BASE = 'https://api.torn.com/v2'
const apiKey = process.env.TORN_API_KEY
let hadApiError = false

if (!apiKey) {
  console.error('ERROR: TORN_API_KEY was not supplied.')
  process.exit(1)
}

async function get(label, path) {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      Accept: 'application/json',
    },
  })

  let body = null

  try {
    body = await response.json()
  } catch {}

  const error = body?.error

  if (error) {
    hadApiError = true
  }

  console.log(JSON.stringify({
    test: label,
    httpStatus: response.status,
    hasApiError: Boolean(error),
    errorCode:
      Number.isInteger(error?.code)
        ? error.code
        : null,
    errorMessage:
      typeof error?.error === 'string'
        ? error.error
        : typeof error?.message === 'string'
          ? error.message
          : null,
  }))

  return body
}

function collectFactionIds(value, ids = new Set(), parentKey = '') {
  if (!value || typeof value !== 'object') return ids

  if (Array.isArray(value)) {
    for (const child of value) {
      collectFactionIds(child, ids, parentKey)
    }
    return ids
  }

  for (const [key, child] of Object.entries(value)) {
    const lower = key.toLowerCase()

    if (
      Number.isInteger(child) &&
      (
        lower === 'faction_id' ||
        lower === 'factionid' ||
        (
          lower === 'id' &&
          parentKey.toLowerCase().includes('faction')
        )
      )
    ) {
      ids.add(child)
    }

    collectFactionIds(child, ids, key)
  }

  return ids
}

const keyInfo = await get('key-info', '/key/info')

const ownIds = [...collectFactionIds(keyInfo)]

if (ownIds.length !== 1) {
  console.error('Could not derive own faction.')
  process.exit(2)
}

const ownFactionId = ownIds[0]

/*
 * Recover the already-verified enemy ID from the private full-key artifact.
 */
const warsArtifact = JSON.parse(
  await readFile(
    new URL('./private/own-faction-wars.json', import.meta.url),
    'utf8',
  ),
)

const historicWarBody = warsArtifact.response?.body
const factionIds = [...collectFactionIds(historicWarBody)]
const enemyIds = factionIds.filter(id => id !== ownFactionId)

if (enemyIds.length !== 1) {
  console.error('Could not recover exactly one cached enemy faction.')
  process.exit(3)
}

const enemyFactionId = enemyIds[0]

await get('own-faction-basic', `/faction/${ownFactionId}/basic`)
await get('own-faction-wars', `/faction/${ownFactionId}/wars`)
await get('own-faction-chain', `/faction/${ownFactionId}/chain`)
await get('enemy-faction-basic', `/faction/${enemyFactionId}/basic`)

const roster = await get(
  'enemy-faction-members',
  `/faction/${enemyFactionId}/members`,
)

const targetId =
  Array.isArray(roster?.members)
    ? roster.members.find(member => Number.isInteger(member?.id))?.id
    : null

if (targetId) {
  await get(
    'opponent-property',
    `/user/${targetId}/property`,
  )
} else {
  console.log(JSON.stringify({
    test: 'opponent-property',
    skipped: true,
    reason: 'No member roster available under this key.',
  }))
}


if (hadApiError) {
  process.exitCode = 5
}
