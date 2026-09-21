import { readFile, writeFile } from 'node:fs/promises'

const BASE_URL = 'https://api.torn.com/v2'
const OUT_DIR = new URL('./private/', import.meta.url)
const apiKey = process.env.TORN_API_KEY

if (!apiKey) {
  console.error('ERROR: TORN_API_KEY was not supplied to this process.')
  process.exit(1)
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact)

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

  return {
    status: response.status,
    body,
  }
}

const membersArtifact = JSON.parse(
  await readFile(
    new URL('./private/enemy-faction-members.json', import.meta.url),
    'utf8',
  ),
)

const members = membersArtifact.response?.body?.members

if (!Array.isArray(members)) {
  console.error('ERROR: members array not found.')
  process.exit(2)
}

const travelling = members.filter(
  member =>
    member?.status?.state === 'Traveling' ||
    member?.status?.state === 'Abroad',
)

const planeCounts = {}

for (const member of members) {
  const plane = member?.status?.plane_image_type

  if (plane) {
    planeCounts[plane] = (planeCounts[plane] ?? 0) + 1
  }
}

console.log(JSON.stringify({
  memberCount: members.length,
  travellingOrAbroadCount: travelling.length,
  observedPlaneImageTypes: planeCounts,
}))

const targetCandidates = travelling
  .filter(member => Number.isInteger(member?.id))
  .slice(0, 10)

let propertySuccesses = 0

for (let index = 0; index < targetCandidates.length; index += 1) {
  const member = targetCandidates[index]

  const result = await request(
    `opponent-property-${index + 1}`,
    `/user/${member.id}/property`,
  )

  if (result.status === 200) {
    propertySuccesses += 1
  }

  console.log(JSON.stringify({
    sample: index + 1,
    state: member?.status?.state ?? null,
    planeImageType: member?.status?.plane_image_type ?? null,
    propertyStatus: result.status,
  }))
}

console.log(JSON.stringify({
  propertySamplesAttempted: targetCandidates.length,
  propertySamplesSucceeded: propertySuccesses,
}))
