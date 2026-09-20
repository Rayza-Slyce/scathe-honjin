# SCATHE HONJIN — COMPLETE PROJECT SOURCE OF TRUTH

**Status:** Initial approved project source of truth  
**Version:** v0.1 source of truth  
**Date:** 20 September 2026  
**Project:** SCATHE HONJIN  
**Primary platform:** Mobile-first Progressive Web App (PWA)  
**Primary users:** SCATHE faction members during Torn Ranked Wars  
**Brand asset:** Use the supplied SCATHE faction banner/logo as the visual identity.

---

# 1. Product definition

SCATHE HONJIN is a mobile-first Torn Ranked War command interface and personalised war board for SCATHE.

Its purpose is not to reproduce Torn, FFScouter, faction management tooling, or a desktop faction spreadsheet. Its purpose is to combine live Torn war/opponent state with free FFScouter battle-stat intelligence and present the information a faction member actually needs to choose and reach sensible Ranked War targets quickly.

HONJIN should answer five questions quickly:

1. **Who should I attack now?**
2. **Which useful opponents are in hospital, and when are they due out?**
3. **Who is travelling or abroad, and roughly when might they land?**
4. **How reliable is the battle-stat intelligence for a target?**
5. **What is the current war state, and which opponents are actionable for me?**

A user should be able to open HONJIN on a phone, understand the situation within seconds, and reach the relevant Torn attack/profile page with minimal taps.

HONJIN should be genuinely useful during its first live war. It must not depend on weeks of historical learning before recommendations become valuable.

HONJIN v0.1 is deliberately a **war board first**. Faction-management analytics that are already easy to inspect inside Torn are secondary and must not expand the permission/security footprint of the core product.

---

# 2. Product principles

## 2.1 Mobile first

Portrait phone use is the primary design target.

Desktop support is desirable, but desktop must not dictate the information architecture.

Normal use must not require horizontal scrolling.

Tap targets must remain comfortable during fast-paced war use.

---

## 2.2 Action first, detail on demand

The main interface should show only information needed for an immediate decision.

Detailed provenance such as:

- estimate source;
- observation timestamp;
- estimate age;
- public BSS;
- alternative estimate metadata;
- previous fight evidence;
- travel-estimation reasoning;

belongs behind an `ⓘ` control, drawer, or player detail view.

The default target card must stay compact.

---

## 2.3 Personalised to the current user

HONJIN is fundamentally user-specific.

Each faction member connects HONJIN using their own Torn API key.

That allows HONJIN to know:

- who the current user is;
- their faction;
- their battle stats;
- their current war;
- the current enemy faction;
- their own relevant FF context against enemies.

The same opponent may therefore be:

- `HIT NOW` for one member;
- `GOOD` for another;
- `VIABLE` for another;
- `AVOID` for a weaker member.

HONJIN may mark multiple opponents as `HIT NOW` simultaneously.

It must not force one mandatory target.

Within the same suitability tier, safer/lower estimated BS targets should normally sort first while FF remains visible so the user can make the final decision.

---

## 2.4 Simple deterministic reasoning

HONJIN v0.1 must not contain an opaque or complex scoring engine.

Keep these concepts separate:

- **Suitability:** enemy estimated BS relative to the current user's known BS.
- **Confidence:** freshness/quality of the enemy estimate.
- **Availability:** whether the opponent is currently attackable.
- **Reward context:** Fair Fight and similar reward information.
- **Travel:** current travel state and ETA estimation.

Do not blend dozens of weak signals into one hard-to-debug number.

A developer should be able to understand the target-classification logic by reading one small module.

---

## 2.5 Useful immediately

HONJIN must produce useful target guidance from live Torn data plus free FFScouter data on first use.

Historical observations may improve future versions, but they are optional enhancements rather than prerequisites.

Deleting local history should never render HONJIN useless.

---

## 2.6 Evidence, not false certainty

Enemy battle stats are estimates unless an authoritative exact source exists.

HONJIN must never silently present an estimated value as exact.

Travel arrival times are estimates unless Torn provides an authoritative timestamp.

Never show false precision such as:

```text
Lands at 14:36:12
```

when the app only has an inferred window.

Prefer:

```text
ETA ~14:32–14:41
```

---

## 2.7 Human-controlled combat

HONJIN assists a human player.

It may:

- rank;
- filter;
- surface;
- watch;
- deep-link;
- record local observations;
- notify in later versions.

It must not automate attacks or perform combat actions.

---

## 2.8 Free dependencies only

No core v0.1 feature may require:

- FFScouter Premium;
- a paid flight tracker;
- premium-only estimates;
- a premium entitlement that may expire.

The application must continue working if a user has no premium services at all.

---

## 2.9 No leadership-granted faction API dependency

HONJIN v0.1 must not require Torn faction API-access permission granted through a faction position or leadership role.

Core onboarding and normal war-board use must work for an ordinary SCATHE member using only their own appropriately scoped custom Torn API key.

Therefore:

- no core v0.1 feature may depend on privileged faction attack feeds;
- no core v0.1 feature may depend on privileged faction revive feeds;
- leadership must not need to alter a member's faction position so they can use HONJIN;
- a missing leadership-granted faction API permission must never block onboarding;
- features that would require such permission are deferred unless a later version proves they are worth the added access and complexity.

This is an architectural invariant for v0.1, not merely a UI fallback.

---

# 3. Branding and visual direction

Use the real SCATHE faction banner/logo supplied by the user.

Visual language:

