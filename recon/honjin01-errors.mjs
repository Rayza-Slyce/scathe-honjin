const tests = [
  {
    name: 'FFScouter missing key',
    url: 'https://ffscouter.com/api/v1/check-key',
  },
  {
    name: 'FFScouter malformed key',
    url: 'https://ffscouter.com/api/v1/check-key?key=bad',
  },
]

for (const test of tests) {
  const response = await fetch(test.url, {
    headers: {
      Accept: 'application/json',
    },
  })

  let body = null

  try {
    body = await response.json()
  } catch {}

  console.log(JSON.stringify({
    test: test.name,
    status: response.status,
    code:
      Number.isInteger(body?.code)
        ? body.code
        : null,
    error:
      typeof body?.error === 'string'
        ? body.error
        : null,
    retryAfterSeconds:
      Number.isInteger(body?.retry_after_seconds)
        ? body.retry_after_seconds
        : null,
  }))
}
