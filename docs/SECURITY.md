# HONJIN v0.1 security invariants

- No real Torn API key in source code.
- No real Torn API key in Git history.
- No real Torn API key in fixtures.
- No real Torn API key in screenshots.
- No real Torn API key in logs.
- No real Torn API key in build-time environment variables.
- No HONJIN backend stores Torn API keys.
- Runtime key storage is session-only.
- Do not persist Torn API keys to localStorage or IndexedDB.
- Never log complete key-bearing request URLs.
- Only redacted API fixtures may be committed.
- Faction attack/revive permissions are not core v0.1 dependencies.
- Adding permissions requires an explicit product/security decision.

## One-key onboarding decision

HONJIN v0.1 will use one Torn custom key for both HONJIN and FFScouter.

The final requested selections must be the smallest verified union of:
- selections required directly by HONJIN; and
- selections genuinely required by FFScouter registration/free public BS intelligence.

This permission expansion must remain explicit to the user.

HONJIN itself must not persist the Torn API key server-side. Enabling FFScouter
necessarily discloses the key to FFScouter under FFScouter's own current terms
and data policy; that third-party disclosure must be explained during onboarding.
