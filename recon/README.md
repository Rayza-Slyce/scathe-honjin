# HONJIN-01 API reconnaissance

This directory contains temporary tooling used to verify live API behaviour before
production HONJIN API logic is written.

Rules:

- Never hard-code a Torn API key.
- Never commit a real Torn API key.
- Never put a real Torn API key in a URL, fixture, log, screenshot, or shell command.
- Torn requests use the Authorization header.
- Private/raw responses belong in recon/private/ and must remain Git-ignored.
- Only deliberately redacted findings may become committed documentation.
- FFScouter registration must not occur until its policy/terms consent step has
  been explicitly completed.
- No faction attack/revive endpoint is a HONJIN-01 completion dependency.