- black / charcoal background;
- SCATHE red as primary accent;
- white / silver typography;
- restrained metallic / carbon textures;
- green for favourable/available;
- amber for uncertainty/risk;
- red for hospital/danger;
- cyan/blue for travel;
- compact high-contrast game-HUD aesthetic.

The banner should be recognisable without consuming excessive vertical space.

---

# 4. Primary navigation

Persistent bottom navigation contains exactly five destinations:

1. **WAR**
2. **TARGETS**
3. **HOSPITAL**
4. **TRAVEL**
5. **TEAM**

Player-specific intelligence opens contextually via `ⓘ` or a player detail drawer.

---

# 5. First-run onboarding

Onboarding must be designed for non-technical Torn players.

The user should not need to understand API terminology beyond being told that HONJIN requires a read-only Torn API key.

## 5.1 First screen

Example:

```text
WELCOME TO SCATHE HONJIN

HONJIN uses a Torn API key to identify you,
read your battle stats, detect your faction war,
and personalise opponent intel.

Your Torn key is read-only.
HONJIN cannot log in to your account or attack for you.

[ CREATE TORN KEY ]
```

---

## 5.2 Custom Torn key creation

HONJIN should provide a button that opens Torn's custom API-key creation page with only the required selections pre-filled if Torn supports a suitable creation-link flow.

During development, HONJIN-01 must determine the exact minimum permission set.

Do not request broad Limited or Full access simply because it is convenient.

The key should be named clearly, e.g.:

```text
SCATHE-HONJIN
```

---

## 5.3 Paste and validate

After creating the key, the user returns to HONJIN and pastes it once.

Example:

```text
PASTE YOUR TORN API KEY

[________________]

[ CONNECT ]
```

HONJIN validates it against Torn and confirms identity.

Example:

```text
✓ Torn connected

ElBarbero [3187314]
SCATHE

Battle stats: 8,675
```

If the key lacks a required selection, explain exactly which permission is missing rather than showing a generic failure.

---

## 5.4 FFScouter registration

FFScouter currently requires an API key to be registered before its battle-stat prediction API can be used.

HONJIN should detect whether the user's key is registered.

If not, HONJIN may offer a compliant in-app registration flow using FFScouter's documented registration endpoint.

Before submitting registration:

- clearly identify FFScouter as the external provider of opponent battle-stat intelligence;
- provide a visible link to FFScouter's Data Policy / Terms;
- require explicit user confirmation;
- only then perform registration.

Example:

```text
ENABLE BATTLE INTEL

HONJIN uses FFScouter for free opponent
battle-stat estimates and Fair Fight data.

[ Read FFScouter Data Policy ]

☐ I have read and agree

[ ENABLE BATTLE INTEL ]
```

If registration succeeds:

```text
✓ FFScouter connected
```

If the user declines, HONJIN should still operate using Torn data, but enemy BS suitability becomes unavailable.

---

## 5.5 Remember this device

Default v0.1 preference:

**Session-only key storage.**

For usability, HONJIN may later offer:

```text
☐ Remember this device
```

with clear text:

```text
Stores your read-only Torn key in this browser.
Do not enable this on a shared device.
```

This option must be explicitly selected by the user.

The implementation must undergo security review before persistent key storage is enabled.

---

## 5.6 Enter HONJIN

Successful onboarding:

```text
✓ Torn connected
✓ SCATHE detected
✓ Battle stats loaded
✓ FFScouter battle intel enabled

[ ENTER HONJIN ]
```

The onboarding process should feel like connecting an app, not configuring a developer tool.

---

# 6. Current-user discovery flow

Once authenticated, HONJIN should automatically determine:

```text
current API key
    ↓
current Torn user
    ↓
current faction
    ↓
current user battle stats
    ↓
current Ranked War
    ↓
enemy faction
    ↓
enemy roster
    ↓
FFScouter intel for enemy roster
    ↓
personalised target board
```

The user should not manually enter:

- their own faction ID;
- their own BS;
- the enemy faction ID;
- their Torn player ID;

unless an API limitation forces a fallback.

---

# 7. WAR screen

The WAR screen is the default homepage.

Its purpose is:

> What is happening, and what should I consider doing now?

## 7.1 Header

Show:

- SCATHE;
- enemy faction;
- current scores;
- lead/deficit;
- target score / lead target where applicable;
- current war timer/state;
- chain state where useful.

Example:

```text
SCATHE vs THE CHAOS CREW

2,064      1,098
   +966

Target: 6,900
Chain: 42 / 50
```

Optional own energy/life may be added only if real use justifies the screen space.

---

## 7.2 Best targets now

Show approximately three useful candidates without requiring scrolling.

Example:

```text
Sama_1                       ⓘ
Est. BS 5.1k
FF 2.16 for you

HIT NOW · HIGH

● Okay · Active 4m ago

                         ATTACK
```

Hospital example:

```text
Old_Nick                     ⓘ
Est. BS 4.74k

GOOD · MEDIUM

🏥 Out in 08:42

                          WATCH
```

Travel example:

```text
-Tical-                      ⓘ
Est. BS 8.52k

VIABLE · MEDIUM

✈ China → Torn
ETA ~14:32–14:41

                          WATCH
```

No detailed provenance on these cards.

---

# 8. TARGETS screen

Purpose:

> Who can I hit?

This is the full personalised enemy roster.

Filters:

- All
- Okay
- Hospital
- Travelling
- Abroad

Controls:

- search;
- filters;
- sort.

Default sort:

**Best for me**

Other sorts:

- Lowest estimated BS
- Highest FF
- Recently active
- Status
- Name

Compact card:

