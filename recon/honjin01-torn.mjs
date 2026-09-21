import { mkdir, writeFile } from 'node:fs/promises'

const BASE_URL = 'https://api.torn.com/v2'
const OUT_DIR = new URL('./private/', import.meta.url)

const apiKey = process.env.TORN_API_KEY

if (!apiKey) {
  console.error('ERROR: TORN_API_KEY was not supplied to this process.')
  process.exit(1)
}

if (!/^[A-Za-z0-9]{16}$/.test(apiKey)) {
  console.error('ERROR: Torn key format was not the expected 16 alphanumeric characters.')
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

function rateHeaders(headers) {
  const result = {}

  for (const [name, value] of headers.entries()) {
    const lower = name.toLowerCase()

    if (
      lower.includes('rate') ||
      lower === 'retry-after'
    ) {
      result[name] = value
    }
  }

  return result
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
      rateHeaders: rateHeaders(response.headers),
      body,
    },
  })

  const filename = `${name}.json`

  await writeFile(
    new URL(filename, OUT_DIR),
    `${JSON.stringify(artifact, null, 2)}\n`,
    'utf8',
  )

  const bodyKeys =
    body && typeof body === 'object' && !Array.isArray(body)
      ? Object.keys(body)
      : []

  console.log(
    JSON.stringify({
      test: name,
      path,
      status: response.status,
      bodyKeys,
      rateHeaders: rateHeaders(response.headers),
      savedTo: `recon/private/${filename}`,
    }),
  )

  return {
    status: response.status,
    body,
  }
}

const tests = [
  ['key-info', '/key/info'],
  ['user-basic', '/user/basic'],
  ['user-battlestats', '/user/battlestats'],
]

let failed = false

for (const [name, path] of tests) {
  try {
    const result = await request(name, path)

    if (result.status < 200 || result.status >= 300) {
      failed = true
    }
  } catch (error) {
    failed = true

    console.error(
      JSON.stringify({
        test: name,
        path,
        transportError:
          error instanceof Error ? error.message : String(error),
      }),
    )
  }
}

if (failed) {
  process.exitCode = 1
}
