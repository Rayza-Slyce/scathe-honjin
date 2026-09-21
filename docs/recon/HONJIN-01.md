# HONJIN-01 — API reconnaissance

Status: complete

## Scope

This work package validates the live Torn and FFScouter data contracts required
for HONJIN v0.1 before production API logic is implemented.

No faction attack/revive endpoint is a completion dependency.

## Confirmed live findings

### Torn identity and own stats

- `/v2/key/info` succeeds with the HONJIN reconnaissance key.
- `/v2/user/basic` succeeds.
- `/v2/user/battlestats` succeeds.
- Torn credentials work through the `Authorization: ApiKey ...` header.
- No real key is stored in committed fixtures or source.

### Ranked War discovery and roster

- Own faction identity can be derived from `/key/info`.
- `/faction/{own}/wars` exposes the current Ranked War.
- The opposing faction can be derived deterministically from that response.
- `/faction/{enemy}/members` succeeds for an ordinary faction member key.
- Privileged faction attack/revive access is not required for this core path.

### Member status

Observed member status fields:

- `color`
- `description`
- `details`
- `plane_image_type`
- `state`
- `until`

Observed last-action fields:

- `relative`
- `status`
- `timestamp`

Hospital `until` is a positive Unix timestamp in seconds.

`until` is null in observed `Okay`, `Traveling`, and `Abroad` states.

### Travel

Observed live `plane_image_type` values:

- `light_aircraft`
- `airliner`

`private_jet` remains schema-supported but has not yet been observed in the
HONJIN reconnaissance sample.

Observed travel descriptions are machine-readable strings such as travel from
one location to another. Abroad status descriptions identify the foreign
location.

`airliner` must not be interpreted as uniquely Standard or Business Class.

Aircraft-image data is evidence, not proof of exact travel method.

### Opponent property

`/user/{id}/property` succeeds publicly for sampled enemy members.

Observed public property response includes:

- property identity as nested `{ id, name }`;
- `modifications`;
- `staff`;
- `used_by`;
- `owner`;
- optional `rented_by`.

Private Island, Airstrip, and Pilot are visible in live public data.

In all sampled records, the queried target appeared in `used_by`.

`used_by` therefore establishes association with the returned property in the
observed responses, but does not prove that the target used that property's
Airstrip for the current journey.

PI + Airstrip + Pilot materially strengthens Airstrip-capability evidence but
must remain a separate signal from `plane_image_type`.

### FFScouter

The combined one-key HONJIN/FFScouter reconnaissance key successfully registers
with FFScouter.

`/api/v1/check-key` confirms:

- key registered;
- policy update not required;
- premium false.

Free `/api/v1/get-stats` succeeds.

Observed public BSS bucket:

- `bss_public`
- `bs_estimate`
- `bs_estimate_human`
- `last_updated`
- `fair_fight`

The tested target returned source `bss` with no premium or spy bucket.

HONJIN must consume `available_estimates.bss` explicitly rather than relying on
the merged top-level estimate.

Fair Fight is caller-specific and must not be reused across faction members.

Premium, spies, and FFScouter flight APIs are not required for HONJIN v0.1.

### CORS

Initial browser-origin tests succeeded for:

- Torn `/key/info`;
- FFScouter `/check-key`.

Full route coverage remains to be recorded.

## Permission decision

HONJIN v0.1 uses one-key onboarding.

The current reconnaissance key is a union of selections needed directly by
HONJIN and selections required by FFScouter.

The exact minimum union still requires permission-removal validation before
HONJIN-01 is closed.

## Residual uncertainties

- `private_jet` is confirmed by the current Torn schema but was not naturally
  observed in the HONJIN-01 live roster samples.
- Standard versus Business Class cannot be distinguished reliably from
  `airliner` alone.
- Travel method remains an inference from multiple evidence sources rather than
  an absolute fact.
- FFScouter and Torn behaviour may change after this reconnaissance and must be
  handled defensively.

## Additional live findings

### Aircraft refresh

A later live roster refresh observed:

- `light_aircraft`: 11
- `airliner`: 3
- `private_jet`: not observed

`private_jet` therefore remains supported by the current Torn schema but was not
empirically observed during HONJIN-01. This is not a blocker.

### FFScouter error behaviour discrepancy

Live probes against `/api/v1/check-key` produced:

- missing key: HTTP 500
- malformed key: HTTP 500

No structured `code` or `error` fields were returned by those live responses.

This differs from the current legacy FFScouter documentation, which documents
HTTP 400 with code 1 for a missing key and HTTP 400 with code 2 for malformed
key format.

HONJIN must therefore handle unexpected non-2xx responses defensively and must
not depend exclusively on the documented error shape.

### Full browser CORS validation

Live browser-origin requests from the local Vite development origin succeeded:

- Torn `/key/info`: HTTP 200
- Torn `/user/basic`: HTTP 200
- Torn `/user/battlestats`: HTTP 200
- Torn own-faction `/basic`: HTTP 200
- Torn own-faction `/wars`: HTTP 200
- Torn enemy-faction `/basic`: HTTP 200
- Torn enemy-faction `/members`: HTTP 200
- Torn opponent `/user/{id}/property`: HTTP 200
- FFScouter `/check-key`: HTTP 200
- FFScouter `/get-stats`: HTTP 200

FFScouter `/register` returned HTTP 429 during the browser probe. This is a
CORS success because the browser received the service response. It also confirms
live registration throttling.