```text
Old_Nick                     ⓘ
Est. BS 4.74k
FF 2.11 for you

GOOD · HIGH

● Okay · Active 2m

                         ATTACK
```

Level is secondary and should not dominate the card.

---

# 9. Target suitability model

HONJIN v0.1 uses deterministic BS-ratio bands.

Conceptually:

```text
enemy estimate << my BS
    → HIT NOW

enemy estimate clearly below my BS
    → GOOD

enemy estimate around my BS
    → VIABLE

enemy estimate moderately above my BS
    → RISKY

enemy estimate substantially above my BS
    → AVOID
```

Initial development thresholds may start at:

```text
enemy <= 50% of my BS     → HIT NOW
enemy <= 75% of my BS     → GOOD
enemy <= 100% of my BS    → VIABLE
enemy <= 125% of my BS    → RISKY
enemy > 125% of my BS     → AVOID
```

These are starting rules, not statements of Torn combat truth.

They must be:

- centralised;
- configurable;
- testable;
- easy to tune after field evidence.

Do not create a complex weighted score in v0.1.

---

# 10. Multiple simultaneous good targets

More than one opponent may be `HIT NOW`.

HONJIN should not attempt to force a single "best" choice.

Example:

```text
Target A
Est. BS 2.1k
FF 1.60
HIT NOW

Target B
Est. BS 2.5k
FF 2.10
HIT NOW

Target C
Est. BS 2.8k
FF 2.35
HIT NOW
```

All remain valid choices.

Default ordering within the tier should normally favour lower estimated BS.

FF remains visible so the user can consciously choose a more rewarding target.

---

# 11. Intel confidence

Suitability and confidence are separate.

Examples:

```text
GOOD · HIGH
GOOD · MEDIUM
VIABLE · LOW
```

Confidence derives primarily from:

- source;
- timestamp;
- estimate age;
- whether usable data exists.

Use broad categories:

- HIGH
- MEDIUM
- LOW
- UNKNOWN

Never display fake precision such as:

```text
Confidence 83.7%
```

Confidence thresholds must be centralised and tunable.

---

# 12. Fair Fight

Fair Fight is useful because HONJIN should obtain it relative to the current user's key/stats rather than displaying another member's personalised FF.

FF is therefore worth retaining.

However, it remains:

**reward/context information, not the primary safety classifier.**

Do not imply:

> FF 2.2 means this opponent is easy.

Example:

```text
Target A
Est. BS 3.9k
FF 1.40 for you
HIT NOW

Target B
Est. BS 4.3k
FF 2.05 for you
HIT NOW
```

Both may remain `HIT NOW`.

The user decides whether to prioritise apparent safety or reward.

---

# 13. Intel drawer / player detail

Opened by `ⓘ` or tapping the player.

Show:

- player name;
- Torn ID;
- faction position;
- level;
- current status;
- last action;
- selected estimated BS;
- personalised FF;
- public BSS where available;
- estimate source;
- estimate timestamp;
- estimate age;
- confidence.

Example:

```text
Battle-stat estimate
5.13k

Source
FFScouter public BSS estimate

Updated
18 Sep 2026

Confidence
MEDIUM
```

Historical HONJIN fight observations may be added later, but are not required for v0.1.

---

# 14. FFScouter data policy inside HONJIN

HONJIN v0.1 uses **free FFScouter public battle-stat intelligence only**.

Important implementation rule:

> HONJIN should use FFScouter's public/free BSS estimate data as its canonical external BS source rather than blindly consuming a merged estimate that could select premium or faction-spy information.

Reason:

HONJIN must behave consistently whether or not a user has premium entitlement.

Therefore:

- use public/free BSS estimate data for classification;
- use caller-specific FF associated with the relevant public estimate where the API supports it;
- do not require premium estimates;
- do not require faction-spy data;
- do not use premium flight APIs.

If free FFScouter data is unavailable:

```text
BS UNKNOWN
Intel unavailable
```

Do not fabricate suitability from missing BS data.

---

# 15. HOSPITAL screen

Purpose:

> Who is unavailable now, and who is becoming available soon?

Default sort:

**Soonest release first**

Example:

```text
Old_Nick                     ⓘ
Est. BS 4.74k

GOOD · HIGH

🏥 08:42 remaining

                          WATCH
```

Quick filters:

- All
- < 15 min
- < 1 hour
- 1–3 hours
- 3h+

v0.1 WATCH may simply highlight/store a target locally.

Push notifications are later scope.

---

# 16. TRAVEL screen

HONJIN implements its own free approximate travel tracker using Torn state.

Sections:

1. **Incoming**
2. **Outbound**
3. **Abroad**

No premium FFScouter flight functionality is required.

---

# 17. Travel observation

Observe status transitions such as:

```text
Okay
→ Traveling to China
```

and:

```text
In China
→ Returning from China
```

Record flight-state evidence:

```text
player_id
origin
destination
direction
previous_status
current_status
plane_image_type
last_seen_previous_state
first_seen_current_state
```

HONJIN may also cache non-secret public property evidence for the opponent:

```text
property_type
property_modifications
property_staff
airstrip_present
pilot_present
property_evidence_checked_at
```

Current Torn API v2 exposes another player's current property through `/user/{id}/property` with public access. The current schema includes the property type/name, modifications including `Airstrip`, staff including `Pilot`, and the users associated with that property. This makes property evidence usable without leadership-granted faction API access.

Property evidence is supporting evidence only. A Private Island, Airstrip modification, or Pilot indicates that Airstrip travel may be available; it does not prove which method is being used on the current flight.

