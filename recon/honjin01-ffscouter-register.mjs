import { writeFile } from 'node:fs/promises'

const apiKey = process.env.TORN_API_KEY
const consent = process.env.FFSCOUTER_POLICY_CONSENT
const OUT_DIR = new URL('./private/', import.meta.url)

if (!apiKey) {
  console.error('ERROR: TORN_API_KEY was not supplied.')
  process.exit(1)
}

if (!/^[A-Za-z0-9]{16}$/.test(apiKey)) {
  console.error('ERROR: Unexpected Torn API key format.')
  process.exit(1)
}

if (consent !== 'YES') {
  console.error(
    'ERROR: FFScouter policy consent was not explicitly confirmed.',
  )
  process.exit(2)
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

let response

try {
  response = await fetch(
    'https://ffscouter.com/api/v1/register',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: apiKey,
        agree_to_data_policy: true,
        signup_source: 'ScatheHonjin',
      }),
    },
  )
} catch (error) {
  console.error(JSON.stringify({
    transportError: true,
    message: error instanceof Error ? error.message : String(error),
  }))

  process.exit(3)
}

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
    method: 'POST',
    endpoint: '/api/v1/register',
    signup_source: 'ScatheHonjin',
    agree_to_data_policy: true,
  },
  response: {
    status: response.status,
    statusText: response.statusText,
    body,
  },
})

await writeFile(
  new URL('ffscouter-register.json', OUT_DIR),
  `${JSON.stringify(artifact, null, 2)}\n`,
  'utf8',
)

console.log(JSON.stringify({
  status: response.status,
  success:
    typeof body?.success === 'boolean'
      ? body.success
      : null,
  errorCode:
    Number.isInteger(body?.code)
      ? body.code
      : null,
  message:
    typeof body?.message === 'string'
      ? body.message
      : null,
  error:
    typeof body?.error === 'string'
      ? body.error
      : null,
  savedTo: 'recon/private/ffscouter-register.json',
}))

if (!response.ok) {
  process.exitCode = 1
}