No backend or proxy is required for the core v0.1 API path based on current
browser CORS behaviour.

### Torn permission minimisation

A key containing only FFScouter user selections but no faction/property
selections was insufficient for HONJIN.

Torn returned HTTP 200 with application-level error code 16
("Access level of this key is not high enough") for required selections that
were absent.

This establishes an important client rule:

- HTTP success alone does not mean a Torn request succeeded.
- HONJIN must reject responses containing a top-level `error` object even when
  HTTP status is 200.

Live permission-removal testing established:

- faction `basic` is not required for `/faction/{id}/basic`;
- faction `wars` is required for `/faction/{id}/wars`;
- faction `chain` is required for `/faction/{id}/chain`;
- faction `members` is required for `/faction/{id}/members`;
- user `property` is required for `/user/{id}/property`.

The current successful one-key candidate is:

User:
- basic
- battlestats
- property
- attacks
- hof
- personalstats

Faction:
- wars
- chain
- members

This candidate passed the full required Torn path, FFScouter registration, and
free FFScouter BSS lookup.

### FFScouter personalstats minimisation

HONJIN's complete Torn workflow succeeds without the `personalstats` selection.

The first FFScouter registration attempt for the no-personalstats key failed
with a transport-level ECONNRESET and produced no meaningful API response.

A subsequent registration attempt returned HTTP 429, code 21, indicating route
throttling.

Therefore FFScouter's requirement for `personalstats` remains unresolved by
live registration testing. The current FFScouter site states that the older core
selection set can provide the same FFScouter functionality, while personalstats
is associated with later data collection/AI-training use.

HONJIN should not treat the 401 get-stats response from this key as evidence
that personalstats is required, because the key had not successfully completed
FFScouter registration.

### FFScouter live throttling

A live registration attempt returned:

- HTTP 429
- code 21
- `retry_after_seconds`: 28

HONJIN must respect `retry_after_seconds` and must not blindly retry throttled
FFScouter requests.

### Current Torn travel-duration reference

The current Torn Wiki exposes separate travel tables for:

- regular travel without the Mailing Yourself Abroad book; and
- travel with the book's additional 25% reduction.

HONJIN v0.1 should use the regular no-book table as the base reference:

| Destination | Standard | Airstrip | WLT / Private | Business |
| --- | ---: | ---: | ---: | ---: |
| Mexico | 24m | 17m | 12m | 7m |
| Cayman Islands | 33m | 23m | 17m | 10m |
| Canada | 39m | 27m | 19m | 12m |
| Hawaii | 127m | 89m | 63m | 38m |
| United Kingdom | 151m | 106m | 75m | 45m |
| Argentina | 158m | 111m | 79m | 47m |
| Switzerland | 166m | 116m | 83m | 50m |
| Japan | 213m | 149m | 107m | 64m |
| China | 229m | 160m | 114m | 69m |
| UAE | 257m | 180m | 128m | 77m |
| South Africa | 282m | 197m | 141m | 85m |

The 23 June 2026 travel update reduced travel times across all methods by 5.26%.

The Torn Wiki also documents:
- up to 3% flight-time variance; and
- possible flight extension from the Detective Agency Watchlist special.

Accordingly, these values are reference durations, not guaranteed exact ETAs.
HONJIN's travel engine must surface uncertainty rather than false precision.

### personalstats removal confirmed

A live key without Torn `personalstats`:

- passed all required HONJIN Torn endpoints;
- successfully registered with FFScouter;
- returned free/public BSS intelligence;
- returned numeric caller-specific Fair Fight;
- required neither premium nor spy intelligence.

Therefore `personalstats` is not required for HONJIN v0.1 and must not be
included in the final custom-key selection set.

### HOF minimisation

A key with `hof` removed but all other current HONJIN requirements retained:

- passed every required HONJIN Torn endpoint;
- failed FFScouter registration with HTTP 400, code 6.

The immediately preceding no-personalstats key registered successfully, so the
material permission difference was removal of `hof`.

This is strong live evidence that `hof` is required by FFScouter and must remain
in the HONJIN v0.1 one-key selection set.

### attacks minimisation

A key with Torn `attacks` removed but all other validated HONJIN selections
retained:

- passed every required HONJIN Torn endpoint;
- failed FFScouter registration with HTTP 400, code 6.

The only intended permission difference from the previously successful
no-personalstats candidate was removal of `attacks`.

This is strong live evidence that `attacks` is required by FFScouter and must
remain in the HONJIN v0.1 one-key selection set.

### Final minimum Torn custom-key target

HONJIN v0.1 will request exactly:

User:
- `basic`
- `battlestats`
- `property`
- `attacks`
- `hof`

Faction:
- `wars`
- `chain`
- `members`

No other selections are required for the validated v0.1 core workflow.

Specifically excluded:
- `personalstats`
- faction `basic`
- privileged faction attack feeds
- privileged faction revive feeds
- premium FFScouter permissions
- spy intelligence permissions
- FFScouter flight APIs

The same key successfully supports:
- current-user/key introspection;
- own battle stats;
- faction identity;
- current Ranked War discovery;
- current chain;
- enemy faction/member roster;
- status, hospital and last-action evidence;
- public opponent property evidence;
- FFScouter registration;
- free/public BSS estimates;
- caller-specific Fair Fight.