When arrival is observed:

```text
first_seen_arrived
observed_duration_window
```

Take-off time is known only to within the polling interval.

---

# 18. Travel-method inference

HONJIN v0.1 uses a small deterministic evidence combiner. It must not use a learning model, probabilistic classifier, or opaque weighted score.

Potential evidence:

- Torn travel status;
- origin/destination;
- direction;
- `plane_image_type`;
- current property type/name;
- whether the current property exposes an `Airstrip` modification;
- whether the current property exposes `Pilot` staff;
- current known Torn travel-duration table;
- departure observation window;
- previous observed trips only as optional later evidence.

Current API facts that HONJIN may rely on after HONJIN-01 confirms live responses:

- `plane_image_type` is populated only while status state is `Traveling`;
- its current enum values are `light_aircraft`, `airliner`, and `private_jet`;
- Torn deliberately names this field `plane_image_type`, not `travel_type`;
- Business Class uses the same aircraft image as Standard travel, so an `airliner` image cannot distinguish Standard from Business Class;
- the user's own `/user/travel` endpoint has an authoritative `method` enum (`Private`, `Business`, `Airstrip`, `Standard`), but there is no equivalent documented opponent endpoint exposing that authoritative method. HONJIN must therefore infer opponent method conservatively.

Initial deterministic rules to validate during HONJIN-01:

```text
plane_image_type = light_aircraft
+ current property has Airstrip
+ current property has Pilot
    → Likely Airstrip · HIGH candidate confidence
```

The confidence becomes lower if only one property signal is present, the property evidence is stale, or live observations contradict the expected Airstrip duration.

```text
plane_image_type = airliner
    → Airline travel · Standard/BCT unclear
```

Absence of PI/Airstrip evidence may make Standard the more plausible working assumption for ETA calculation, but HONJIN must preserve the BCT ambiguity in its confidence/window because Torn uses the same image for Standard and Business Class. It must not present Standard as authoritative.

```text
plane_image_type = private_jet
    → Private-jet image · exact travel method unverified
```

HONJIN-01 must empirically determine whether this image consistently corresponds to WLT/private travel or whether more than one method can produce it. Do not label it `BCT/WLT` merely from the image value.

Conflicting, missing, stale, or ambiguous evidence must widen the ETA window and reduce confidence rather than forcing a method.

Permitted user-facing labels include:

- `Likely Airstrip · High confidence`
- `Airline travel · Standard/BCT unclear · Medium confidence`
- `Private travel · exact method unclear · Medium confidence`
- `Method unknown · broad ETA`

Detailed reasoning belongs behind `ⓘ`, for example:

```text
Why this estimate?

Aircraft image: light_aircraft
Current property: Private Island
Airstrip modification: present
Pilot staff: present
Observed departure window: 14:20–14:40

Inference: Airstrip likely
Confidence: HIGH
```

Property type is never treated as proof of the current flight method, and `plane_image_type` is never treated as an authoritative `travel_type`.

If a later observed arrival contradicts the original inference, record the contradiction as non-secret evidence for future refinement. Do not require historical observations for the feature to work on first use.

---

# 19. Travel ETA

Main cards show ETA windows.

Example:

```text
-Tical-                      ⓘ
✈ China → Torn

ETA ~14:32–14:41

VIABLE · MEDIUM
```

ETA calculations must preserve:

- polling uncertainty;
- normal Torn travel-time variance;
- ambiguity between Standard and Business Class when the aircraft image cannot distinguish them;
- uncertainty in Airstrip/private-method inference;
- stale or incomplete property evidence;
- unseen modifiers.

A narrower ETA window is justified only when independent evidence meaningfully agrees. Property evidence plus a compatible aircraft image may increase confidence; either signal alone should normally produce a wider window.

If uncertainty is too broad:

```text
ETA uncertain
```

is better than a misleading time.

---

# 20. Travel history

Local non-secret observations may be retained in IndexedDB.

Suggested model:

```text
TravelObservation
- player_id
- origin
- destination
- direction
- plane_image_type
- property_type_at_observation
- airstrip_present
- pilot_present
- property_evidence_checked_at
- first_seen_travelling
- previous_state_last_seen
- first_seen_arrived
- inferred_method
- inference_reason
- confidence
- contradicted_by_arrival
```

Historical data can improve later estimates, but Travel must remain useful without history.

---

# 21. Abroad / ambush awareness

The Abroad section helps users see opponents already present in another country.

Example:

```text
Issit
🇨🇳 China

Est. BS 16.9k
FF 3.11 for you

Active 8h ago
```

This can help:

- identify foreign targets;
- avoid flying into destinations containing stronger opponents;
- identify opponents remaining abroad for unusually long periods.

Use neutral language.

Do not infer motives such as:

- hiding;
- camping;
- avoiding attacks.

A neutral label such as:

```text
Extended abroad
```

is acceptable.

---

# 22. TEAM screen

Purpose:

> What is SCATHE's immediate war-board state without requiring privileged faction API access?

TEAM is intentionally lightweight in v0.1.

It may show non-privileged information that is useful during a war, such as:

- SCATHE member roster where available through ordinary/public faction data;
- current member status;
- hospital/travel/location state;
- last action where available;
- current faction war score/state;
- current chain where useful.

It must **not** require or derive v0.1 functionality from privileged faction attack or revive feeds.

Do not require:

- live per-member attack counts;
- live wins/losses;
- live respect gained;
- live revive counts;
- faction-position API access;
- leadership-only analytics.

If a Team field is already easier to inspect directly in Torn and does not improve war-board decision speed, omit it.

