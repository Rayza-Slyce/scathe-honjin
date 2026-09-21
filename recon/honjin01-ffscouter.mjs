import { writeFile } from 'node:fs/promises'

const apiKey = process.env.TORN_API_KEY
const OUT_DIR = new URL('./private/', import.meta.url)

if (!apiKey) {
  console.error('ERROR: TORN_API_KEY was not supplied.')
  process.exit(1)
}

if (!/^[A-Za-z0-9]{16}$/.test(apiKey)) {
  console.error('ERROR: Unexpected Torn API key format.')
  process.exit(1)
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact)

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => {
        if (
          ['key', 'api_key', 'apikey', 'authorization']
            .includes(key.toLowerCase())
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

async function checkKey() {
  const url = new URL('https://ffscouter.com/api/v1/check-key')
  url.searchParams.set('key', apiKey)

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

  const artifact = redact({
    request: {
      method: 'GET',
      endpoint: '/api/v1/check-key',
    },
    response: {
      status: response.status,
      statusText: response.statusText,
      body,
    },
  })

  await writeFile(
    new URL('ffscouter-check-key.json', OUT_DIR),
    `${JSON.stringify(artifact, null, 2)}\n`,
    'utf8',
  )

  console.log(JSON.stringify({
    status: response.status,
    isRegistered:
      typeof body?.is_registered === 'boolean'
        ? body.is_registered
        : null,
    policyUpdateRequired:
      typeof body?.policy_update_required === 'boolean'
        ? body.policy_update_required
        : null,
    isPremium:
      typeof body?.is_premium === 'boolean'
        ? body.is_premium
        : null,
    savedTo: 'recon/private/ffscouter-check-key.json',
  }))
}

await checkKey()
