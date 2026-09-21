const BASE = 'https://api.torn.com/v2'
const apiKey = process.env.TORN_API_KEY

if (!apiKey) {
  console.error('ERROR: TORN_API_KEY was not supplied.')
  process.exit(1)
}

if (!/^[A-Za-z0-9]{16}$/.test(apiKey)) {
  console.error('ERROR: Unexpected Torn key format.')
  process.exit(1)
}

async function get(path) {
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

  console.log(JSON.stringify({
    path,
    status: response.status,
    topLevelFields:
      body && typeof body === 'object' && !Array.isArray(body)
        ? Object.keys(body)
        : [],
  }))

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`)
  }

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

const keyInfo = await get('/key/info')
await get('/user/basic')
await get('/user/battlestats')

const ownFactionIds = [...collectFactionIds(keyInfo)]

if (ownFactionIds.length !== 1) {
  console.error(
    `ERROR: Expected one own faction ID, found ${ownFactionIds.length}.`,
  )
  process.exit(2)
}

const ownFactionId = ownFactionIds[0]

await get(`/faction/${ownFactionId}/basic`)

const wars = await get(`/faction/${ownFactionId}/wars`)

/*
 * Chain is explicitly tested because it was part of the proposed v0.1
 * permission set but had not yet been exercised live.
 */
await get(`/faction/${ownFactionId}/chain`)

const factionIds = [...collectFactionIds(wars)]
const enemies = factionIds.filter(id => id !== ownFactionId)

if (enemies.length !== 1) {
  console.error(
    `ERROR: Expected one enemy faction ID, found ${enemies.length}.`,
  )
  process.exit(3)
}

const enemyFactionId = enemies[0]

await get(`/faction/${enemyFactionId}/basic`)

const roster = await get(`/faction/${enemyFactionId}/members`)

const targetId =
  Array.isArray(roster?.members)
    ? roster.members.find(member => Number.isInteger(member?.id))?.id
    : null

if (!targetId) {
  console.error('ERROR: Could not derive an opponent target.')
  process.exit(4)
}

await get(`/user/${targetId}/property`)

console.log(JSON.stringify({
  minimumCandidateTornPath: 'PASS',
}))