Historical war analytics and detailed contribution reporting are later scope.

---

# 23. Data sources

## 23.1 Torn API v2

Torn is the primary authoritative source for:

- current user identity;
- own battle stats;
- faction identity;
- enemy faction;
- faction members;
- live status;
- hospital state;
- travel state;
- last action;
- current Ranked War state;
- chain;

For v0.1, current-user/key validation should prefer Torn's current key-information capability where it exposes the connected user and actual granted selections. Current Ranked War discovery should use the live war endpoint rather than treating Ranked War history as the primary source.

Relevant current endpoint families to validate during HONJIN-01 include:

```text
/key/info
/user/basic
/user/battlestats
/user/{id}/property

/faction/{id}/basic
/faction/{id}/members
/faction/{id}/wars
/faction/{id}/chain
```

For opponent travel inference, `/user/{id}/property` is currently documented as public-access and returns the opponent's current property with property identity, modifications and staff. HONJIN-01 must verify the live shape and whether `Airstrip`, `Pilot`, and `used_by` are consistently present for relevant opponent cases before relying on them.

`/faction/{id}/rankedwars` may be useful for history/discovery but is not the canonical live-war endpoint for v0.1.

The following privileged faction feeds are **not v0.1 dependencies**:

```text
/faction/attacks
/faction/attacksfull
/faction/revives
/faction/revivesFull
```

HONJIN-01 must verify live response schemas against Torn Swagger and live browser behaviour rather than assuming this document is an immutable API contract.

---

## 23.2 FFScouter free API

Used for:

- public BS estimate;
- public BSS;
- current-user-specific FF where available;
- source/timestamp metadata;
- key registration status.

FFScouter currently exposes:

```text
POST /api/v1/register
```

for third-party registration with explicit user consent.

HONJIN must use FFScouter's free/public BSS-specific estimate bucket as the canonical external BS source and must not blindly consume a merged top-level estimate that may incorporate premium or faction-spy data. Current-user Fair Fight values must be treated as caller-specific and never reused globally across faction members.

The exact live stats response mapping must be captured during HONJIN-01.

---

# 24. API failure behaviour

HONJIN should degrade rather than collapse.

## Torn unavailable

Show:

```text
Live status unavailable
```

Retain last known data with a stale indicator where safe.

## FFScouter unavailable

Show:

```text
BS UNKNOWN
Intel unavailable
```

Live Torn state can still render.

## FFScouter registration declined

HONJIN remains usable for:

- war state;
- status;
- hospital;
- travel;
- lightweight Team/status information available without privileged faction API access;

but cannot provide BS-based personalised suitability.

## Travel evidence insufficient

Show:

```text
Travelling to China
```

without an ETA.

---

# 25. API-key architecture

v0.1 has no HONJIN backend holding player Torn API keys.

Preferred architecture:

```text
User phone/browser
      |
      +---- Torn API
      |
      +---- FFScouter API
      |
      +---- local HONJIN state
```

Each player supplies their own appropriately scoped Torn key.

Request only the minimum selections required.

---

# 26. API-key safety

A Torn API key is not the user's Torn password and does not permit logging into the account, but it can expose sensitive game information according to its permissions.

Therefore:

- use custom keys;
- request minimum selections;
- explain what HONJIN reads;
- do not request Full access;
- do not request broad access merely for convenience;
- provide a clear disconnect/revoke path.

If a user revokes the key in Torn, HONJIN should detect the failure and return to onboarding.

---

# 27. Key storage

Initial default:

**session-only.**

A future explicit:

```text
Remember this device
```

option may store the key locally after security review.

No real key may ever be placed in:

- source files;
- committed config;
- frontend build-time environment variables;
- tests;
- fixtures;
- logs;
- screenshots;
- analytics;
- crash reports;
- docs.

Do not use:

```text
VITE_TORN_API_KEY=REAL_KEY
```

because frontend environment variables are compiled into the delivered app.

---

# 28. Browser security

Because the user's key exists in the browser during use, XSS and supply-chain protection matter.

v0.1 expectations:

- HTTPS only;
- strict Content Security Policy;
- no unnecessary third-party runtime JavaScript;
- no adverts;
- no analytics that can capture URLs/application state;
- sanitised error reporting;
- never log key-bearing FFScouter URLs;
- dependency lockfile;
- dependency review;
- avoid unsafe HTML rendering;
- intentionally small dependency footprint.

Preventing malicious script execution matters more than pretending browser storage can be made magically safe.

---

# 29. Local persistence

Use IndexedDB for non-secret state.

Initial policy:

```text
API key          → session only
travel history   → IndexedDB
watch state      → IndexedDB
preferences      → IndexedDB
```

If persistent key storage is later added, it must be separately reviewed.

---

# 30. Polling and caching

Avoid per-player Torn polling.

## Enemy roster/status

- one faction-members request;
- approximately every 15–30 seconds during active war use;
- tune empirically.

## FFScouter

- batch enemy IDs;
- respect service limits/caching;
- refresh less frequently than live status.

## War/chain

- central client cache;
- screens must not independently duplicate requests.

## Travel

- derive travel observations from the same roster/status polling where possible;
- avoid extra calls solely for travel tracking.

---

# 31. v0.1 scope

## Foundation

- React/TypeScript PWA;
- SCATHE visual identity;
- runtime API-key onboarding;
- current-user discovery;
- FFScouter registration flow;
- bottom navigation;
- central cache/state;
- loading/error/stale states.

## War

- current Ranked War;
- SCATHE/enemy score;
- target/lead information;
- chain where useful;
- top personalised candidates.

