# Current SCATHE membership access

The public browser application requires faction **48572**, using Torn's connected player's own profile as authoritative evidence. Faction names and browser-saved identity are not authorization. `key/info` still establishes the API key owner and selections; its faction field is not required to determine membership. The already-required own profile is fetched before faction capability checks, personal battle-stat loading or FFScouter onboarding and reused for the existing profile capability check. No additional initial identity request or faction leadership permission is introduced.

`HonjinSession` owns the authenticated application boundary. Every reload, remembered-key restoration and new session starts without an operational runtime or authenticated screen. A successful full connection produces in-memory membership evidence; that evidence is never restored from localStorage or IndexedDB. Cached Spy/Team/Travel state can hydrate only after entry is authorized. README/About, theme and public assets retain their existing behavior.

Evidence is valid for at most 15 minutes. A single foreground timer starts a refresh 30 seconds before expiry so ordinary successful checks do not remount the app or reset its current screen. Existing fresh own-profile reads also refresh evidence, and the check shares the runtime's own-profile cache and in-flight request key. All Torn connection and membership requests use the same coordinator as operational requests, with its existing 40/minute rolling budget and priority ordering. A failed attempt does not move the evidence deadline. Hidden pages do not start membership polls; due foreground returns trigger a single check. Checks have a 15-second bound, including a request waiting for budget capacity.

If evidence expires without successful verification, the operational shell is unmounted, its transport is closed, queued work is cancelled and the UI shows a verification/retry state. The key is retained on network, rate-limit, permission and temporary Torn errors. Retry can verify membership with the same key without repeating full onboarding when a prior connection is available. The user's prior intention to enter is retained so successful verification resumes the application. A paused/recreated shell can reset unsaved transient view state; saved public watch/target identities are retained behind the gate.

Torn's authoritative factionless/other-faction response immediately clears the connection, runtime, both credential stores and in-memory authenticated view state. An incorrect-key response also revokes the session with a key-specific message. Temporary inactivity (13), rate limiting (5), paused keys (18) and other temporary failures do not permanently discard the key. Error meanings are documented by [Torn](https://www.torn.com/api.html#errors). All late connection/profile/FFScouter work is prevented from restoring a revoked authenticated session. Cancellation retains request-start history rather than resetting the rate budget.

Pagehide closes the operational shell before page-history restoration; pageshow checks evidence before resuming. A local, key-free, player-scoped denial marker propagates confirmed revocation to other open tabs and is rechecked on foreground return. It contains only a timestamp and whether the key was invalid, and can only deny access. It never establishes membership. If browser storage is unavailable, each tab still verifies independently and all key-store removals are attempted independently. The storage event signal is best effort; no cross-device signal or new backend service is introduced.

Shared Recon loaders/watch registration use the same session transport guard. Usage telemetry runs only while the verified operational session is entered, and stops when the gate closes (its existing final visible-interval flush remains). The public frontend, Torn/FFScouter behavior, target/combat logic, public Recon service, collector, private owner dashboard, README/About and GitHub repository settings otherwise retain their architecture. The backend and owner dashboard are not changed by this feature.

## Verification

```bash
cd /home/rayza/projects/scathe-honjin
npm test -- --maxWorkers=1 --testTimeout=15000 src/test/connect.test.ts src/test/session-access.test.ts src/test/membership-boundary-ui.test.tsx src/test/request-coordinator.test.ts src/test/onboarding-ui.test.tsx src/test/api-key-storage.test.ts
npm test -- --maxWorkers=1 --testTimeout=15000
npm run lint
npm run typecheck
./node_modules/.bin/tsc -b --pretty false
npm run build
```

Use synthetic fixtures only. On a real phone, verify first-time and remembered entry with a current member; refusal for another faction/factionless identity; no operational flash on reload or installed-PWA restoration; a successful foreground check after 15+ minutes away; key retention and Retry Connection after an offline/temporary failure outlasts the evidence deadline; immediate removal after a confirmed departure; cross-tab revocation; rejoining/reconnecting; and normal WAR/Targets/Spy/Hospital/Travel/Team, heat maps, theme, telemetry, FFScouter and README/About behavior. No real key should appear in console output or screenshots.

This is an ordinary-interface restriction in an updated client-side PWA. It does not make public source or compiled JavaScript private, secure independently public Recon endpoints, or prevent a modified/old client from bypassing client-side checks. A departure becomes known on the next authoritative profile response, normally within about 15 minutes of active use (subject to Torn's response freshness). Unverifiable expired sessions remain blocked rather than granting unlimited stale access. Installed clients must receive the updated PWA bundle; no automatic deployment, push or repository visibility change is part of implementation.
