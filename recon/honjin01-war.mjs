import { mkdir, readFile, writeFile } from 'node:fs/promises'

const BASE_URL = 'https://api.torn.com/v2'
const OUT_DIR = new URL('./private/', import.meta.url)
const apiKey = process.env.TORN_API_KEY

if (!apiKey) {
  console.error('ERROR: TORN_API_KEY was not supplied to this process.')
  process.exit(1)
}

await mkdir(OUT_DIR, { recursive: true })

function redact(value) {
  if (Array.isArray(value)) {
    return value.map(redact)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => {
        const normalized = key.toLowerCase()

        if (
          normalized === 'key' ||
          normalized === 'api_key' ||
          normalized === 'apikey' ||
          normalized === 'authorization'
        ) {
          return [key, '[REDACTED]']
        }

        return [key, redact(child)]
      }),
    )
  }

  if (typeof value === 'string' && value === apiKey) {
    return '[REDACTED]'
  }

  return value
}

async function request(name, path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `ApiKey ${apiKey}`,
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
      body_preview: text.slice(0, 500),
    }
  }

  const artifact = redact({
    request: {
      name,
      path,
      method: 'GET',
    },
    response: {
      status: response.status,
      statusText: response.statusText,
      body,
    },
  })

  await writeFile(
    new URL(`${name}.json`, OUT_DIR),
    `${JSON.stringify(artifact, null, 2)}\n`,
    'utf8',
  )

  console.log(JSON.stringify({
    test: name,
    status: response.status,
    savedTo: `recon/private/${name}.json`,
  }))

  if (!response.ok) {
    throw new Error(`${name} returned HTTP ${response.status}`)
  }

  return body
}

function findFactionId(value) {
  const candidates = []

  function walk(node, path = []) {
    if (!node || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, [...path, index]))
      return
    }

    for (const [key, child] of Object.entries(node)) {
      const lower = key.toLowerCase()

      if (
        typeof child === 'number' &&
        (
          lower === 'faction_id' ||
          lower === 'factionid' ||
          (lower === 'id' && path.some(part => String(part).toLowerCase().includes('faction')))
        )
      ) {
        candidates.push(child)
      }

      walk(child, [...path, key])
    }
  }

  walk(value)

  return [...new Set(candidates.filter(Number.isInteger))]
}

function findRankedWarCandidates(value) {
  const candidates = []

  function walk(node) {
    if (!node || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }

    const keys = Object.keys(node).map(key => key.toLowerCase())

    if (
      keys.some(key => key.includes('faction')) &&
      (
        keys.includes('start') ||
        keys.includes('end') ||
        keys.includes('winner') ||
        keys.includes('status') ||
        keys.includes('target')
      )
    ) {
      candidates.push(node)
    }

    Object.values(node).forEach(walk)
  }

  walk(value)
  return candidates
}

function collectFactionIds(value) {
  const ids = new Set()

  function walk(node, parentKey = '') {
    if (!node || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach(child => walk(child, parentKey))
      return
    }

    for (const [key, child] of Object.entries(node)) {
      const lower = key.toLowerCase()

      if (
        typeof child === 'number' &&
        (
          lower === 'faction_id' ||
          lower === 'factionid' ||
          (lower === 'id' && parentKey.toLowerCase().includes('faction'))
        )
      ) {
        ids.add(child)
      }

      walk(child, key)
    }
  }

  walk(value)
  return [...ids]
}

const keyInfoArtifact = JSON.parse(
  await readFile(new URL('./private/key-info.json', import.meta.url), 'utf8'),
)

const keyInfo = keyInfoArtifact.response?.body
const factionIds = findFactionId(keyInfo)

if (factionIds.length !== 1) {
  console.error(JSON.stringify({
    error: 'Could not derive exactly one own faction ID from key-info.',
    candidateCount: factionIds.length,
  }))
  process.exit(2)
}

const ownFactionId = factionIds[0]

const factionBasic = await request(
  'own-faction-basic',
  `/faction/${ownFactionId}/basic`,
)

const wars = await request(
  'own-faction-wars',
  `/faction/${ownFactionId}/wars`,
)

const warCandidates = findRankedWarCandidates(wars)
const allFactionIds = collectFactionIds(wars)
const enemyFactionIds = allFactionIds.filter(id => id !== ownFactionId)

console.log(JSON.stringify({
  ownFactionResolved: true,
  factionBasicTopLevelFields:
    factionBasic && typeof factionBasic === 'object'
      ? Object.keys(factionBasic)
      : [],
  warCandidateCount: warCandidates.length,
  distinctOtherFactionIdsFound: enemyFactionIds.length,
}))

if (enemyFactionIds.length === 1) {
  await request(
    'enemy-faction-basic',
    `/faction/${enemyFactionIds[0]}/basic`,
  )

  await request(
    'enemy-faction-members',
    `/faction/${enemyFactionIds[0]}/members`,
  )

  console.log(JSON.stringify({
    enemyFactionResolved: true,
    enemyMembersFetched: true,
  }))
} else {
  console.log(JSON.stringify({
    enemyFactionResolved: false,
    reason:
      enemyFactionIds.length === 0
        ? 'No opposing faction ID was found in the current wars response.'
        : 'More than one opposing faction ID was found; automatic selection intentionally stopped.',
  }))
}