## Targets

- enemy roster;
- live status;
- free FFScouter public BS estimate;
- personalised FF;
- deterministic suitability;
- separate confidence;
- search;
- filters;
- sorts;
- intel drawer;
- Torn profile/attack deep links.

## Hospital

- hospital roster;
- countdowns;
- soonest-out sorting;
- local watch state.

## Travel

- inbound;
- outbound;
- abroad;
- status-transition observation;
- `plane_image_type` where available;
- public current-property evidence where available;
- Airstrip/Pilot supporting evidence;
- current Torn timing table/model;
- deterministic multi-signal travel-method inference;
- ETA windows widened or narrowed according to evidence confidence;
- explainable reasoning behind `ⓘ`;
- local contradiction/history evidence without making history a prerequisite.

## Team

- lightweight SCATHE roster/status view only;
- current status/location/last-action information where available without privileged faction API access;
- current war/chain context where useful;
- no live attack/revive/contribution analytics requirement.

## Quality

- phone-first layout;
- no normal horizontal scroll;
- graceful API failure;
- honest stale/unknown states;
- no premium dependency.

---

# 32. Explicitly deferred from v0.1

Do not allow these to delay first live-war usefulness:

- shared target reservations;
- faction-wide shared watchlists;
- server-side database;
- cloud accounts;
- leadership controls;
- Discord bot;
- push notifications;
- machine-learning combat prediction;
- complex adaptive target scores;
- native Android/iOS apps;
- automated combat;
- premium FFScouter features;
- long-term analytics;
- shared notes;
- exact opponent-BS reconstruction;
- privileged faction attack/revive feeds;
- leadership-granted faction API-access features;
- live per-member faction contribution analytics;
- Ranked War contribution/report analytics beyond the live war-board needs.

---

# 33. Technical stack

Keep the implementation conventional.

## Frontend

- React
- TypeScript
- Vite
- PWA support
- CSS variables/design tokens
- minimal dependency footprint

## Local persistence

- IndexedDB

## Hosting

- static hosting such as Cloudflare Pages

## Backend

None for v0.1.

A backend should only be introduced later if a clearly valuable shared feature requires it.

---

# 34. Suggested repository layout

```text
scathe-honjin/
├── docs/
│   ├── PROJECT-SOURCE.md
│   ├── DATA-SOURCES.md
│   ├── SECURITY.md
│   └── UX.md
├── public/
│   └── assets/
│       └── scathe-banner.jpg
├── src/
│   ├── api/
│   │   ├── torn/
│   │   └── ffscouter/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── onboarding/
│   │   ├── war/
│   │   ├── targets/
│   │   ├── hospital/
│   │   ├── travel/
│   │   └── team/
│   ├── intel/
│   ├── suitability/
│   ├── storage/
│   ├── security/
│   ├── types/
│   └── utils/
├── tests/
├── .gitignore
├── package.json
└── README.md
```

---

# 35. Git and secret policy

Use local Git from day one.

Do not create a remote repository during early development.

No real API key may ever be committed, even only locally.

Before first remote push:

1. inspect working tree;
2. inspect full Git history;
3. inspect production bundle;
4. inspect fixtures;
5. inspect logs;
6. inspect screenshots;
7. verify `.gitignore`;
8. run Gitleaks or TruffleHog;
9. rotate any key that was ever accidentally committed;
10. only then create/push the remote.

Deleting a secret from the current file does not remove it from Git history.

---

# 36. Development strategy and Codex use

Most v0.1 development should be manual/local.

Good manual candidates:

- scaffold;
- types;
- API wrappers;
- response normalisation;
- UI;
- styling;
- cards;
- tabs;
- filters;
- countdowns;
- IndexedDB;
- onboarding;
- PWA setup;
- deterministic unit tests;
- small fixes.

Reserve Codex for work where repo-wide reasoning genuinely helps:

- normalised domain-model review after API reconnaissance;
- cross-cutting personalised targeting integration;
- travel-state-machine review;
- larger refactors;
- polling/cache race conditions;
- repo-wide regression diagnosis;
- final architecture/security review.

HONJIN should remain substantially smaller and simpler than BugSlyce.

---

# 37. Work packages

## HONJIN-00 — Project/security baseline

Tasks:

- create local project;
- initialise local Git;
- no remote;
- create `.gitignore`;
- add this source file;
- add SCATHE banner/logo;
- establish TypeScript/build/test baseline;
- establish key-handling rules.

**Exit:** clean local repository with no credentials.

---

## HONJIN-01 — API reconnaissance

Using a dedicated temporary development key, verify:

- Torn current user identity and key-selection introspection;
- own battle stats;
- faction identity;
- current Ranked War discovery through the live war endpoint;
- enemy faction ID;
- enemy members;
- member status;
- hospital timestamps;
- travel descriptions;
- `plane_image_type` and exact current enum values;
- `/user/{id}/property` for another player and its required selection/access level;
- current property type/name for an opponent;
- visibility of `Airstrip` in property modifications;
- visibility of `Pilot` in property staff;
- whether property `used_by` is sufficient to treat the returned property as the opponent's current usable property context;
- live examples correlating `light_aircraft`, `airliner`, and `private_jet` with observed travel durations/methods;
- confirmation that Standard and Business Class remain indistinguishable from `airliner` alone;
- whether `private_jet` has one reliable travel-method meaning or remains ambiguous;
- whether property + aircraft-image evidence materially narrows ETA enough to justify HIGH/MEDIUM/LOW confidence labels;
- last action;
- chain data;
- exact minimum required custom-key selections for the war board;
- Torn custom-key creation-link possibilities;
- FFScouter key registration status;
- FFScouter registration flow;
- FFScouter free stats endpoint;
- public/free BSS estimate bucket;
- current-user FF output;
- confirmation that caller-specific FF is not reusable across faction members;
- confirmation that HONJIN can ignore premium, spy, merged-premium and flight features;
- browser CORS behaviour for every required provider endpoint;
- rate-limit/error responses.

HONJIN-01 must **not** make faction attack/revive endpoints a completion requirement. It should confirm that the complete core war board can operate without leadership-granted faction API access.

Save redacted fixtures only.

**Exit:** every required v0.1 war-board field and onboarding step maps to observed live behaviour or is explicitly unavailable, and no core requirement depends on faction-position API access.

---

## HONJIN-02 — Normalised domain model

Create typed internal models such as:

```text
CurrentUser
Player
PlayerStatus
BattleIntel
Suitability
Confidence
WarState
HospitalState
TravelObservation
TravelProfile
TeamStatus
ConnectionState
```

External API response shapes must not leak directly into UI components.

**Exit:** UI can consume HONJIN models rather than raw JSON.

---

## HONJIN-03 — Onboarding and connection flow

Build:

- welcome screen;
- Create Torn Key flow;
- paste/validate key;
- identity confirmation;
- faction confirmation;
- BS loading;
- FFScouter registration status check;
- compliant registration flow;
- connection-error states;
- session storage.

**Exit:** a non-technical SCATHE member can connect successfully without developer knowledge.

---

## HONJIN-04 — Mobile shell and design system

Build static/fake-data versions of:

- WAR;
- TARGETS;
- HOSPITAL;
- TRAVEL;
- TEAM;
- intel drawer.

Use real SCATHE branding.

**Exit:** all five screens are comfortable on phone and require no normal horizontal scroll.

---

## HONJIN-05 — Live War and Targets

Integrate:

- Torn roster/status;
- own BS;
- war state;
- FFScouter free public estimates;
- personalised FF;
- deterministic suitability;
- confidence;
- sorting/filtering;
- Torn deep links.

**Exit:** HONJIN produces a useful personalised target board immediately from live data.

---

## HONJIN-06 — Hospital

Implement:

- hospital roster;
- release countdowns;
- filters;
- soonest-out ordering;
- local watch state.

**Exit:** useful hospital opportunity view.

---

## HONJIN-07 — Travel engine

Implement:

- travel-state transition detection;
- route parsing;
- direction;
- `plane_image_type`;
- public opponent current-property lookup/cache;
- property type, Airstrip modification and Pilot supporting evidence;
- deterministic evidence-combination rules;
- explicit Standard/BCT ambiguity for `airliner`;
- conservative handling of `private_jet` until HONJIN-01 establishes its live mapping;
- departure observation windows;
- current travel-time table;
- ETA-window calculation;
- wider windows for conflicting/missing evidence;
- confidence labels derived from explicit rules rather than a hidden score;
- arrival observation;
- recording whether observed arrival supports or contradicts the original inference;
- local travel history as optional refinement only;
- `ⓘ` reasoning explaining which evidence caused the inference.

Example deterministic outputs:

```text
Likely Airstrip · High confidence
Airline travel · Standard/BCT unclear · Medium confidence
Private travel · exact method unclear · Medium confidence
Method unknown · broad ETA
```

**Exit:** useful free travel tracking without premium services, with every method/confidence label explainable from a small testable rule set and useful on first use without historical data.

---

## HONJIN-08 — Team/status polish

Keep TEAM lightweight and integrate only non-privileged information such as:

- SCATHE roster;
- member status;
- hospital/travel/location state;
- last action where available;
- current war/chain context where useful.

Do not introduce faction attack/revive permissions to satisfy this work package.

If field testing shows a Team field merely duplicates Torn without improving decision speed, remove that field rather than broadening permissions.

**Exit:** TEAM adds useful war-board context without privileged faction API access.

---

## HONJIN-09 — Live-war acceptance

Use HONJIN during a real SCATHE Ranked War.

Record:

- misleading suitability bands;
- stale estimates;
- incorrect/missing FF;
- onboarding friction;
- missing status changes;
- travel-estimation errors;
- polling issues;
- API usage;
- UI friction;
- excessive information;
- missing information;
- crashes/error states.

Do not silently retune the model during the war.

Collect evidence first, then adjust deliberately.

**Exit:** HONJIN has survived end-to-end live use and important defects are documented.

---

## HONJIN-10 — Remote publication gate

Only after local/live validation:

- full secret scan;
- history scan;
- production bundle inspection;
- dependency review;
- README;
- licence decision;
- public/private repository decision;
- remove temporary development artefacts;
- create remote;
- first push.

---

# 38. Testing philosophy

HONJIN should be easy to test because its reasoning is deliberately simple.

Example suitability tests:

```text
my BS = 10,000
enemy estimate = 4,000
→ HIT NOW
```

```text
my BS = 10,000
enemy estimate = 7,000
→ GOOD
```

```text
my BS = 10,000
enemy estimate = 11,500
→ RISKY
```

Availability remains separate:

```text
target status = Hospital
→ unavailable now
```

Confidence remains separate:

```text
fresh estimate
→ configured confidence
```

Personalisation test:

```text
same enemy estimate
user A BS = 20,000
→ HIT NOW

user B BS = 6,000
→ VIABLE/RISKY according to configured band
```

FF tests should confirm that values are associated with the current caller rather than reused globally.

Travel tests should use fixed timestamps and known timing tables. They must also cover independent evidence combinations: matching Airstrip + `light_aircraft`, missing property evidence, stale property evidence, `airliner` with unavoidable Standard/BCT ambiguity, `private_jet` with unresolved mapping, conflicting evidence, and an observed arrival that contradicts the initial inference.

Unit tests must not depend on live APIs.

---

# 39. v0.1 acceptance criteria

HONJIN v0.1 is complete only when all are demonstrated:

1. A non-technical user can create/connect an appropriately scoped Torn key.
2. Core onboarding does not require leadership-granted faction API access.
3. HONJIN validates and identifies the current user.
4. The current faction is discovered automatically.
5. Current user battle stats are loaded automatically.
6. FFScouter registration is handled clearly and consensually.
7. No key enters source control.
8. Current Ranked War and enemy faction are identified.
9. Enemy member state is live enough to be useful.
10. Free FFScouter public BSS estimates enrich the roster.
11. FF is relevant to the current user rather than another member and is never reused globally.
12. Suitability is deterministic and explainable.
13. Multiple targets may independently show `HIT NOW`.
14. Confidence is separate from suitability.
15. FF is presented as reward/context rather than a safety guarantee.
16. Provenance is available behind `ⓘ`.
17. Hospital timers are easy to scan.
18. Travel works without FFScouter Premium.
19. Travel uses ETA windows and honest uncertainty.
20. WAR/TARGETS function fully without faction attack/revive API access.
21. TEAM does not require privileged faction API access.
22. Relevant Torn target/profile navigation is one tap.
23. No normal screen requires horizontal scrolling.
24. API/rate-limit failures degrade gracefully.
25. Unknown/stale information is represented honestly.
26. No paid FFScouter entitlement is required.
27. HONJIN has been used in a real SCATHE Ranked War.
28. Live-war defects are recorded before v0.1 is considered stable.

---

# 40. Open questions to resolve empirically

Do not guess these during implementation:

- exact minimum Torn API selections;
- exact custom-key generation flow Torn currently supports;
- exact current member/travel response fields;
- exact opponent current-property response fields and custom-key selection behaviour;
- whether `Airstrip`, `Pilot`, and `used_by` are consistently visible for opponents through public access;
- whether `light_aircraft` consistently corresponds to Airstrip travel in observed live cases;
- the exact real-world mapping of `private_jet`;
- how often `airliner` represents Standard vs Business Class, while acknowledging the image cannot distinguish them;
- whether property + aircraft image narrows ETA sufficiently to justify HIGH/MEDIUM confidence;
- current authoritative Torn travel-duration table;
- best polling interval;
- exact FFScouter public-BSS response mapping;
- exact behaviour of current-user FF output;
- exact Torn selections, if any beyond HONJIN core needs, that FFScouter registration itself enforces;
- direct browser CORS behaviour for required Torn and FFScouter calls;
- initial suitability thresholds;
- freshness/confidence thresholds;
- whether FF remains on compact cards or eventually moves behind `ⓘ`;
- whether energy/life deserves WAR-screen space;
- whether level deserves compact-card space;
- whether WATCH needs more than local highlighting in v0.1;
- whether persistent key storage is worth enabling after review.

---

# 41. Product boundary

Use this test when considering a new feature:

> Does this help a SCATHE member make a faster, better-informed Ranked War decision on a phone?

If yes, evaluate it.

If it mainly:

- decorates;
- duplicates Torn without improving the decision flow;
- duplicates FFScouter without useful context;
- requires a paid dependency;
- introduces major backend/security complexity;
- creates opaque reasoning;

defer it unless field evidence proves the value.

For v0.1, also apply this hard boundary:

> If a proposed core feature requires leadership-granted Torn faction API access, it is out of scope unless the source of truth is deliberately changed.

The war board must remain usable by an ordinary SCATHE member without faction-position API privileges.

---

# 42. Current external references

Checked when finalising this plan on 20 September 2026:

- Torn API v2 Swagger: https://www.torn.com/swagger.php
- FFScouter API documentation: https://ffscouter.com/api-docs
- FFScouter API-key safety guide: https://ffscouter.com/guides/api-keys
- FFScouter website/data policy: https://ffscouter.com/

External APIs and game mechanics can change.

At project start, Torn Swagger documents `/user/{id}/property` as public-access; the public property schema includes property identity, modifications such as `Airstrip`, and staff such as `Pilot`. Torn Swagger also documents `plane_image_type` values `light_aircraft`, `airliner`, and `private_jet`. Torn's API maintainer has stated that Business Class intentionally uses the same image as Standard travel, so aircraft-image data alone cannot distinguish those two methods.

Implementation must still verify current schemas and observed live behaviour during HONJIN-01 rather than treating this planning document as an immutable external API contract.

---

# 43. Final identity

SCATHE HONJIN is:

> **A free-dependency, mobile-first, personalised Ranked War decision interface for SCATHE.**

Its defining characteristics are:

- SCATHE-branded;
- phone-first;
- personalised to each connected faction member;
- simple onboarding for non-technical users;
- free FFScouter public battle-stat intelligence;
- current-user-specific FF context;
- deterministic target classification;
- separate confidence and reward context;
- hospital opportunity tracking;
- HONJIN-owned approximate travel tracking;
- current-war state and actionable opponent awareness;
- detailed evidence available without screen clutter;
- no HONJIN backend storing Torn keys;
- no premium dependency;
- no leadership-granted faction API-access dependency;
- no opaque reasoning engine;
- immediately useful on first use.
