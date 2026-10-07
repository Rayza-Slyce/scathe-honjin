# SCATHE HONJIN — COMPLETE PROJECT SOURCE OF TRUTH

**Status:** Live production; real Ranked War field acceptance in progress
**Version:** v0.1 source of truth — updated-7
**Date:** 20 September 2026
**Last implementation checkpoint:** 7 October 2026
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

Desktop compatibility is also a v0.1 requirement. Mobile remains the baseline
for information architecture and interaction design, but responsive desktop
support should be maintained continuously as screens are implemented rather
than retrofitted after the mobile UI is complete.

Wider layouts may use additional horizontal space where it improves decision
speed, such as side-by-side lists and detail panels, but must not become a
separate product or require different application logic.

Normal use must not require horizontal scrolling at supported phone or desktop
widths.

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

HONJIN uses two supplied SCATHE visual assets:

- the existing SCATHE faction banner/logo for faction recognition,
  especially during onboarding;
- the HONJIN circular emblem as the application's primary icon identity.

Canonical HONJIN emblem source:

`design/brand/scathe-honjin-emblem-source.png`

Visual language:

- near-black / charcoal backgrounds;
- SCATHE red as the primary action and identity colour;
- metallic grey / distressed steel for borders and structural accents;
- off-white / silver typography;
- restrained carbon, stone or worn-metal texture where readability permits;
- green for favourable/available;
- amber for uncertainty/risk;
- red for hospital/danger;
- cyan/blue for travel;
- compact high-contrast game-HUD presentation.

The banner should remain recognisable without consuming excessive vertical space.

HONJIN now implements the visual system through shared semantic CSS tokens.
The accepted presentation provides:

- a restrained graphite/gunmetal dark theme as the default;
- a light theme using cool grey/steel surfaces rather than generic white SaaS
  styling;
- shared component geometry and semantics across both themes rather than
  duplicated light/dark components;
- stronger but restrained material depth through raised cards, recessed
  controls and clearly elevated drawers/navigation;
- a compact persisted dark/light toggle in the app header;
- SCATHE red retained as an accent/action colour rather than a page-wide wash.

The circular HONJIN emblem is the source for browser favicon, installed-PWA
icon and maskable app icon. Small-icon derivatives may simplify fine texture
while preserving the red central mark, dark field and metallic ring.

---

# 4. Primary navigation

Persistent bottom navigation contains exactly five destinations:

1. **WAR**
2. **TARGETS**
3. **HOSPITAL**
4. **TRAVEL**
5. **TEAM**

Player-specific intelligence opens contextually via `ⓘ` or a player detail drawer.

`TARGETS` contains two internal operating modes:

1. **WAR TARGETS**
2. **SPY ROOM**

This preserves the five-destination mobile navigation while keeping
reconnaissance useful outside an active Ranked War.

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

HONJIN v0.1 supports both session-only and persistent device storage.

During onboarding offer:

```text
☐ Remember this device
```

with clear text:

```text
Keeps your read-only Torn key in this browser so HONJIN is ready next time.
Do not enable this on a shared device.
```

If selected, HONJIN stores the key persistently in this browser using
`localStorage`. If not selected, the key remains in `sessionStorage` only.

Persistent storage must require an explicit user choice.

HONJIN must provide a clear disconnect/forget action that removes the Torn key
from both session and persistent browser storage.

This is an explicit v0.1 product/security decision: persistent browser storage
improves live-war usability on a trusted personal device, while accepting the
increased exposure window inherent in browser persistence.

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

> Who can I hit, and who do I want intelligence on?

TARGETS contains two modes:

`WAR TARGETS | SPY ROOM`

## 8.1 WAR TARGETS

WAR TARGETS is the personalised roster for the current Ranked War enemy.

When there is no active Ranked War, show that clearly and provide immediate
access to SPY ROOM rather than leaving the screen as a dead end.

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

Player level should be visible on player cards wherever Torn provides it. Keep
it small and secondary to estimated BS, FF, suitability and live status; level
must not dominate the card or become an input to suitability/recommendation
classification merely because it is displayed.

## 8.2 SPY ROOM

SPY ROOM provides reconnaissance outside the current Ranked War.

It contains two workspaces:

`INDIVIDUAL | FACTION`

### Individual recon

The user may maintain a persistent shortlist of up to **10 players**.

The shortlist remains until the user explicitly removes a player.

Each player should expose, where available:

- Torn player name and ID;
- Torn level as compact secondary context;
- FFScouter free/public estimated battle stats;
- caller-specific Fair Fight for the current HONJIN user;
- current Torn status;
- hospital state and release time;
- travelling / abroad state;
- last-action evidence;
- deterministic suitability;
- confidence;
- `ⓘ` reasoning/provenance;
- Torn profile/attack deep links.

Individual recon is not restricted to the current Ranked War enemy faction.

Only player identity/preferences should persist locally.

Live status, hospital state, travel state, estimated BS and FF must refresh
under HONJIN freshness rules and must never be presented as current merely
because an older local value exists.

### Faction recon

The user may select **one faction at a time** for reconnaissance.

HONJIN should display that faction's member roster with, where available:

- player name and ID;
- Torn level as compact secondary context;
- FFScouter free/public estimated battle stats;
- caller-specific Fair Fight;
- current status;
- hospital state/countdown;
- travelling / abroad state;
- last action;
- deterministic suitability;
- confidence;
- player-detail/provenance access.

Faction recon works independently of whether SCATHE currently has an active
Ranked War.

Selecting another faction replaces the current faction-recon workspace.

HONJIN v0.1 does not maintain multiple simultaneous faction-recon workspaces.

Persist only the selected faction identity/preferences needed to restore the
workspace. Live roster/status/intelligence must refresh and obey normal
freshness/staleness rules.

### Spy Room lookup and search

Spy Room lookup must be designed for humans rather than requiring Torn IDs.

Both individual-player recon and faction recon must accept:

- a Torn player/faction **name**;
- a direct Torn player/faction **ID**.

Name search is the normal user-facing workflow. Direct IDs remain supported as
the exact fallback and may also be pasted directly into the same search field.

HONJIN should use Torn API v2 search capabilities where available:

- `/user/search` for player discovery;
- `/faction/search` for faction discovery.

Search results must show enough identity information to avoid silent
misidentification. At minimum:

- player/faction name;
- Torn ID;
- faction context for player results where available.

If a name produces multiple plausible matches, HONJIN must show the matches and
let the user choose. It must not silently guess which player or faction was
intended.

A successful search resolves to the canonical Torn ID. Subsequent recon,
persistence, caching and deduplication should use that ID internally rather
than treating a mutable display name as the primary identifier.

Search requests are explicit user-triggered work and therefore receive the
scheduler priority already defined for explicit user actions. Search must not
fire uncontrolled API requests for every keystroke; use submit/search actions
or suitable debouncing.

SPY ROOM must respect all existing intelligence rules:

- FFScouter free/public BSS only;
- caller-specific FF only;
- no reuse of one member's FF for another HONJIN user;
- no premium FFScouter dependency;
- no leadership-granted faction API requirement;
- deterministic/explainable suitability;
- honest stale/unknown states.

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

## 9.1 Personalised strength fit

Combat suitability and WAR recommendation priority are separate concepts.

Suitability answers:

> How does this enemy's estimated battle strength compare with mine?

Strength fit answers:

> Is this an appropriate use of this particular SCATHE member's strength?

A very weak opponent may therefore have a highly favourable suitability
classification while still being deprioritised on a strong member's WAR
shortlist.

Initial strength-fit bands:

- enemy <= 25% of my BS: UNDERMATCHED / FALLBACK
- enemy > 25% and <= 50%: USEFUL MATCH / LARGER MARGIN
- enemy > 50% and <= 75%: USEFUL MATCH / SMALLER MARGIN
- enemy > 75% and <= 100%: CLOSE MATCH / MANUAL CONSIDERATION
- enemy > 100%: ABOVE OWN ESTIMATED STRENGTH

These are starting policy hypotheses, not statements of Torn combat truth.

For the initial WAR recommendation policy:

1. >25% to <=50% is the first-preference strength-fit group;
2. >50% to <=75% is the second-preference group;
3. <=25% remains available as a lower-strength fallback;
4. >75% remains visible in TARGETS but is not automatically promoted into
   the default WAR shortlist initially.

This allows the same enemy to be:

- an undermatched fallback for a very strong SCATHE member;
- a useful preferred target for a medium-strength member;
- risky or avoidable for a weaker member.

Torn level must not substitute for estimated battle strength in this model.

The existing suitability labels remain separate and continue to use the
centralised BS-ratio thresholds.

HIT NOW is therefore a suitability classification, not proof of current
availability and not an instruction that the target must occupy a WAR
recommendation slot.

## 9.2 Current-user adjusted battle strength

HONJIN should distinguish the logged-in user's underlying battle stats from
their currently modified combat stats.

The current-user model should preserve:

- base Strength;
- base Defense;
- base Speed;
- base Dexterity;
- base total BS;
- the current Torn-reported modifier state for each stat;
- modifier evidence/details where Torn supplies them;
- an adjusted/current value for each stat;
- adjusted/current total BS;
- the observation time for the modifier state.

The permanent/base values must not be overwritten by temporary effects.

Examples of effects that may alter the current-user combat state include:

- drug effects such as Xanax or Vicodin;
- battle-stat merits;
- faction, education or company effects where represented by Torn;
- other positive or negative modifiers reported by Torn.

HONJIN should prefer Torn's own current modifier representation rather than
reconstructing or stacking known effects independently.

This avoids:

- double-counting modifiers;
- assuming all modifiers affect all four stats equally;
- reproducing Torn's stacking rules incorrectly;
- maintaining a separate hard-coded catalogue when Torn already reports the
  effective modifier state.

Before implementing adjusted-stat arithmetic, HONJIN must empirically verify
the semantics of Torn v2 battlestats `value`, aggregate `modifier` and modifier
detail fields using a real authenticated response.

No real Torn API key may be placed into source, tests, terminal history, logs,
screenshots or fixtures for this verification.

### Current-user modifier semantics — verified implementation checkpoint

On 27 September 2026 HONJIN verified the current-user Torn v2 battlestats
response against a real authenticated session without exposing the API key.

In the observed response:

- the four per-stat `value` fields summed exactly to Torn's reported total BS;
- Torn exposed an aggregate modifier independently for each stat;
- modifier detail entries exposed the contributing effect/type/value evidence;
- the observed `+6` merits and `-25` drug effects produced Torn's aggregate
  `-19` modifier for each affected stat.

HONJIN therefore derives the current effective value of each stat from Torn's
reported per-stat `value` and aggregate percentage modifier rather than
reconstructing drug/merit stacking independently. Base values remain preserved
separately.

Fresh authoritative current-user modifier data is now used for HONJIN's own
personalised BS-ratio suitability and strength-fit/recommendation reasoning.
The central deterministic suitability thresholds themselves are unchanged.

If the modifier snapshot is missing, invalid or stale, HONJIN explicitly falls
back to the known base total BS rather than continuing to classify from stale
temporary combat state.

FFScouter Fair Fight remains the caller-specific value supplied by FFScouter.
HONJIN does not manufacture a replacement FF value from modified BS.

Personalised WAR recommendation ratios now use the current user's
adjusted/current BS when authoritative modifier evidence is fresh, with an
explicit fallback to unmodified base total BS when that evidence is unusable.

The UI should retain the base value as the stable account statistic and may
show a compact current/adjusted value when materially different.

Example presentation:

- `BS 1.00m`
- `ADJ 650k · MODIFIED`

The exact copy is a UI decision, but base and adjusted values must remain
conceptually distinct.

The recommendation explanation should state when the user's current modifiers
were included.

HONJIN cannot normally observe the opponent's private temporary modifier state.
Opponent battle-stat intelligence therefore remains an estimate with unknown
current opponent modifiers.

The explainability layer must make this asymmetry clear:

- current-user modifiers: included when authoritative data is available;
- opponent temporary modifiers: unknown unless legitimately available from an
  allowed public source.

If current-user modifier information is missing, stale or not yet validated,
HONJIN must fall back explicitly to the known base BS rather than silently
inventing an adjusted value.

## 9.3 Opponent current-health intelligence

HONJIN should expose an opponent's current life/health when Torn makes that
information legitimately available through the public/current roster data.

Represent opponent health separately from battle-stat suitability.

The health model should preserve:

- current life;
- maximum life;
- derived current-life percentage;
- observation/fetch time;
- whether the observation is fresh enough to present as current.

Example:

`HP 620 / 4,500 · 14%`

Current health is an opportunity signal, not battle-stat evidence.

A low-health opponent must not:

- receive a lower estimated BS;
- move into a safer suitability class;
- bypass confidence requirements;
- bypass strength-fit requirements;
- become recommended solely because their health is low.

When candidates are otherwise genuinely comparable, fresher low-health
information may be used as a secondary opportunity-ordering signal.

The initial intended recommendation precedence is conceptually:

1. current availability;
2. usable battle-stat intelligence;
3. personalised strength-fit priority;
4. intelligence confidence;
5. documented narrow comparability bucket;
6. current-health opportunity, when fresh;
7. stable current-user-specific diversification;
8. player-ID collision fallback.

Exact comparator placement should remain testable and may be tuned from
live-war evidence.

Health must not be treated as current indefinitely.

If the health observation exceeds its accepted freshness window, HONJIN should
either mark it stale or stop using it as a recommendation-ordering signal.

HONJIN should prefer roster-level health data when Torn supplies it rather than
issuing one profile request per enemy player.

Before HONJIN-05 live wiring, empirically verify the current Torn v2
`/faction/{id}/members` health shape and confirm whether `life.current` and
`life.maximum` remain available for enemy-faction members.

If roster-level health is unavailable in practice, HONJIN must not fall back
to continuous per-player health polling that would compromise the central Torn
request budget. Target-specific/profile lookup may be used only when justified
by explicit user action or scheduler capacity.

The compact target UI may show current HP or HP percentage when fresh. When HP
is displayed, keep the `HP` label and its numeric value visually grouped rather
than placing the label on one side of the card and the value at the opposite
edge. The metric should read as one compact piece of evidence.

Low HP should be visually useful without implying guaranteed combat safety.

## 9.4 Personalised WAR recommendation policy

WAR should display up to three currently actionable personalised target
recommendations.

Do not manufacture three recommendations when fewer than three candidates have
sufficient availability and intelligence evidence.

The recommendation pipeline must be deterministic and explainable:

1. start from the current Ranked War enemy roster;
2. join current Torn status and free/public FFScouter intelligence by player ID;
3. exclude opponents whose latest sufficiently fresh authoritative status is
   Hospital, Travelling, Abroad or otherwise not currently attackable;
4. require a valid current-user BS and valid opponent estimated BS;
5. calculate suitability and strength fit separately;
6. require usable recommendation intelligence initially at MEDIUM or HIGH
   confidence;
7. place candidates into explicit strength-fit priority groups;
8. order only within those groups using documented deterministic rules;
9. select up to three.

Initial priority groups:

1. useful match / larger estimated margin (>25% to <=50%)
2. useful match / smaller estimated margin (>50% to <=75%)
3. undermatched fallback (>0% to <=25%)

Within one priority group:

- prefer stronger confidence before weaker confidence;
- compare candidates using a narrow, fixed ratio bucket;
- candidates in the same confidence and ratio bucket may use a stable
  current-user-specific tie breaker derived only from
  (currentUserId, enemyPlayerId);
- use enemy player ID as the final deterministic collision fallback.

The user-specific tie breaker exists only to reduce identical ordering of
already comparable candidates between SCATHE members.

It does not allocate or reserve targets and does not guarantee that two users
will receive different or disjoint shortlists. Similar-strength users may
legitimately receive overlapping or identical recommendations when the
qualified candidate pool is small.

It must never allow a worse strength-fit group, weaker confidence group,
unavailable target or materially different risk class to outrank a better one.

Do not use:

- API-key material;
- player names;
- roster position;
- current time;
- random values

for recommendation diversification.

The shortlist must remain stable while its evidence remains unchanged.
HONJIN must not rotate targets merely to create visual variety.

When a newer authoritative roster/status observation makes a displayed target
unavailable:

1. reassess the roster;
2. remove the newly ineligible target;
3. promote the next qualified candidate in deterministic order.

Do not infer renewed availability merely because a hospital countdown or
estimated travel ETA expires. Promotion requires a newer authoritative Torn
status observation.

WAR recommendations must also be recomputed when materially relevant evidence
changes, including:

- own battle stats;
- opponent battle-stat intelligence;
- confidence/freshness state;
- authoritative availability.

Fair Fight remains visible as current-user-specific reward/context.

For the initial default WAR recommendation policy, FF does not alter
eligibility or automatic recommendation ordering.

TARGETS retains explicit reward-oriented sorting such as Highest FF so the
human user can deliberately choose a more rewarding alternative.

The full enemy roster must remain available in TARGETS even when an opponent
does not qualify for the automatic WAR shortlist.

Useful compact recommendation explanations include:

- GOOD FIT;
- LOWER-STRENGTH OPTION;
- LIMITED INTEL.

Avoid wording such as SAFE HIT or BEST FIT because HONJIN cannot establish
certainty or a mathematically optimal target from estimated intelligence.

Where space permits, a direct explanation such as:

Est. 42% of your BS

is preferable to adding several unexplained badges.

The info reasoning view should explain why a recommendation appears, including:

- enemy estimated BS;
- current user's BS;
- calculated ratio;
- suitability;
- strength-fit group;
- confidence;
- source evidence age;
- latest authoritative availability observation;
- whether the target is being shown as a fallback.

Recommendation logic must remain outside React rendering code and must be
implemented as small pure/testable functions.

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

Lower estimated BS remains available as an explicit TARGETS sort, but the default personalised WAR shortlist must use the strength-fit recommendation policy rather than weakest-first ordering.

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

### Accepted player-detail interaction checkpoint

The shared player-detail interaction is implemented across the operational
player surfaces.

Accepted behaviour includes:

- player identity is tappable from WAR/WAR TARGETS, individual and faction
  Spy Room, HOSPITAL, TRAVEL and TEAM;
- the existing shared intel drawer is reused rather than creating separate
  page-specific detail systems;
- Torn player IDs are omitted from compact operational player lists and remain
  available on demand inside player detail;
- level remains visible in compact operational presentation where available;
- dedicated actions such as ATTACK, REMOVE and refresh controls remain
  independent from the player-detail trigger.

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

HOSPITAL may aggregate tracked opponents from:

- the current Ranked War enemy roster;
- saved individual Spy Room recon;
- the one saved faction Spy Room workspace.

Deduplicate a player appearing through more than one source. Preserve provenance
so the UI can distinguish current-war targets from non-war reconnaissance.

During an active Ranked War, expose a **WAR TARGETS ONLY** control and default it
to **on**. This prevents non-war Spy Room targets from becoming accidental
wartime attack opportunities. If the user explicitly disables the control,
non-war targets may appear but the user-facing provenance label should simply be
`NON-WAR`. Do not clutter compact cards with internal source labels such as
`SPY FACTION` or `SPY INDIVIDUAL`; HONJIN may retain that provenance internally
for deduplication, reasoning and refresh decisions.

A newly detected Ranked War starts from the safe WAR-only default rather than
carrying a previous include-non-war preference into the new war.

When there is no active Ranked War, the WAR-only control should be hidden or
inactive and HOSPITAL may show all relevant tracked hospital targets.

Default sort:

**Soonest release first**

Hospital cards should retain useful combat context rather than becoming
countdown-only rows. Where available show, compactly:

- player level;
- estimated BS;
- caller-specific FF;
- suitability/confidence where already available;
- hospital release countdown;
- `NON-WAR` when the player is not part of the current Ranked War.

Example:

```text
Old_Nick [123456] · Lvl 52        ⓘ
Est. BS 4.74k · FF 2.11 for you
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

An expired local countdown does not prove that a player is attackable. Until a
fresh authoritative Torn status confirms the transition, show an honest
refresh-pending/stale state rather than manufacturing availability.

v0.1 WATCH may simply highlight/store a target locally in IndexedDB.

Push notifications are later scope.

---

# 16. TRAVEL screen

HONJIN implements its own free approximate travel tracker using Torn state.

TRAVEL may aggregate tracked opponents from:

- the current Ranked War enemy roster;
- saved individual Spy Room recon;
- the one saved faction Spy Room workspace.

Deduplicate players across those sources. During an active Ranked War, expose a
**WAR TARGETS ONLY** control and default it to **on**. Explicitly included Spy
Room targets must be labelled simply `NON-WAR`; do not expose internal source
labels such as `SPY FACTION` on compact cards. A newly detected war starts from
the safe WAR-only default. Outside an active war, the control should be hidden
or inactive.

Travel cards should retain the same compact combat context as the other target
surfaces. Where available show player level, estimated BS, caller-specific FF,
and suitability/confidence alongside route, travel state, method evidence and
ETA/ETA-unavailable state. Travel should not make the user leave the screen just
to remember whether a travelling opponent is an appropriate target.

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
airstrip_present
property_evidence_checked_at
```

Current Torn API v2 exposes another player's current property through `/user/{id}/property` with public access. HONJIN uses public property type/name and modifications such as `Airstrip` as travel evidence. Opponent staff is intentionally discarded from travel inference because live public responses have not established it as a reliable discriminator.

For a current travelling target, a `light_aircraft` image combined with a fresh current `Private Island` property and an `Airstrip` modification is sufficient for HONJIN to treat the flight as Airstrip travel with HIGH method confidence. Property evidence alone does not identify the current flight method.

When arrival is observed:

```text
first_seen_arrived
observed_duration_window
```

Take-off time is known only to within the observation interval. If HONJIN
observes a player on the ground/abroad and then observes that player travelling,
the two observation timestamps form a departure window.

If HONJIN first observes a target already travelling, it has no valid departure
window. Method evidence may still be useful, but HONJIN must not reverse-engineer
or invent a take-off time merely to produce an ETA.

If HONJIN was not observing continuously and the previous non-travelling
observation is separated from the first travelling observation by a broad gap,
that gap is evidence only of an uncertain transition window. It must not be
presented as elapsed flight time.

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
+ current property = Private Island
+ current property has Airstrip
    → Likely Airstrip · HIGH method confidence
```

The confidence becomes lower if the property evidence is stale, the current property is not confirmed as a Private Island, or live observations contradict the expected Airstrip duration.

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
Observed departure window: 14:20–14:40

Inference: Airstrip likely
Confidence: HIGH
```

Property type is never treated as proof of the current flight method by itself, and `plane_image_type` is never treated as an authoritative `travel_type`. The high-confidence Airstrip rule requires the independent combination of current travelling `light_aircraft` plus fresh Private Island + Airstrip property evidence. This means Airstrip travel, not automatically WLT/`Private`; `private_jet` remains a distinct aircraft observation.

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

No ETA is a normal first-class state, not an error. In particular:

```text
Observed departure window
    → calculate an ETA window when the route/method evidence makes it useful.

Broad offline/observation gap
    → calculate only if the resulting window remains decision-useful; otherwise
      show ETA unavailable/uncertain because timing evidence is too broad.

First observation already airborne
    → show ETA unavailable · take-off not observed.
```

The compact card must not display a previous non-travelling timestamp and first
travelling timestamp in a way that can be mistaken for time already spent in
flight. Detailed timestamps may appear behind `ⓘ` with explicit wording that
HONJIN did not continuously observe the transition.

Travel-method confidence and ETA/timing confidence are independent. HONJIN may
legitimately show, for example:

```text
Likely Airstrip · HIGH method confidence
ETA unavailable · take-off not observed
```

Missing timing evidence must not force a false low-confidence method label, and
strong method evidence must not be used to invent timing evidence.

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

For opponent travel inference, `/user/{id}/property` is currently documented as public-access and returns the opponent's current property. HONJIN relies on current property identity and the `Airstrip` modification when available. Opponent staff is intentionally discarded from travel inference and must not appear in travel reasoning UI.

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

HONJIN supports two browser-storage modes:

```text
Session only         → sessionStorage
Remember this device → localStorage
```

Persistent storage is allowed only after the user explicitly chooses
`Remember this device`.

A disconnect/forget action must clear the key from both locations.

The persistent option is intended for a trusted personal device so HONJIN can
be reopened during a Ranked War without requiring the user to retrieve and
paste the Torn key again.

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

Use IndexedDB for non-secret application state.

v0.1 policy:

```text
API key, session mode     → sessionStorage
API key, remembered mode  → localStorage
travel history            → IndexedDB
watch state               → IndexedDB
spy player IDs            → IndexedDB
spy faction ID            → IndexedDB
preferences               → IndexedDB
```

Persistent Torn-key storage is permitted only after the user explicitly selects
`Remember this device`.

Clearing/disconnecting HONJIN must remove both session and persistent copies.

---

# 30. Polling and caching

Avoid uncontrolled per-player Torn polling from the browser/current-user API path. Browser features must share the central request scheduler/cache described below rather than creating independent polling loops.

This rule does not prohibit the accepted HONJIN shared backend from polling explicitly registered individual Spy targets. Those server-side individual watches use the dedicated HONJIN service key, are centrally deduplicated, lease-bounded, and share the backend's rolling 50-Torn-request-per-60-second collector budget with faction jobs.

## Request budget and scheduling

HONJIN must use one central request scheduler/cache rather than allowing screens
or features to poll independently.

The current Torn user-level allowance is 100 requests per minute across that
user's API activity. HONJIN must not assume that it owns the full allowance
because the same Torn user may also be running TornTools, browser scripts or
other API consumers.

For v0.1, HONJIN should therefore use an initial **soft Torn budget of no more
than 40 requests per minute** during normal operation.

This is a conservative HONJIN budget, not a claim that Torn's external limit is
40 requests per minute. It must remain centralised/configurable and may be tuned
after live-war evidence.

Request priority, highest first:

1. active Ranked War roster/status required for immediate combat decisions;
2. explicit user-triggered requests and the currently visible workspace;
3. visible SPY ROOM intelligence;
4. hidden/background SPY ROOM refresh;
5. optional enrichment such as opponent property evidence.

### Foreground automatic refresh

Manual refresh is a fallback/override, not the normal mechanism for keeping
visible combat intelligence current.

While HONJIN is open in the foreground and the document is visible, live
intelligence used by the active screen must refresh automatically through the
central scheduler. The scheduler should aim to refresh evidence before its
normal freshness window expires where provider limits and the HONJIN request
budget allow. A visible card should not routinely become stale after tens of
seconds and remain stale indefinitely until the user presses a refresh button.

Active-war roster/status remains highest priority. The currently visible
workspace comes next. Saved Spy Room/Hospital/Travel identities may receive
lower-priority foreground refresh so switching between screens does not
immediately reveal avoidably stale intelligence, but this must still use the
shared scheduler/cache/dedup path rather than independent per-screen polling
loops.

Individual requests that cannot be batched must be staggered/deduplicated under
the same budget; do not burst ten saved Spy players simultaneously merely to
satisfy a timer. If the scheduler cannot refresh evidence before expiry because
of provider limits, contention or errors, show `STALE` / `REFRESH DELAYED`
honestly rather than pretending the observation is current.

When the app/document is hidden or backgrounded, lower-priority refresh may be
slowed or paused. When the browser/PWA is fully closed, HONJIN does not poll.
Returning to the foreground should trigger an immediate priority-aware refresh
of relevant live intelligence.

The exact automatic-refresh cadence remains centralised/configurable and should
be tuned from field evidence. It must be chosen relative to the accepted
freshness windows rather than as an unrelated hard-coded UI timer.

When the soft budget is under pressure, or Torn returns a rate-limit response:

- preserve active-war refresh first;
- defer or pause lower-priority background work;
- never discard saved Spy Room identities merely because live refresh is paused;
- show stale/refresh-delayed state honestly;
- resume deferred work automatically when capacity returns;
- respect provider retry guidance where supplied.

SPY ROOM remains usable during an active Ranked War.

An unrelated faction-recon workspace may have its **background refresh paused or
slowed** while war data has priority, but the workspace itself must not be
disabled solely because a war is active. If the user opens that Spy Room
workspace, it becomes foreground work and receives request priority within the
central budget.

Persisted recon identity is separate from live polling:

- up to 10 saved individual Spy Room players do not imply 10 continuously
  running polling loops;
- one saved faction-recon identity does not imply permanent faction polling;
- hidden workspaces may retain their last snapshot with an honest stale marker;
- returning to a workspace should refresh it according to scheduler priority
  and freshness rules.

Deduplicate player IDs across WAR TARGETS, individual Spy Room recon and faction
Spy Room recon. Reuse compatible roster/status/intelligence responses across
screens rather than requesting the same evidence independently.

Faction member/status endpoints should be used as roster-level requests where
the current Torn API provides the required information in one response. Do not
turn a 70-member faction into 70 Torn requests merely because 70 cards are
displayed.

Arbitrary individual-player lookups may require per-player Torn requests where
no suitable batch/roster response exists. Such requests must be cached,
deduplicated and scheduled rather than fired as an uncontrolled burst.

FFScouter player-stat intelligence must be batched. As verified during current
development, `get-stats` accepts up to 205 player IDs in one request. HONJIN
should combine and deduplicate required player IDs where practical rather than
issuing one FFScouter request per player.

External provider limits and batch sizes are not immutable product constants.
The API clients must handle changed limits and HTTP 429 responses gracefully.

Saving more recon identities therefore affects potential refresh workload, not
the amount of identity state HONJIN may retain.

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

- WAR TARGETS and SPY ROOM modes;
- current-war enemy roster;
- live status;
- free FFScouter public BS estimate;
- personalised caller-specific FF;
- deterministic suitability;
- separate confidence;
- search;
- filters;
- sorts;
- intel drawer;
- Torn profile navigation; ATTACK opens the player's Torn profile so Torn's own attack control can be used reliably;
- persistent individual Spy Room shortlist of up to 10 players;
- one active faction-recon workspace at a time;
- arbitrary-player/faction recon independent of an active Ranked War;
- local persistence of recon identities/preferences only;
- live Spy Room intelligence refreshed under normal freshness rules.

## Hospital

- hospital roster aggregated from current-war and saved Spy Room identities;
- player deduplication with source provenance;
- active-war `WAR TARGETS ONLY` safety control defaulting on;
- countdowns;
- soonest-out sorting;
- local IndexedDB watch state;
- stale/expired countdowns never treated as authoritative availability.

## Travel

- inbound;
- outbound;
- abroad;
- current-war plus saved Spy Room tracked-opponent aggregation;
- player deduplication with source provenance;
- active-war `WAR TARGETS ONLY` safety control defaulting on;
- status-transition observation;
- `plane_image_type` where available;
- public current-property evidence where available;
- Private Island + Airstrip supporting evidence;
- current Torn timing table/model;
- deterministic multi-signal travel-method inference;
- observed departure windows only when HONJIN has genuine before/after evidence;
- no fabricated take-off time for a player first observed already airborne;
- ETA unavailable/uncertain as a normal state when timing evidence is absent or too broad;
- method confidence kept separate from ETA/timing confidence;
- ETA windows widened or narrowed according to actual timing/method evidence;
- explainable reasoning behind `ⓘ`, including why an ETA cannot be produced;
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
├── design/
│   └── brand/
│       └── scathe-honjin-emblem-source.png
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
- browser key storage with explicit `Remember this device` persistence.

**Exit:** a non-technical SCATHE member can connect successfully without developer knowledge.

---

## HONJIN-04 — Mobile shell and design system

### HONJIN-04 accepted implementation checkpoint

**Status:** ACCEPTED on 24 September 2026.

HONJIN-04 establishes the accepted static/mobile interaction and visual
contract that HONJIN-05 should populate with live data rather than redesign.

Accepted behaviour includes:

- mobile-first portrait UI with deliberate wider-screen behaviour;
- persistent five-destination navigation:
  - WAR;
  - TARGETS;
  - HOSPITAL;
  - TRAVEL;
  - TEAM;
- TARGETS contains:
  - WAR TARGETS;
  - SPY ROOM;
- SPY ROOM contains:
  - INDIVIDUAL recon;
  - FACTION recon;
- individual Spy Room supports the intended persistent shortlist concept of up
  to 10 players;
- faction Spy Room represents one selected faction workspace at a time;
- player and faction recon search are designed around human-facing name search
  with exact Torn ID as an explicit fallback;
- WAR presents a compact personalised top-target surface;
- WAR recommendations are conceptually a rolling actionable shortlist rather
  than fixed player slots;
- unavailable opponents must not occupy immediate WAR recommendation slots;
- when an authoritative status update removes a displayed target from
  eligibility, the next qualified candidate should replace it;
- TARGETS retains the full enemy roster even when WAR shows only a small
  personalised shortlist;
- WAR TARGETS static availability filters are interactive;
- Hospital opportunity-window filters are interactive;
- Travel Incoming / Outbound / Abroad filters are interactive;
- TARGETS static sort control demonstrates:
  - Best for me;
  - Lowest BS;
  - Highest FF;
- unavailable targets do not expose an active ATTACK action;
- suitability is labelled explicitly rather than relying only on colour;
- compact recommendation context can distinguish GOOD FIT from a
  LOWER-STRENGTH OPTION;
- current opponent HP/life has an accepted display position as a separate
  opportunity signal;
- opponent HP must not alter estimated BS or suitability;
- target cards preserve separate estimated BS, caller-specific FF, suitability,
  confidence, status, health and attack action;
- travel cards expose method, confidence and ETA separately;
- Travel `WHY THIS ESTIMATE` demonstrates an evidence-chain explanation rather
  than a generic information drawer;
- explainability remains available behind contextual info controls without
  crowding the primary action surface;
- TEAM remains lightweight and non-privileged;
- no normal mobile screen requires horizontal page scrolling in the accepted
  visual test;
- the accepted shell remains usable on phone and desktop.

The accepted target-recommendation architecture separates:

- availability;
- suitability;
- personalised strength fit;
- intelligence confidence;
- intelligence freshness;
- Fair Fight/reward context;
- current-health opportunity;
- travel/location state;
- recommendation decision.

HONJIN-04 also establishes the following recommendation principles:

- weakest-first is not the default personalised WAR policy;
- very weak opponents remain valid fallbacks rather than being hidden;
- stronger members should preferentially receive appropriate stronger
  opponents when sufficiently favourable candidates exist;
- weaker members may receive those same lower-strength opponents when they are
  appropriate for that user's own strength;
- deterministic per-user diversification may reorder genuinely comparable
  candidates;
- diversification does not allocate/reserve targets and cannot guarantee
  disjoint recommendations between similar SCATHE members;
- recommendation quality takes precedence over forced target uniqueness;
- Fair Fight remains visible reward/context and does not initially override
  recommendation safety/fit;
- stable evidence should produce a stable shortlist rather than arbitrary
  rotation.

The implementation now includes pure/testable suitability and recommendation
modules outside React.

At this acceptance checkpoint the local quality gate passes:

- 10 test files;
- 64 tests;
- TypeScript typecheck;
- ESLint;
- production Vite build;
- PWA service-worker generation.

These numbers are checkpoint evidence, not permanent acceptance criteria; later
work will add tests.

### Visual polish checkpoint

The visual-polish work originally deferred from HONJIN-04 was implemented and
accepted on-device on 27 September 2026.

Accepted behaviour includes:

- shared semantic design tokens for surfaces, borders, text hierarchy, accent,
  status colours, depth and component states;
- a restrained graphite/gunmetal dark presentation with visibly separated
  background, working-card/control and overlay planes;
- raised primary cards/actions and recessed search/sort controls without
  glossy or ornamental game-UI styling;
- a cool grey/steel light theme that preserves HONJIN's SCATHE identity rather
  than becoming generic white SaaS UI;
- one shared component/layout system across both themes;
- a compact header toggle that switches only between DARK and LIGHT;
- DARK as the deterministic default when no valid preference exists;
- local persistence of the non-sensitive appearance preference;
- current-user and player intel drawers retaining the strongest elevation
  level in both themes.

Mobile visual acceptance confirmed the material hierarchy and both themes on
TARGETS, TEAM, TRAVEL and intel/current-user drawers.


Build static/fake-data versions of:

- WAR;
- TARGETS with WAR TARGETS / SPY ROOM mode switching;
- HOSPITAL;
- TRAVEL;
- TEAM;
- intel drawer.

Use the real SCATHE banner and HONJIN emblem.

Establish the black / SCATHE-red / metallic-grey visual system. Generate browser favicon, installed-PWA and maskable icon assets from the canonical HONJIN emblem source.

**Exit:** all five screens are comfortable on phone and desktop, require no normal horizontal scroll, and use wider desktop space deliberately rather than merely stretching the phone layout.

---

## HONJIN-05 — Live War and Targets

### HONJIN-05 entry contract

HONJIN-05 starts from the accepted HONJIN-04 shell.

Its primary job is to replace static preview intelligence with normalised live
Torn and FFScouter evidence while preserving the accepted interaction model.

Do not redesign the navigation or target-card information architecture merely
because live wiring begins.

HONJIN-05 should specifically implement or validate:

- current Ranked War discovery;
- enemy-faction roster/status ingestion;
- current-user personalised target assessment;
- free/public FFScouter BSS enrichment;
- current-user-specific Fair Fight handling;
- authoritative rolling WAR shortlist replacement;
- full WAR TARGETS roster filtering/sorting;
- individual Spy Room live recon;
- faction Spy Room live recon;
- current opponent HP/life where roster-level data legitimately exposes it;
- caller-safe caching and deduplication;
- freshness and stale-state handling;
- central request scheduling and rate-limit degradation;
- target-specific explainability/provenance.

The accepted current-user adjusted-BS requirement also enters HONJIN-05
investigation.

Before using adjusted/current BS for recommendation ratios, empirically verify
the exact semantics of Torn v2 battlestats base values and modifier fields.
HONJIN must not guess modifier arithmetic or double-apply merits, drugs,
faction effects, education effects or other modifiers.

When verified, preserve base BS separately from current/adjusted BS and use the
current value for personalised recommendations when authoritative modifier data
is usable.

Opponent temporary combat modifiers remain unknown unless legitimately exposed
through an allowed source; HONJIN must state that asymmetry honestly.


Integrate:

- Torn roster/status;
- own BS;
- war state;
- FFScouter free public estimates;
- personalised FF;
- deterministic suitability;
- confidence;
- sorting/filtering;
- Torn deep links;
- Spy Room individual recon;
- Spy Room single-faction recon;
- local Spy Room identity persistence;
- live refresh/staleness handling for Spy Room intelligence.

**Exit:** HONJIN produces a useful personalised current-war target board from live data and remains useful outside war through individual and faction Spy Room reconnaissance.

### HONJIN-05 accepted implementation checkpoint

**Status:** ACCEPTED through HONJIN-05E on 25 September 2026.

Accepted implementation checkpoints:

- `655fc8e` — HONJIN-05A live war foundation;
- `ce5f608` — HONJIN-05B FFScouter live-intel foundation;
- `b3d4e88` — HONJIN-05C live WAR UI wiring;
- `19ed6a7` — HONJIN-05D live Spy Room recon;
- `164ce91` — HONJIN-05D.1 recon key capabilities;
- `9ad84f9` — HONJIN-05D.2 Spy Room sorting;
- `a41eebb` — HONJIN-05E Spy Room persistence and refresh lifecycle.

The accepted live implementation now includes:

- live current Ranked War discovery and enemy roster/status;
- central Torn scheduling/cache/dedup under the conservative HONJIN budget;
- FFScouter free/public BSS enrichment and current-user-specific Fair Fight;
- deterministic suitability/strength-fit separation and explainable provenance;
- live WAR and WAR TARGETS without privileged faction attack/revive feeds;
- individual and one-faction Spy Room recon with human-facing name search and exact-ID fallback;
- individual profile HP only through explicit individual recon, not faction-roster fan-out;
- up to 10 persisted individual Spy Room IDs and one persisted faction ID in IndexedDB;
- persisted identity separated from live intelligence: BS, FF, HP and status refresh rather than being trusted from storage;
- workspace/visibility-aware Spy Room refresh without permanent polling loops;
- explicit manual refresh at user-triggered priority;
- presentation-only Spy Room sorting with descending level as the faction-workspace default, explicit ascending level, and independent BS, FF, attackability/status and name modes;
- honest stale/non-actionable degradation on provider failure or expired evidence.

Live browser acceptance confirmed that saved player/faction identities survive a browser close/reload and that explicit player removal persists across reload.

At the HONJIN-05E checkpoint the local quality gate passed:

- 19 test files;
- 125 tests;
- TypeScript typecheck;
- ESLint;
- production Vite build;
- PWA service-worker generation.

Current-user adjusted battle stats were deliberately blocked at this checkpoint pending empirical Torn v2 modifier verification. That verification was subsequently completed during HONJIN-09 pre-war implementation work; see section 9.2 and the HONJIN-09 checkpoint below.

---

## HONJIN-06 — Hospital

Implement:

- hospital roster;
- release countdowns;
- filters;
- soonest-out ordering;
- local watch state.

**Exit:** useful hospital opportunity view.

### HONJIN-06 accepted implementation checkpoint

**Status:** ACCEPTED on 25 September 2026.

Commit: `559f5e4` — Complete HONJIN-06 live Hospital.

Accepted behaviour includes:

- one live Hospital opportunity board aggregated from current WAR targets and saved Spy Room targets;
- player deduplication while retaining source provenance;
- active-war `WAR TARGETS ONLY` defaulting on;
- explicit inclusion of non-war Spy targets only after the user disables that safety filter;
- visible non-war/Spy provenance when such targets are included;
- all relevant tracked hospital targets shown outside an active Ranked War;
- live release countdowns and the accepted `<15M`, `<1H`, `1–3H`, `3H+` filters;
- soonest-release ordering;
- expired countdowns treated as refresh-pending rather than proof of attackability;
- local per-user WATCH state in IndexedDB;
- saved Spy identities refreshed when Hospital becomes the visible workspace using the existing central scheduler rather than a new polling subsystem.

The local quality gate passed:

- 22 test files;
- 136 tests;
- TypeScript typecheck;
- ESLint;
- production Vite build;
- PWA service-worker generation.

---

## HONJIN-06.1 — Cross-screen player-card and freshness polish

### Product refinements accepted 25 September 2026

Implement this bounded refinement before the main HONJIN-07 Travel work so new
Travel cards inherit the corrected conventions rather than duplicating known UI
and refresh issues.

Required behaviour:

- show Torn player level on player cards where available, using compact
  secondary typography; level remains informational and does not drive the
  deterministic suitability model;
- Hospital and Travel retain combat context on each card: level, estimated BS
  and caller-specific FF where available, plus existing suitability/confidence
  where useful;
- user-facing provenance for a deliberately included target outside the current
  Ranked War is simply `NON-WAR`; do not show `SPY FACTION` / `SPY INDIVIDUAL`
  on compact Hospital/Travel cards;
- group the HP label and HP numeric value together on target cards rather than
  separating them across the full card width;
- while HONJIN is foreground/visible, refresh live intelligence automatically
  through the central scheduler so evidence does not routinely expire and wait
  for manual refresh;
- manual refresh remains available as an explicit high-priority override;
- foreground auto-refresh must preserve the existing Torn soft budget,
  provider-specific limits, batching, cache reuse and in-flight deduplication;
- background/hidden work may be slower, and a fully closed browser/PWA performs
  no polling;
- if refresh cannot occur in time, continue to degrade honestly to stale/
  refresh-delayed rather than presenting old values as current.

**Exit:** the accepted live player-card surfaces expose level consistently,
Hospital/Travel preserve core combat intel, HP reads as one compact metric, and
foreground use stays fresh automatically without creating parallel polling
loops or weakening rate-limit safety.

---

## HONJIN-07 — Travel engine

### HONJIN-07 entry decisions accepted 25 September 2026

HONJIN-07 starts from commit `559f5e4` and must carry forward the same tracked-opponent and wartime-safety model accepted for HOSPITAL:

- aggregate current-war targets plus saved individual/faction Spy Room identities;
- deduplicate players;
- during an active Ranked War, default `WAR TARGETS ONLY` to on;
- label deliberately included non-war targets simply `NON-WAR`;
- outside war, allow the full tracked-opponent travel view;
- retain compact player level, estimated BS and caller-specific FF on Travel
  cards where available so travel status does not strip away combat context.

Travel timing must remain observational. HONJIN does not run a backend that stores users' Torn keys or polls opponents while the user's browser/PWA is fully closed. Therefore it cannot reconstruct an exact status transition that happened while HONJIN was not observing. Persisted local observations may bound a transition window, but an offline gap must never be displayed as time already spent travelling.

ETA policy:

- a genuine observed departure window may produce an ETA window when route/method evidence is sufficient;
- a broad offline/observation gap produces an ETA only if the resulting window remains genuinely useful, otherwise show timing uncertainty;
- a target first observed already airborne has no valid take-off window, so show `ETA unavailable · take-off not observed`;
- `ⓘ` reasoning must explain missing timing evidence as readily as it explains a produced ETA;
- method confidence and ETA/timing confidence are independent.

Do not introduce a server-side API-key store merely to obtain continuous travel observations for v0.1.

Implement:

- travel-state transition detection;
- route parsing;
- direction;
- `plane_image_type`;
- public opponent current-property lookup/cache;
- property type and Airstrip modification supporting evidence;
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

### HONJIN-08 accepted implementation checkpoint

**Status:** ACCEPTED on 27 September 2026.

Accepted behaviour includes:

- TEAM loads the live SCATHE roster only when TEAM becomes visible, using the existing request coordinator rather than a parallel polling path;
- `ALL`, `OKAY`, `HOSPITAL`, `TRAVELLING`, `ONLINE` and `OFFLINE` filters provide a compact war-board view;
- Torn presence is represented independently from hospital/travel state: online presence uses the familiar green indicator while offline presence remains neutral/grey;
- `ALL` and filtered TEAM results default to descending player level unless a screen has a stronger task-specific ordering rule; no additional sort control is required for this default;
- compact TEAM rows show player name, muted secondary level, status/location context and a clearly labelled `LAST ACTION` value without exposing player IDs in the primary list;
- TEAM remains based on ordinary/non-privileged roster/status information and does not require faction attack, revive or leadership-only permissions;
- Travel cards keep the accepted compact presentation: ETA is shown as one concise value when available, `ETA unavailable` when not, and the evidence/reason remains under `WHY THIS ESTIMATE`;
- Spy Room supports explicit removal of saved individual recon and saved faction recon, while active-war auto-populated targets remain governed by the war-target lifecycle rather than being treated as ordinary removable saved recon.

At this checkpoint the local quality gate passed:

- 29 test files;
- 191 tests;
- TypeScript typecheck;
- ESLint;
- production Vite build;
- PWA service-worker generation.

### Player-detail interaction after HONJIN-08

HONJIN-08 correctly recorded player detail as future work rather than claiming
it was already implemented. That interaction was subsequently implemented and
accepted during the HONJIN-09 pre-war work described below.

Compact operational lists remain decision-dense: player IDs are kept out of
the primary list and are available through the shared player-detail drawer.

---

## HONJIN-09 — Pre-war implementation plus live-war acceptance

Live-war field acceptance remains a required v0.1 validation stream, but it is
not a blocker for work that can be implemented and tested responsibly before a
Ranked War begins.

### HONJIN-09 pre-war implementation checkpoint

**Status:** ACCEPTED for local/pre-war implementation on 27 September 2026.
Real Ranked War field acceptance remains outstanding.

Accepted pre-war behaviour includes:

- shared tappable player detail across WAR/WAR TARGETS, individual and faction
  Spy Room, HOSPITAL, TRAVEL and TEAM;
- player IDs removed from compact operational player lists and retained in the
  detail drawer;
- compact player level retained where available, including Travel;
- individual and faction Spy Room player cards use Torn presence indicators
  consistent with TEAM semantics;
- faction Spy Room defaults to `LEVEL · HIGH → LOW` and provides independent
  `LEVEL · LOW → HIGH`, BS, FF, status/attackability and name sorting modes;
- the current-user header is tappable and opens a current-user combat-state
  drawer containing identity, base BS, modified/current BS, observation time
  and per-stat modifier evidence;
- the header keeps base `BS` visible and exposes `MOD BS` separately when
  current modifier evidence is available;
- Torn v2 current-user battlestat modifier semantics were empirically verified
  from an authenticated response without exposing the API key;
- fresh current-user modified BS now drives HONJIN's deterministic BS-ratio
  suitability and strength-fit/recommendation reasoning;
- missing, invalid or stale modifier evidence falls back to base BS;
- suitability thresholds were not retuned as part of modifier support;
- FFScouter caller-specific Fair Fight remains separate reward/context data and
  is not recalculated from modified BS;
- current-user battlestat refresh uses the existing central request
  coordinator rather than a parallel polling subsystem.

Visual acceptance confirmed that negative modifiers move the same fixed
opponents into appropriately harder existing suitability bands while opponent
BS estimates and FFScouter FF values remain unchanged.

Checkpoint validation evidence:

- complete Vitest suite: 30/30 files passed;
- complete tests: 206/206 passed;
- focused post-build-fixture-fix tests: 11/11 passed;
- TypeScript typecheck: passed;
- ESLint: passed with zero warnings after cleanup;
- production `tsc -b` + Vite build: passed;
- PWA `generateSW` generation: passed;
- `git diff --check`: clean during the patch/test cycle;
- mobile visual validation: accepted for player detail, compact-ID cleanup,
  Spy Room sorting/presence, current-user modifier drawer and modified-BS
  suitability behaviour.

### Live-war acceptance still required

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

### HONJIN-09 visual/theme and Torn navigation checkpoint

**Status:** ACCEPTED locally/on-device on 27 September 2026.

Accepted behaviour:

- shared visual tokens now drive both dark and light presentation;
- dark remains the default HONJIN theme;
- a compact header control switches and persists DARK/LIGHT without consuming
  current-user drawer space;
- stronger restrained card/control/drawer depth is accepted on mobile;
- light-theme selected states remain visibly SCATHE-red while preserving
  readable contrast;
- ATTACK no longer uses Torn's direct `loader.php?sid=attack&user2ID=...`
  route because that route repeatedly produced a blank Torn screen on the
  actual mobile acceptance device;
- ATTACK instead opens the target player's Torn profile in one tap, where the
  user can use Torn's own attack control.

Checkpoint validation evidence:

- complete Vitest suite: 31/31 files passed;
- complete tests: 211/211 passed;
- TypeScript typecheck: passed;
- ESLint: passed;
- production `tsc -b` + Vite build: passed;
- PWA `generateSW` generation: passed;
- `git diff --check`: clean after the final ATTACK/whitespace patch;
- mobile visual acceptance: dark material hierarchy, light theme, compact
  header toggle and profile-routed ATTACK behaviour accepted.

---

## HONJIN-10 — Remote publication gate

Remote deployment preparation and a pre-war deployment candidate are now
implemented without introducing a backend or storing Torn API keys server-side.

### workers.dev deployment checkpoint

**Status:** DEPLOYED for pre-war acceptance on 27 September 2026.

Deployment architecture:

- Cloudflare Workers Static Assets;
- no Worker application/backend script;
- Vite production output served directly from `./dist`;
- SPA fallback uses `not_found_handling: "single-page-application"`;
- no Cloudflare bindings or server-side secrets are required by HONJIN.

Accepted deployment evidence:

- Wrangler dry run discovered the built static assets and exited cleanly;
- production deployment uploaded the static/PWA bundle successfully;
- deployed origin: `https://scathe-honjin.rayza-slyce.workers.dev`;
- direct HTTP validation returned `HTTP/2 200`;
- deployed mobile testing confirmed onboarding, Torn connection, live
  workspaces, player/current-user drawers, theme persistence and profile-routed
  ATTACK behaviour operate as expected;
- production dependency audit reported `0 vulnerabilities`;
- deployed `dist` inspection contained only the expected compiled application,
  PWA/service-worker files, HONJIN/SCATHE visual assets, manifest and icons.

This deployment does not remove the requirement for real Ranked War field
acceptance. It exists so HONJIN can be used and validated before and during the
next war.

### GitHub publication checkpoint

**Status:** PUBLISHED on GitHub on 28 September 2026.

Repository publication decisions and evidence:

- repository: `https://github.com/Rayza-Slyce/scathe-honjin`;
- visibility: PUBLIC;
- default branch: `main`;
- local `main` tracks `origin/main`;
- repository homepage points to the live HONJIN `workers.dev` deployment;
- the full existing Git history was pushed successfully;
- the faction-facing README was reviewed and approved before commit;
- no open-source licence is included at this checkpoint by deliberate choice;
- the current-tree secret scan completed without findings;
- Git-history credential-shaped matches were reviewed and were limited to
  synthetic test keys, environment-variable references and request-construction
  code rather than committed live credentials;
- the production dependency audit reported `0 vulnerabilities`;
- the production static bundle contents were inspected before publication.

Public repository visibility is intentional so interested SCATHE members can
inspect the implementation without requiring per-member repository access.
Public visibility does not change HONJIN's runtime security model: Torn API
keys remain session-only in the client and are not stored by a HONJIN backend.

No licence is included for now. This leaves default copyright in place while
the project owner decides whether broader reuse rights should ever be granted.

Repository publication is complete for this checkpoint, but HONJIN v0.1 still
requires real Ranked War field acceptance of the live war, target, hospital and
travel workflows before the overall product acceptance gate is complete.

### Faction release candidate checkpoint

**Status:** DEPLOYED and READY FOR FACTION USE on 28 September 2026.
Real Ranked War field acceptance remains outstanding.

Accepted release behaviour and decisions:

- the approved repository `README.md` is available in-app before API-key
  connection and from a compact logged-in header information control;
- the in-app About/README view uses the repository README as its source rather
  than maintaining a second product-description copy;
- existing active-war polling now feeds Travel observation state even when the
  Travel workspace is not visible, so HONJIN has more opportunities to catch a
  player changing to travelling without adding another Torn polling path or
  extra Torn requests;
- Travel ETA accuracy remains strongest when HONJIN observes the change to
  travelling closely enough to bound the departure window;
- the accepted Travel inference/ETA algorithm was deliberately left unchanged
  at this release checkpoint rather than adding speculative heuristics;
- `last_action` may remain available as ordinary player context elsewhere in
  HONJIN, but it is not treated as take-off timing and is no longer presented
  as ETA evidence in `WHY THIS ESTIMATE`;
- temporary opponent-travel evidence inspectors, legacy/v2 travel probes and
  related diagnostic UI/tests were removed before release;
- local diagnostic validation confirmed that direct opponent travel selections
  attempted through ordinary user-key access did not provide exact opponent
  departure/arrival timing, so HONJIN continues to use its own observational
  travel model rather than claiming Torn-supplied exact ETAs;
- README Travel guidance now states that leaving HONJIN open improves the
  chance of catching travel transitions while acknowledging that browser/mobile
  background throttling can still reduce timing precision.

Final local release gate:

- complete Vitest suite: 31/31 files passed;
- complete tests: 215/215 passed;
- TypeScript typecheck: passed;
- ESLint: passed;
- production `tsc -b` + Vite build: passed;
- PWA `generateSW` generation: passed;
- `git diff --check`: clean.

Production release evidence:

- deployed origin: `https://scathe-honjin.rayza-slyce.workers.dev`;
- Cloudflare Workers deployment succeeded;
- production version ID:
  `d8bdfcfc-d443-4454-9f7e-dd75640b362f`;
- direct HTTP validation returned `HTTP/2 200`.

This checkpoint is the faction-facing pre-war release candidate. Further Travel,
target-classification or polling changes should be driven by evidence collected
during real Ranked War use rather than speculative pre-war tuning.

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
29. TARGETS remains useful without an active Ranked War through SPY ROOM.
30. Individual Spy Room recon can retain up to 10 selected players until the user removes them.
31. Faction Spy Room recon supports one selected faction at a time and refreshes live intelligence rather than treating persisted values as current.
32. Browser favicon and installed-PWA identity are derived from the canonical HONJIN emblem.
33. Player IDs stay out of compact operational player lists and remain available through tappable player detail.
34. When authoritative current-user modifier data is fresh, HONJIN uses current modified BS for deterministic personalised suitability/recommendation ratios and falls back explicitly to base BS when that modifier evidence is unusable.
35. HONJIN provides accepted dark and light themes through shared semantic design tokens, with dark as the default and a compact persisted header toggle.
36. ATTACK provides reliable one-tap Torn navigation by opening the target player's profile when the direct Torn attack-loader route is unreliable.
37. The production PWA can be deployed as static assets to the approved `workers.dev` origin without backend API-key storage or Cloudflare runtime bindings.
38. The approved source repository is publicly published on GitHub from `main`, with no open-source licence added at this checkpoint.

---

# 40. Open questions to resolve empirically

Do not guess these during implementation:

- exact minimum Torn API selections;
- exact custom-key generation flow Torn currently supports;
- exact current member/travel response fields;
- exact opponent current-property response fields and custom-key selection behaviour;
- whether `Airstrip` and current property identity remain consistently visible for opponents through public access;
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
- live-war evidence for whether the current-user modifier freshness/fallback policy needs tuning;
- empirical verification that enemy-faction v2 member rosters expose current and maximum life without per-player requests;
- live-war evidence for whether adjusted current-user BS improves recommendation usefulness;
- live-war evidence for tuning the initial personalised strength-fit bands;
- live-war evidence for the minimum recommendation confidence/freshness rules;
- practical width of the narrow ratio bucket used for comparable-candidate diversification;
- live-war evidence for whether HONJIN's initial 40-request/minute soft Torn budget should be tuned;
- whether remembered-device key storage needs additional UX or security hardening after field use;
- exact cause and reproducibility of FFScouter browser-side registration rate limiting observed during onboarding acceptance.

---

# 41. Product boundary

Use this test when considering a new feature:

> Does this help a SCATHE member make a faster, better-informed combat or Ranked War decision on a phone, including preparation and reconnaissance outside an active war?

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

At project start, Torn Swagger documents `/user/{id}/property` as public-access; HONJIN uses public property identity and modifications such as `Airstrip`, while intentionally discarding opponent staff from travel inference. Torn Swagger also documents `plane_image_type` values `light_aircraft`, `airliner`, and `private_jet`. Torn's API maintainer has stated that Business Class intentionally uses the same image as Standard travel, so aircraft-image data alone cannot distinguish those two methods.

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

---

# 44. HONJIN-11 — Shared observational intelligence / Recon Engine

**Status:** ACCEPTED, DEPLOYED AND PRODUCTION-VALIDATED by 1 October 2026.

The browser-only v0.1 architecture remains valid for core operation and ordinary SCATHE-member credentials. The shared backend exists for the capability a closed browser cannot provide reliably: persistent public opponent observation. In user-facing copy this is called the **HONJIN Recon Engine**.

## 44.1 Hard security boundary

- Ordinary SCATHE member Torn API keys remain browser-side under the existing session / remembered-device policy.
- The shared backend has its own dedicated HONJIN service/custom Torn key.
- Ordinary member Torn API keys are never sent to or stored by the Recon Engine.
- No real Torn API key may exist in source, Git, fixtures, logs, screenshots, build-time variables or committed configuration.
- Core v0.1 still does not require leadership-granted faction API access or privileged faction attack/revive feeds.
- The browser Origin allow-list is abuse reduction, not authentication; blast radius is controlled by request caps, watch caps, lease expiry, deduplication and the fixed collector budget.

## 44.2 True individual-watch semantics

Individual Spy target and faction Spy target are distinct instructions.

An individual target registration is conceptually:

```json
{
  "players": [{ "playerId": 123, "factionId": 999 }],
  "factionIds": []
}
```

This creates or renews **PLAYER 123 only**. `factionId: 999` is metadata only and must never implicitly create or renew faction coverage.

A faction target registration is conceptually:

```json
{
  "players": [],
  "factionIds": [999]
}
```

This creates or renews one faction watch for faction 999.

Deduplication rules:

- several HONJIN users saving the same player renew one shared player watch;
- several saved players from the same faction remain separate individual watches unless a faction watch was independently requested;
- several HONJIN users saving the same faction renew one shared faction watch;
- if a player is individually watched and that faction is also independently watched, the scheduler may reuse sufficiently fresh evidence, but the player watch must never be the reason a faction watch exists.

## 44.3 Recon watch lifecycle

Browser-contributed Spy interest uses a **48-hour renewable lease**.

User-facing meaning of renewal:

- opening HONJIN re-registers saved Spy Room identities automatically;
- while HONJIN is active, relevant saved targets may also be renewed as they are used;
- if nobody opens HONJIN with a target saved for more than 48 hours, the shared watch expires and background polling stops;
- expiry does not remove that target from the user's local Spy Room;
- reopening HONJIN with the target still saved automatically reactivates the watch;
- another SCATHE member with the same saved target can keep the deduplicated shared watch active.

Stronger server-controlled priorities such as `active-war`, `explicit` and `visible-spy` are not expired merely because an ordinary browser lease ends.

## 44.4 Collector budget and persistence

The collector has **one shared rolling maximum of 50 Torn requests across any 60-second collector window across faction jobs and individual-player jobs combined**. Do not split this into independent faction and player limits. The collector normally uses fewer requests when fewer jobs are enabled. If Torn returns API error 5 (too many requests), the remaining jobs in that scheduler run are deferred rather than continuing to issue Torn requests.

The browser/current-user path retains its existing soft Torn budget of 40 requests per minute. In the current deployment both the browser key and Recon Engine service key belong to the same Torn user, so the 50 + 40 split intentionally leaves approximately 10 requests/minute of engineering headroom beneath Torn's documented 100 requests/minute user-level allowance.

Persistent individual observation uses its own player-watch, snapshot and transition storage. Faction observation uses faction-watch/snapshot/transition storage. Individual registration does not promote to faction registration.

Migrations 005 and 006 are already applied in production. **Do not rerun them.** They contain non-idempotent `ALTER` operations.

## 44.5 Production validation already completed

Production proof completed before this source-of-truth update includes:

- player-only `/v1/watch` registration returned HTTP 202 and changed only the individual registry, leaving the player's faction watch untouched;
- faction-only registration changed only faction interest and did not touch individual registrations;
- real refreshed-PWA individual save created an individual watch, was polled by the collector and produced an individual snapshot with no whole-faction watch;
- real refreshed-PWA faction save created faction coverage and persistent faction snapshots;
- the scheduler was historically observed at eight candidates with five selected/requested, proving the then-current shared max-five budget, then at two candidates/two requests after obsolete seeded faction watches were disabled; that historical budget was superseded by the later collector-accuracy tuning recorded in section 48;
- CORS preflight from the production PWA origin succeeded;
- six obsolete seeded faction watches were disabled without deleting historical evidence;
- an initial failed UI acceptance attempt was traced to a stale service-worker-controlled PWA; closing/reopening the installed app loaded the deployed registration path and the real acceptance tests then passed.

---

# 45. Historical production checkpoint — 1 October 2026

**Historical only. Superseded by section 50.**

## 45.1 Repositories and Git policy

Frontend repository:

```text
~/projects/scathe-honjin
```

Backend / Recon Engine working repository:

```text
~/projects/scathe-honjin-backend-poc
```

Only the **frontend application repository** is pushed to GitHub. The backend repository is local/deployment source and must **not** be pushed to GitHub unless this source of truth is deliberately changed.

Current frontend Git checkpoint:

```text
commit 78c79fb
Add persistent HONJIN recon intelligence
branch main
```

The README rendered by the app's info button was rewritten at this checkpoint. User-facing terminology is **HONJIN Recon Engine**, not “shared observation service”. The README explains the 48-hour watch in plain language: opening HONJIN renews saved targets; expiry stops background observation without deleting local Spy Room state; reopening reactivates it.

## 45.2 Current production deployments

Frontend PWA:

```text
Worker: scathe-honjin
URL: https://scathe-honjin.rayza-slyce.workers.dev
Version: 9678a3bd-74ec-402d-aaff-fc893e993922
Bundle at checkpoint: assets/index-DU5Ae2CT.js
```

Recon collector:

```text
Worker: scathe-honjin-travel-poc
Version: 6c63fe3f-4f86-4187-baa3-03284eb764ed
Cron: * * * * *
D1 binding: DB
Database: honjin-travel-poc
Database ID: 366fd392-989a-408d-8d2c-f1f375c30ad5
```

Public shared-intel facade:

```text
Worker: scathe-honjin-intel
Version: 7f1b4f05-a396-4b2f-8976-5eec2dd21168
Same D1 database as collector
```

## 45.3 Release gates already passed

Frontend at the accepted recon-intelligence release checkpoint:

```text
33 test files passed
221 / 221 tests passed
ESLint clean
TypeScript clean
production Vite build clean
PWA generation clean
git diff --check clean
```

Backend:

```text
36 test files passed
250 / 250 tests passed
ESLint clean
TypeScript clean
git diff --check clean except a later-noted harmless extra blank line at EOF in one local test when staged; backend remains local-only
```

The final user-facing README-only rebuild succeeded and produced the currently deployed frontend bundle shown above.

---

# 46. HONJIN-12 — Final pre-war Team / Life / Travel cleanup

**Status:** COMPLETED. See section 51 for the accepted implementation state.

This is the next implementation package before relying on the next real Ranked War as the principal field test.

## 46.1 TEAM must stop using static-preview player details

Current production screenshots on 1 October 2026 show that the TEAM player-detail drawer still renders legacy/static preview text such as `Static HONJIN-04 preview`. This is not acceptable as the final Team behavior.

TEAM requirements:

- TEAM must use live SCATHE roster/member data rather than static preview fixtures;
- Team player detail must include: player name, Torn ID, level, current status, last action, **faction rank**, and estimated battle stats where available;
- `CONTEXT` in the current drawer is replaced semantically by faction **RANK**;
- if the faction member is hospitalized, show **time remaining in hospital**;
- if the faction member is travelling, show the canonical HONJIN **time remaining to land** when a valid ETA exists;
- TEAM does **not** need current-user Fair Fight or attack suitability because SCATHE members are not attack targets;
- TEAM must not expose stale `HONJIN-04` / `HONJIN-05` preview wording.

### Persistent Team data

The last successful Team roster/enrichment state must be persisted locally, preferably in IndexedDB alongside other non-secret HONJIN state.

Expected behavior:

1. hydrate the most recent valid Team snapshot immediately on startup/re-entry;
2. refresh it through the existing coordinated live request path;
3. replace persisted state only with a successful normalized refresh;
4. leaving TEAM, reloading, closing/reopening HONJIN, or temporary network/API failure must not unnecessarily blank the last known roster;
5. persisted data carries a real freshness/observed timestamp and must never be represented as current merely because it was restored;
6. avoid a new per-member Torn request fan-out if the existing faction-member response or established enrichment path already carries the required fields.

TEAM hospital timing should reuse the canonical normalized hospital/status model. TEAM travel timing should reuse the canonical Travel timing result rather than creating a second ETA algorithm.

## 46.2 Add LIFE to the connected user's player card

The connected-user/header detail card must include current and maximum LIFE when available, for example:

```text
LIFE 4,250 / 5,000
```

Reuse already-fetched current-user Torn data if the required fields are present. Do not add a separate API request solely for LIFE without first proving it is necessary.

## 46.3 Travel ETA presentation becomes timezone-independent countdown

Do not present opponent ETA primarily as a wall-clock local time such as `ETA 01:57–02:48`.

Present **time remaining to land**, for example:

```text
LANDS IN 1h 31m–1h 38m
```

or, when uncertainty collapses sufficiently:

```text
LANDS IN 1h 34m
```

The countdown is derived from absolute timestamps/current time and therefore works for users in any timezone. It must update as time advances without inventing a new departure observation.

If HONJIN first discovers a player already airborne and has no valid observed/shared departure interval for the current route, the ETA is **unavailable**. Do not manufacture a broad ETA from the observation time alone.

## 46.4 Travel uncertainty must be narrow when take-off and method are well supported

The production screenshot showed an approximately 51-minute ETA window despite an observed departure and strong Airstrip-method evidence. That width is not acceptable merely as a generic uncertainty allowance.

Implementation rule:

- start from the genuine observed departure interval (`travel-start` / matching `travel-route-change`) for the current route;
- use the deterministic route + method duration model;
- include Torn's documented ordinary **3% flight-time variance**;
- do **not** widen every ETA to cover rare/temporary modifiers that HONJIN cannot observe;
- instead show a concise caveat in the reasoning, such as: **“Estimate assumes normal travel time. Temporary travel-time effects can make the actual arrival earlier or later.”**

Current official Torn references checked on 1 October 2026:

- `https://wiki.torn.com/wiki/Travel` documents 3% flight-time variance and notes that Detective Agency Watchlist can extend flights;
- `https://wiki.torn.com/wiki/Book_%3A_Mailing_Yourself_Abroad` documents a 25% travel-time reduction for 31 days;
- `https://wiki.torn.com/wiki/Detective_Agency` documents Watchlist extending a target's flight by roughly 1:30–2:00 hours and its WLT limitation.

HONJIN does not need to detect those exceptional effects for this work package. The default ETA should represent normal travel plus genuine normal variance, with exceptional modifiers disclosed as a caveat rather than converted into a huge generic window.

Before changing arithmetic, trace the current wide interval to its actual source. Likely candidates include an unnecessarily wide stored departure interval, stale/shared interval selection, or an old timing-confidence broadening rule. Add focused regression tests for tightly observed departures.

## 46.5 Pilot evidence is forbidden and HIGH Airstrip inference must be consistent

Opponent Pilot staff is **not** travel evidence and must not appear anywhere in current reasoning UI.

The production screenshot on 1 October 2026 showing:

```text
Pilot staff: absent
Inference: light-aircraft image has only partial Airstrip/Pilot support
Likely Airstrip · MEDIUM method confidence
```

is a defect / legacy path.

Canonical rule:

```text
current travelling target
+ plane_image_type = light_aircraft
+ fresh current property = Private Island
+ Airstrip modification present
    → Likely Airstrip · HIGH method confidence
```

No Pilot staff check is required or permitted for that decision.

Terminology remains precise:

- `light_aircraft` + PI + Airstrip supports **Airstrip** travel;
- it must not automatically be labelled WLT `Private` travel;
- `private_jet` remains independent aircraft evidence for the distinct Private/WLT method;
- `airliner` remains Standard / Business ambiguous from aircraft image alone.

Implementation acceptance must grep both source and production bundle for stale `Pilot`, `pilot_present`, `Airstrip/Pilot` reasoning where appropriate. If legacy persisted observations can contain obsolete fields or reasoning strings, the current rendering/normalization path must ignore them so old stored data cannot resurrect Pilot-based UI or downgrade confidence.

## 46.6 Expected patch grouping

After a fresh thread receives current source archives, prefer coherent grouped patches rather than a patch per tiny UI change.

Expected grouping, subject to source inspection:

1. **Frontend Team/Life patch** — live/persistent TEAM detail, rank, BS, hospital/travel timing reuse, connected-user LIFE, tests.
2. **Frontend Travel cleanup patch** — countdown ETA presentation, narrow normal-variance timing model, no-ETA-without-departure rule, Pilot legacy removal, regression tests.
3. If the actual code makes these changes tightly coupled in the same domain modules/tests, one consolidated frontend patch is preferred over artificial separation.
4. **Backend patch only if inspection proves necessary.** Do not change D1 schema or deployed backend merely to satisfy frontend presentation requirements. No new migration is expected for this package.

---

# 47. Continuity and handover protocol

This section was refreshed on 3 October 2026 after the pre-war hardening work.

When continuing in a fresh ChatGPT Project thread:

1. Treat this `updated-7` file as the authoritative product/architecture/current-state source.
2. Read the full file before proposing implementation changes. Sections 62–65 contain the latest real-War decisions, heat-map design and updated-7 precedence; they take precedence where older historical sections conflict.
3. For code changes, use a **fresh current source archive** from Rayza's machine rather than assuming an older uploaded archive still equals local source. Frontend path: `~/projects/scathe-honjin`. Backend path: `~/projects/scathe-honjin-backend-poc`.
4. If the proposed work is clearly frontend-only, a fresh frontend archive is sufficient. Ask for the backend archive only when backend diagnosis or mutation is actually required.
5. Create patch files against the fresh archive and give numbered local commands. Never claim a patch was applied to Rayza's machine.
6. Run focused tests first, then the complete frontend or backend release gates.
7. For frontend changes, explicitly stage only the intended files; do not use `git add .`.
8. Only the frontend repository is pushed to GitHub. The backend repository is local/deployment source and is **not pushed**.
9. Before production DB/backend mutations, inspect the live state and current migration history. Never rerun migrations 005, 006 or 007.
10. After a frontend deployment, verify production HTTP health and fully close/reopen the installed PWA to avoid stale service-worker confusion.
11. Preserve the current browser/backend Torn request budget architecture and secret-handling rules.
12. The real Ranked War is now an active field-acceptance window. Core scheduled-War, War Travel and personalised targeting behavior have been accepted; the next engineering package is per-player Observed activity heat maps, tuned only from collected evidence.
13. During the live War, prioritize small evidence-driven patches that preserve the existing architecture over broad redesigns.

---

# 48. HONJIN-13 — Recon collector accuracy tuning

**Status:** COMPLETED AND DEPLOYED. See section 52 for the accepted production state.

Production diagnostics showed 17 enabled Recon jobs: two faction watches and fifteen individual-player watches, all at `background-spy` priority. The five-request collector ceiling was saturated on every inspected scheduler run, with five selected/requested and zero request failures. Current polling age reached approximately four minutes even though Torn's documented allowance for the owning user is much higher. Historical travel transitions for real targets also showed broad collector observation gaps, including 780- and 954-second windows, while better-covered transitions were around 60–251 seconds.

The accepted tuning is:

- backend Recon Engine: one **rolling 50-request maximum across any 60-second collector window**, shared by faction and individual jobs;
- browser/current-user Torn scheduler: keep the existing **40-request/minute soft budget**;
- retain approximately ten requests/minute of engineering headroom under the documented 100-request/minute user-level allowance for the current deployment, where both keys belong to the same Torn user;
- compute backend capacity from recent completed scheduler runs so close-together cron executions cannot each spend a full independent budget;
- if Torn returns API error 5, stop the remaining Torn work in that scheduler run and leave unattempted jobs eligible for the next run;
- preserve existing request priority, oldest-polled fairness, watch lease semantics, player-vs-faction registration semantics and all D1 schemas;
- do not rerun migrations 005 or 006;
- do not loosen Travel's five-minute maximum useful departure window merely to hide collector gaps. Improving observation cadence is the correct fix.

With the production state observed during this investigation (17 active jobs), the tuned collector can poll every enabled job in each normal scheduler minute while using only about 17 backend Torn requests rather than automatically consuming the full 50-request ceiling.

---

# 49. Updated-5 historical precedence rule

**Superseded by the updated-6 precedence rule in section 61.**

Where an older section of this document conflicts with sections 44–48, **sections 44–48 are authoritative** because they record later accepted production evidence and the current agreed work package.

In particular, the following older ideas are superseded if encountered elsewhere:

- an individual Spy target implicitly creating faction coverage;
- a faction-only five-request budget rather than a single combined faction/player budget;
- the later combined fixed-five collector budget, which is superseded by the rolling 50-request/60-second HONJIN-13 budget;
- a 72-hour browser lease rather than the accepted 48-hour lease;
- Pilot staff as opponent travel evidence;
- a global prohibition on server-side individual-player polling;
- wall-clock ETA as the preferred user-facing travel countdown;
- static TEAM preview detail as an acceptable shipped state;
- pushing the backend repository to GitHub.

---

# 50. Canonical production checkpoint — 3 October 2026

This is the current War-ready baseline and supersedes older production checkpoint values elsewhere in this document.

## 50.1 Frontend repository and deployment

Frontend repository on Rayza's machine:

```text
~/projects/scathe-honjin
branch: main
HEAD / origin/main: 23f3cb4 Harden scheduled ranked war state
```

Production PWA:

```text
Worker: scathe-honjin
URL: https://scathe-honjin.rayza-slyce.workers.dev
Version: fbea62fb-5e4e-4606-99d4-f30a7ca90f2b
Bundle: assets/index-MyRfgchk.js
Production health after deploy: HTTP/2 200
```

Final frontend release gates at this checkpoint:

```text
34 test files passed
249 / 249 tests passed
ESLint clean
TypeScript clean
production Vite build clean
PWA generation clean
git diff --check clean
```

Only the frontend repository is pushed to GitHub.

## 50.2 Backend / Recon Engine production state

Backend source remains local/deployment-only:

```text
~/projects/scathe-honjin-backend-poc
```

Do **not** push this repository to GitHub.

Collector:

```text
Worker: scathe-honjin-travel-poc
Current recorded production version: 8dca17b8-feaf-48e5-a8bc-1ccd9af8950e
D1 binding: DB
Database: honjin-travel-poc
Database ID: 366fd392-989a-408d-8d2c-f1f375c30ad5
```

Public Recon/shared-intel facade remains the existing `scathe-honjin-intel` Worker using the same D1 database. Its last recorded version was `7f1b4f05-a396-4b2f-8976-5eec2dd21168`; verify the live deployment before any future facade mutation rather than assuming a historical version string is current.

Backend invariants now accepted in production:

- one rolling maximum of **50 Torn requests in any 60-second collector window** across faction and individual Recon jobs;
- D1 single-flight scheduler lease prevents overlapping cron executions from concurrently consuming the same work;
- snapshot writes are monotonic so older overlapping work cannot overwrite fresher state;
- SCATHE faction watch `48572` is explicit/persistent (`enabled=1`, priority `explicit`);
- no post-fix duplicate travel transitions were observed after the scheduler-race fix;
- browser/current-user Torn coordinator keeps a **40 requests/minute soft budget**;
- in Rayza's current deployment the browser key and collector key belong to the same Torn user, so 40 + 50 intentionally leaves roughly ten requests/minute of engineering headroom below Torn's documented user-level limit;
- another HONJIN user uses their own browser key/user allowance; their browser activity does not consume Rayza's browser allowance merely because they use the same PWA.

## 50.3 Migration safety

Migrations **005, 006 and 007 are already applied in production**.

Do not rerun them.

Migration 007 introduced the scheduler lease used by the collector race fix. Any future schema work must use a new migration number and be justified by an actual backend requirement.

---

# 51. HONJIN-12 — Team, LIFE and Travel cleanup — completed

The pre-war cleanup described historically in section 46 is complete.

Accepted shipped behavior includes:

- TEAM uses real SCATHE roster/member data rather than static HONJIN preview content;
- the most recent successful Team snapshot is persisted in IndexedDB/local persistence and is hydrated before live refresh;
- Team detail uses real rank/status/last-action/BS data where available and reuses canonical Hospital/Travel timing rather than inventing Team-specific logic;
- TEAM does not show Fair Fight or attack suitability for own-faction members;
- connected-user LIFE is taken from the existing current-user profile capability rather than a dedicated LIFE request;
- opponent/Individual Spy player profiles normalize current/max LIFE;
- user-facing terminology is `LIFE`, not `HP`;
- Travel's primary user-facing time is timezone-independent `LANDS IN ...`, not a wall-clock ETA;
- no valid observed/shared departure interval means no invented ETA;
- normal travel uncertainty uses Torn's ordinary ±3% variance rather than a giant window intended to cover rare effects;
- temporary/rare travel effects remain a reasoning caveat instead of silently widening every prediction;
- Pilot staff is not travel evidence and Pilot terminology is forbidden from current travel reasoning;
- `light_aircraft + current Private Island + Airstrip modification` supports Airstrip with HIGH method confidence;
- `private_jet` is independent evidence for WLT/Private travel;
- `airliner` remains Standard/BCT ambiguous until timing evidence can prune BCT.

Subsequent Travel refinements shipped after the initial HONJIN-12 package include:

```text
8068092 Refine HONJIN travel timing intelligence
46d5c7d Refine HONJIN travel timing confidence
```

The timing-confidence rule is based on the genuine departure interval rather than an opaque score.

---

# 52. HONJIN-13 — Collector rolling request budget — completed

The old fixed-five-per-minute collector behavior is no longer current.

Production investigation established that Torn's documented rate allowance is per Torn user, shared across that user's keys. Rayza's browser key and collector key are currently keys for the same Torn user.

Accepted architecture:

```text
backend collector: rolling 50 Torn requests / any 60 seconds
frontend coordinator: soft 40 Torn requests / minute
engineering reserve: approximately 10 requests / minute
```

The backend budget is shared across faction and individual jobs and is computed from recent completed scheduler work rather than treating each cron callback as an independent allowance.

If Torn returns API error 5, remaining Torn work in that collector run must stop and unattempted jobs remain eligible for a later run.

Do not reduce observation quality by restoring the old five-request ceiling, and do not loosen Travel's departure-evidence rules merely to hide collection gaps.

---

# 53. HONJIN-14 — Collector scheduler race — completed

Production Travel diagnostics showed duplicate/overlapping transition evidence with implausibly broad departure windows. The root cause was overlapping scheduled collector executions, not the Travel duration model.

The accepted fix is:

- D1-backed single-flight scheduler lease;
- monotonic snapshot writes;
- migration 007 applied once in production;
- stale/overlapping work cannot overwrite a fresher snapshot;
- migrations 005/006/007 must not be rerun.

Collector production version after this fix is recorded in section 50.2.

This distinction matters for future debugging: do not widen Travel timing merely because an old duplicate transition exists. First distinguish current live evidence from historical pre-fix evidence.

---

# 54. HONJIN-15 — Usable Travel ETA policy — completed

Frontend commit:

```text
500401a Improve HONJIN travel ETA usability
```

Accepted departure-window policy:

```text
<= 120 seconds    HIGH timing confidence
121–300 seconds   MEDIUM timing confidence
301–600 seconds   LOW timing confidence, ETA still usable
> 600 seconds     ETA unavailable
```

For unresolved `airliner` travel, Standard is the primary ETA and BCT is shown as an alternate until elapsed/timing evidence rules BCT out.

Method confidence and timing confidence remain separate concepts.

---

# 55. HONJIN-16 — Arrival reconciliation grace — completed

Frontend commit:

```text
a9523ca Add HONJIN travel arrival grace
```

A real traveller exposed a short boundary condition where the calculated normal arrival had just passed but the currently displayed route/status had not yet reconciled to the next Torn snapshot.

Accepted rule:

```text
latest normal arrival exceeded by <= 120 seconds
+ currently displayed route still looks stale
    => Arrival due · awaiting travel update
```

After the 120-second grace on the same stale route, the existing conflict/unavailable behavior returns.

This is a **status reconciliation grace**, not an ETA-duration widening. It does not change normal travel durations or the ±3% travel model.

---

# 56. HONJIN-17 — WAR target LIFE intelligence — completed

Frontend commit:

```text
2b73226 Add WAR target LIFE intelligence
```

Product decision:

- Individual Spy keeps the existing browser-side profile/LIFE request path and labels it `LIFE`;
- Faction Spy deliberately does **not** enrich an entire faction roster with player-profile LIFE requests;
- WAR / WAR TARGETS may enrich a bounded actionable subset because LIFE is tactically useful there;
- LIFE remains ephemeral browser-side state and is not persisted as Recon/D1 evidence;
- ordinary member Torn API keys remain browser-side.

WAR LIFE implementation:

- recommendations first, then attackable targets;
- maximum **8 unique player profiles per enrichment pass**;
- player-profile cache: **30 seconds**;
- request coordinator priority: `optional`;
- only runs when the relevant WAR or WAR TARGETS workspace is visible and the war is active;
- global profile cache/dedupe allows an Individual Spy request for the same player to be reused;
- stale War-board handling clears LIFE rather than leaving old LIFE displayed as current.

The 8-target/30-second bound means the LIFE feature cannot turn a 100-member opponent roster into 100 profile requests every refresh.

---

# 57. HONJIN-18 — Foreign-hospital awareness — completed

Frontend commit:

```text
c903802 Add foreign hospital awareness
```

A real observation showed a player hospitalized in the Cayman Islands appearing in Hospital but disappearing from Travel → ABROAD. The underlying roster status already contained both the hospital state and foreign-hospital description, so this was a classification/rendering gap, not a missing-data problem.

Accepted behavior:

- `hospital` plus a deterministic known foreign-hospital description counts as **ABROAD** for Travel;
- Travel shows the player as `In <destination> · HOSPITAL` and uses the already-present hospital release timestamp for the countdown;
- no flight ETA is shown because the player is already abroad;
- Hospital separately shows canonical location and hospital cause/details;
- normal Torn City hospital status does not enter Travel → ABROAD;
- this path adds **no extra Torn request and no extra property-evidence request**.

Canonical destination parsing includes the Torn foreign destinations and common status adjectives, for example `Caymanian → Cayman Islands`, `Swiss → Switzerland`, `British → United Kingdom`, and equivalent mappings for Mexico, Canada, Hawaii, Argentina, Japan, China, UAE and South Africa.

---

# 58. HONJIN-19 — Scheduled Ranked War hardening — completed

Frontend commit:

```text
23f3cb4 Harden scheduled ranked war state
```

This is the final pre-matchup War hardening release before the next real Ranked War field test.

When Torn publishes a scheduled matchup:

- HONJIN still detects the opponent and loads the enemy roster/reconnaissance;
- the War screen presents **RANKED WAR MATCHUP / SCHEDULED**, not `ACTIVE RANKED WAR / LIVE`;
- it shows time remaining until War start;
- BS, FF, deterministic suitability and status reconnaissance may populate before start;
- War targets are forced non-attackable until `war.status === active`;
- the action surface says `WAR NOT STARTED` rather than exposing a War ATTACK affordance;
- a missing Ranked War target score displays `TARGET —`; the old static/fabricated `2,500` fallback is forbidden.

When Torn later reports the same war as active through the normal refresh path, normal attackability returns according to the target's current availability/status.

This is domain/view-model gating, not merely a hidden button, so the scheduled-war safety rule is inherited consistently by WAR and WAR TARGETS surfaces.

---

# 59. Next real Ranked War — field-acceptance plan

The next real Ranked War matchup is the principal remaining acceptance test. Do not redesign War behavior before observing it.

## 59.1 What should happen when matchmaking appears

Expected scheduled-matchup sequence:

1. HONJIN discovers the current Ranked War from the current user's existing live War capability.
2. SCATHE and the single opponent faction are identified deterministically.
3. The opponent roster loads automatically.
4. FFScouter public/free BS intelligence is batched for the roster; do not introduce per-member Torn profile fan-out for BS/FF.
5. WAR displays `RANKED WAR MATCHUP / SCHEDULED` and a start countdown.
6. WAR TARGETS can already show reconnaissance/suitability, but War attack actions remain locked.
7. If Torn has not yet supplied a target score, display `TARGET —`.

## 59.2 What should happen at War start

When Torn reports the War active:

- active-War presentation replaces scheduled presentation;
- eligible targets become attackable according to current availability/status;
- WAR target LIFE enrichment becomes eligible for the bounded top-eight browser-side profile path;
- Hospital and Travel continue to consume the same normalized War target states;
- War polling continues feeding Travel observations even if the Travel screen is not open, allowing take-off evidence to be recorded from existing War polling;
- stale refresh failure must preserve the board visibly but remove unsupported actionability rather than pretending old status is current.

## 59.3 Rate and scale expectations

A 100-member opponent roster must not cause 100 Torn profile requests.

Expected request architecture:

- enemy roster/status from the existing faction/War capability;
- FFScouter batched public/free enrichment;
- bounded optional LIFE enrichment for at most eight War targets per pass, cached 30 seconds;
- frontend 40/minute soft Torn coordinator budget remains authoritative;
- core War/status requests outrank optional LIFE enrichment.

If live War use exposes coordinator starvation, inspect actual request logs/order before changing budgets.

## 59.4 Intentional conservative behavior — recommendations

Do **not** assume that an empty `Top targets` / recommendation area means the War integration failed.

Production's recommendation path is intentionally conservative. The application can still provide:

- enemy roster;
- BS estimates;
- current-user FF;
- deterministic suitability labels;
- availability/status;
- `Best for me` sorting;
- Hospital/Travel context;
- bounded LIFE enrichment during active War;

while refusing to promote automatic top recommendations if the configured evidence-age/confidence policy does not support them.

Do not relax this policy during a live War merely to make the recommendation area look populated. Inspect real FFScouter timestamps/evidence first and calibrate explicitly after evidence is available.

## 59.5 Known resilience limitation

If FFScouter genuinely fails after its usable cache expires, HONJIN keeps the Torn roster/status path usable but may temporarily fall back to unknown BS/FF rather than preserving an indefinitely stale War BS/FF estimate.

This is safe degradation. Do not replace it with unsupported confident estimates during a live War.

## 59.6 Live-war evidence to capture if something looks wrong

For a quick War-thread diagnosis, capture only what is needed:

- screenshot of the affected WAR / WAR TARGETS state;
- current frontend commit (`git log -1 --oneline`);
- `git status --short`;
- browser-visible error or failing request details if present;
- focused command/test output for any patch;
- backend/D1 evidence only if the symptom actually implicates Recon collection or shared Travel observations.

Never put a real Torn API key in screenshots, logs, fixtures, source, Git or pasted diagnostics.

---

# 60. Current collaboration and release workflow

This is the expected working method for future threads, especially during the live War.

## 60.1 Source discipline

- Read this full updated-7 source before designing changes.
- Use the user's fresh source archive as the code authority for a patch; do not assume a disposable archive from an older thread equals local HEAD.
- Current accepted frontend baseline is `f0afcd4` until the user reports a later commit; section 65 is authoritative for the current production checkpoint.
- Ask for a fresh frontend archive for frontend patching. Request backend source only when backend work is genuinely implicated.
- Never claim code has been changed on Rayza's computer. Produce a patch; Rayza applies it and returns command output.

## 60.2 Command discipline

Rayza switches between terminal tabs. **Number every command block.**

Normal frontend patch sequence:

1. verify clean checkpoint/status;
2. `git apply --check`;
3. apply patch;
4. focused tests;
5. full `npm test`;
6. lint;
7. typecheck;
8. production build/PWA generation;
9. `git diff --check`;
10. inspect the exact diff/stat;
11. explicitly `git add` only intended files;
12. verify staged file count + staged diff check;
13. commit;
14. push frontend `main`;
15. confirm clean checkpoint;
16. deploy with Wrangler;
17. verify production HTTP response;
18. fully close/reopen installed PWA before visual acceptance.

Do not use `git add .` for release staging.

## 60.3 Backend discipline

- backend repository is local/deployment source only;
- do not push it to GitHub;
- inspect production state before deployment or D1 mutation;
- never rerun migrations 005, 006 or 007;
- a new schema change requires a new migration number;
- preserve the rolling 50/60 budget, scheduler lease, monotonic writes and explicit watch semantics unless production evidence proves a change is required.

## 60.4 Patch philosophy

Prefer the smallest coherent fix supported by evidence.

During the real Ranked War:

- do not opportunistically refactor unrelated code;
- do not create opaque scoring/reasoning;
- do not add leadership-granted faction permissions;
- do not add per-member Torn fan-out when existing roster/batched/public data is sufficient;
- do not persist ephemeral LIFE into D1;
- do not widen Travel timing to conceal observation/data bugs;
- distinguish UI/presentation defects from acquisition/data defects before adding requests;
- retain deterministic, explainable labels and safe stale-state behavior.

---

# 61. Updated-6 precedence rule

Where an older section conflicts with sections **50–60**, sections 50–60 are authoritative because they record the latest accepted implementation and production evidence through 3 October 2026.

In particular, the following older statements are superseded:

- `HONJIN-12` is pending — it is completed;
- the Recon collector uses a fixed five-request/minute ceiling — it uses the rolling 50-request/60-second budget;
- migrations 005/006 are the only protected migrations — **005/006/007** are all applied and must not be rerun;
- the frontend checkpoint is `78c79fb`, `a9523ca`, `2b73226` or `c903802` — current baseline is **`23f3cb4`**;
- the frontend production bundle/version is an older value — use section 50.1;
- a scheduled matchup may be labelled active or expose War ATTACK affordances — it must not;
- a missing War target score may fall back to a static `2,500` — it must show `—`;
- Faction Spy should retrieve LIFE for every faction member — it deliberately does not;
- foreign-hospital players should disappear from Travel — deterministic known foreign hospital states remain in Travel → ABROAD without extra calls;
- Travel should widen its ETA around short post-arrival status lag — it uses the 120-second arrival reconciliation grace instead;
- backend code should be pushed to GitHub — it must not be;
- future threads should request both repositories automatically — request only the fresh source actually required by the task, while never assuming old archives are current.

The next engineering milestone is **real Ranked War field acceptance**, followed only by evidence-driven fixes or calibration discovered from that War.


---

# 62. Real Ranked War field acceptance — 7 October 2026

The first real scheduled Ranked War matchup after the updated-6 checkpoint is
against **Existence**. Live use materially supersedes several earlier
recommendation and observation assumptions. This section records accepted
production behavior through frontend commit **`f0afcd4`** and Cloudflare
production version **`b3a6d11e-365b-4587-825c-38039a15285b`**.

The matchup remains a real live/scheduled Ranked War. Any separate agreement
between faction leadership about how the war will be fought is gameplay/social
context only; HONJIN must continue to model the authoritative Torn war state and
must not add special "terms" logic.

## 62.1 Scheduled-war presentation is field accepted

Observed production behavior confirms:

- scheduled matchup discovery works;
- opponent identity, opponent roster and target score populate before start;
- WAR shows `RANKED WAR MATCHUP / SCHEDULED` with a countdown;
- reconnaissance remains live before start;
- WAR and WAR TARGETS keep attack actions locked with `WAR NOT STARTED` until
  Torn reports the war active;
- current-user adjusted/modified BS is used when its Torn modifier evidence is
  fresh and valid;
- stale current-user modifier evidence falls back to base BS rather than
  silently retaining an expired combat state.

## 62.2 WAR opponent shared observation is field accepted

The scheduled/active Ranked War opponent faction is automatically registered
with the existing shared Recon watch facade from the live War shell.

Accepted behavior:

- register the single opponent **faction**, not one watch per member;
- registration is best-effort and must not break local War use if shared Recon
  is unavailable;
- renew shared opponent-faction interest on the existing bounded renewal path
  while the scheduled/active War shell is in use;
- browser-origin War registration still receives the bounded public/shared
  watch semantics; it does not grant the browser the ability to assign the
  server-controlled `active-war` scheduler priority;
- no ordinary member Torn key, HONJIN user identity or privileged faction key
  is sent to the collector;
- no per-member Torn profile fan-out is introduced merely to observe the war
  roster.

The existing public shared-watch lease remains **48 hours renewable**. Gaps in
actual collector coverage must be represented honestly in any historical
feature rather than filled with invented observations.

## 62.3 WAR Travel observation is field accepted

Real War targets now expose useful inbound/outbound travel evidence and ETA
windows from shared/local observation, including examples where previously
missed take-offs produced `ETA unavailable` and later observed targets produced
bounded `LANDS IN ...` windows.

Accepted interpretation:

- Travel must continue to use genuine observed transition windows;
- an opponent first seen already airborne must not be assigned a fabricated
  take-off time;
- shared faction observation is the correct scale mechanism for War travel;
- existing HONJIN travel-method inference, property evidence and ETA variance
  rules remain separate from the activity-history work defined below.

## 62.4 Personalised Top Targets — field-accepted policy

The older availability-first and confidence-first shortlist is superseded.
Live War evidence showed that it could recommend very weak opponents to a
stronger SCATHE member while materially better strength matches remained in the
roster. That works against faction-wide strength allocation: very weak opponents
are more useful to weaker/newer SCATHE members when stronger members have
appropriate stronger targets available.

WAR `Top targets` is now a **stable personalised target pool**, not merely a
"who can I hit this instant" list.

Accepted deterministic policy:

1. start from the full current Ranked War opponent roster;
2. require valid current-user BS and a numeric opponent estimated BS;
3. use the current-user adjusted/modified BS when authoritative and fresh,
   otherwise the accepted base-BS fallback;
4. current availability does **not** decide membership or ordering of Top
   Targets;
5. FFScouter confidence/freshness does **not** decide membership or ordering of
   Top Targets;
6. Fair Fight does **not** decide membership or ordering of Top Targets;
7. current health/LIFE does **not** decide membership or ordering of Top
   Targets;
8. current-user-ID diversification/random-like tie breaking does **not** decide
   ordering;
9. automatic WAR targets use the explicit strength-fit bands:
   - **primary:** enemy >50% and <=75% of current-user BS;
   - **secondary:** enemy >25% and <=50% of current-user BS;
10. within one automatic band, prefer the **stronger opponent estimated BS**;
11. use enemy player ID only as the final deterministic collision fallback;
12. select **up to 10**; do not pad the list merely to reach 10;
13. enemy <=25% of current-user BS remains visible in WAR TARGETS but is not
    used as automatic Top-Target padding;
14. enemy >75% remains visible for manual consideration and is not
    automatically promoted by the default WAR shortlist.

This policy intentionally distributes useful enemy tiers more naturally across
SCATHE members of different strengths without introducing reservations,
allocation locks or an opaque faction-wide assignment engine.

Availability still controls **actionability**. Hospital, travelling, abroad or
scheduled-war targets may remain in the user's personalised Top Targets, but
must not expose an active attack action when the authoritative state says they
are unavailable.

## 62.5 Confidence and freshness are metadata, not WAR ranking authority

HONJIN still records and exposes FFScouter estimate age, confidence and
freshness because they help a player judge the estimate. They no longer veto or
reorder WAR Top Targets merely because the public estimate is old, LOW or
UNKNOWN confidence.

Accepted UI behavior:

- compact/list target cards do **not** display a HIGH/MEDIUM/LOW confidence
  badge;
- target/player detail (`ⓘ`) continues to expose the estimate timestamp,
  confidence/freshness and source/evidence context;
- confidence/freshness must not be silently discarded from the normalized
  model merely because they no longer control WAR ranking;
- FFScouter failure still degrades honestly: if there is no numeric estimated
  BS at all, HONJIN cannot manufacture a strength-fit recommendation.

This keeps provenance available without making provenance the primary gameplay
surface.

## 62.6 `BEST FOR YOU` is the shared personalised sort

`BEST FOR YOU` replaces the old `Best for me` / `DEFAULT ORDER` semantics where
personalised ordering is appropriate.

Accepted surfaces:

- WAR Top Targets;
- WAR TARGETS;
- Spy Room — INDIVIDUAL;
- Spy Room — FACTION.

WAR Top Targets remains the filtered automatic 25%-75% pool described in
section 62.4.

WAR TARGETS `BEST FOR YOU` is a **sort over the full visible roster**, not a
filter. Its explicit order is:

1. >50% to <=75% (`useful-smaller-margin`);
2. >25% to <=50% (`useful-larger-margin`);
3. >75% to <=100% (`close` / manual consideration);
4. <=25% (`undermatched`);
5. >100% (`above-own`);
6. unknown/unclassifiable fit.

Within one fit tier, prefer stronger estimated BS, then use player ID as the
stable fallback.

Spy Room `BEST FOR YOU` uses the same fit-tier ordering over the saved
individual shortlist or selected faction workspace. It **does not filter or
promote Spy targets into WAR recommendations**. Existing explicit BS, FF,
status, level and name sorts remain available where already supported.

---

# 63. Observed player activity heat maps — accepted v0.1 design

The next evidence-driven feature is a per-player **Observed activity** heat map.
The live War provides a useful multi-day collection window, but the feature must
remain generally useful outside War for saved Spy Room targets.

The heat map is an observational aid, not a prediction engine. It must answer:

> **When has HONJIN actually observed this player being active?**

It must not claim:

- that the player will definitely be online at a future time;
- that a sparse observation gap means the player was offline;
- that HONJIN knows the player's real-world timezone, sleep schedule or identity;
- that last-action timestamps alone prove continuous online presence.

## 63.1 Surface and scope

The primary heat map is **per player** and belongs inside the existing
player-detail / `ⓘ` drawer rather than on compact list cards.

It should be reachable from:

- WAR Top Targets;
- WAR TARGETS;
- Spy Room individual targets;
- Spy Room faction targets;
- other existing target surfaces that already open the same player-detail
  model, provided no extra polling path is introduced solely for the UI.

The initial UI is a **7 × 24 grid**:

- rows: day of week;
- columns: hour of day;
- canonical time basis: **Torn City Time / UTC**;
- source history: the current rolling **7-day** window;
- each cell remains a one-hour bucket; the axis should label every three hours
  (`00`, `03`, `06`, `09`, `12`, `15`, `18`, `21`) for mobile readability;
- cell intensity: proportion of known presence samples classified as observed
  activity for that weekday/hour bucket;
- unknown/missing evidence is not painted as offline.

The drawer must state the time basis explicitly.

## 63.2 Deterministic activity classification

Use Torn's explicit last-action presence status when supplied by the allowed
roster/player source.

Normalize observation presence to:

- `online`;
- `idle`;
- `offline`;
- `unknown`.

For v0.1 heat intensity:

- `online` and `idle` count as **observed active**;
- `offline` counts as **observed inactive**;
- `unknown` is excluded from the active/inactive denominator.

Do **not** infer `online` from an arbitrary last-action-age threshold when Torn
already supplied an explicit presence status.

The helper text should make the rule inspectable, for example:

> `Active = Torn Online or Idle when HONJIN observed the target. Unknown samples are excluded.`

This rule is intentionally simple and may be calibrated later from field use,
but it must remain centralized and testable.

## 63.3 Coverage and sparse evidence

Every heat map must show observation coverage so a visually strong cell cannot
hide weak evidence.

Expose at least:

- rolling observation-window start/end;
- total known presence samples;
- number of covered hourly buckets;
- last activity observation time;
- a clear `NOT ENOUGH ACTIVITY DATA YET` state when coverage is insufficient.

Initial sparse-cell rule:

- fewer than **3 known presence samples** in a weekday/hour cell is insufficient
  for a normal heat intensity;
- render that cell as sparse/neutral rather than pretending a 1/1 observation
  is a strong pattern.

Do not add a probabilistic confidence score.

## 63.4 Rolling history window

Use a rolling **7-day** source window for v0.1 aggregation.

Reasons:

- Ranked War and scheduled-matchup recon are tactical, short-horizon workflows;
- HONJIN normally observes an opponent faction for days rather than weeks;
- a seven-day window prevents several-week-old activity from diluting the
  current matchup picture;
- the collector cadence already provides many observations inside each covered
  hour, so useful intensity does not require four weekday cycles;
- saved Spy Room targets still retain a full recent week of observational
  context;
- storage remains bounded.

The 7 × 24 grid is weekday/hour-shaped, but it does **not** imply a 28-day
history. Each cell is derived only from matching observations inside the current
rolling seven-day source window. Coverage metadata must make unobserved hours
obvious rather than treating them as offline.

## 63.5 Collector storage — migration 008 required

Current production D1 cannot honestly backfill this heat map.

At the updated-7 checkpoint:

- `faction_snapshots` stores only the **latest** faction snapshot payload;
- `individual_player_snapshots` stores only the **latest** individual snapshot;
- travel/state transition tables retain transitions, but not every historical
  presence observation;
- the collector snapshot model currently retains `lastActionAt` but does not
  retain the explicit historical `Online / Idle / Offline` presence status as a
  time series.

Therefore:

- do **not** fabricate pre-feature heat-map history from current snapshots;
- do **not** treat state transitions as presence samples;
- do **not** reconstruct historical online state merely from old
  `last_action_at` values.

A schema change requires **migration 008 or later**. Never rerun migrations
005/006/007.

The preferred v0.1 storage shape is **hourly aggregation**, not one permanent D1
row per minute/sample.

Recommended table concept:

```text
player_activity_hours
- player_id
- hour_start_utc
- faction_id nullable
- sample_count
- online_count
- idle_count
- offline_count
- unknown_count
- latest_last_action_at nullable
- last_observed_at
PRIMARY KEY (player_id, hour_start_utc)
```

On each successful watched-player observation:

- classify explicit presence;
- upsert/increment the appropriate UTC-hour row;
- batch faction-member activity writes where practical;
- keep this D1 work separate from Torn request budgeting: one faction roster
  request may legitimately yield many local activity counter updates;
- prune rows older than the accepted rolling-retention horizon plus only the
  minimal operational grace required for safe aggregation.

This avoids millions of unnecessary raw minute rows while preserving enough
information for the 7×24 observed-activity view.

## 63.6 Watch coverage

Activity collection reuses existing watch architecture:

- scheduled/active War opponent faction watch covers the War roster;
- saved Spy Room individual targets use their existing individual watch;
- the selected/saved Spy Room faction workspace uses its existing faction
  watch;
- duplicate faction/individual observations for the same player/hour must not
  create a false activity bias; aggregation logic must account for duplicate or
  overlapping same-observation coverage deterministically.

Do not add a new per-player Torn fan-out for a watched faction.

The existing rolling collector request budget remains **50 Torn requests in any
60-second collector window** across faction and individual jobs. Heat-map
storage must not increase that Torn request ceiling.

The existing renewable 48-hour public/shared-interest lease remains a real
coverage constraint. A heat-map coverage gap caused by an expired watch must
remain a gap; HONJIN must not interpolate it as online or offline.

## 63.7 Public/shared API

The public facade should expose a bounded per-player activity summary suitable
for the drawer without returning raw long-term observation logs.

Preferred response concept for one player:

```text
playerId
windowStart
windowEnd
sampleCount
knownSampleCount
coveredHourCount
lastObservedAt
lastActiveObservedAt
cells[7][24]:
  activeCount
  inactiveCount
  knownCount
  totalCount
peakWindows[] optional
```

The public response must:

- expose no Torn key, diagnostics token or HONJIN user identity;
- reveal only observational status history already collected through accepted
  public/shared watch paths;
- enforce bounded player IDs / response size;
- remain usable independently of current-user-specific FF or BS data.

The frontend should fetch heat-map data on opening/using player detail rather
than preloading heat-map history for every card in a roster.

## 63.8 Heat-map presentation

Initial player-detail presentation:

- heading: `OBSERVED ACTIVITY`;
- 7×24 TCT/UTC grid with one-hour cells;
- hour-axis labels every three hours: `00`, `03`, `06`, `09`, `12`, `15`, `18`, `21`;
- compact legend from sparse/low to high observed activity;
- coverage summary;
- last observed activity;
- optional deterministic top observed windows when enough data exists;
- an explicit no/sparse-data state.

A cell interaction may show exact evidence such as:

```text
Tuesday 19:00–20:00 TCT
Active 8 / 11 known observations
3 unknown observations excluded
```

Do not put the full heat map on list cards. The primary list must remain focused
on target choice/status.

## 63.9 Deterministic peak-window summary

If implemented in v0.1, `peakWindows` must be derived from the same cells rather
than a separate score.

Initial rule:

1. consider only cells meeting the sparse-cell minimum;
2. rank by active proportion descending;
3. then known-sample count descending;
4. then day/hour ascending as deterministic fallback;
5. expose at most three cells/windows.

Do not call this a prediction or probability. Label it as **Most observed
activity** or equivalent.

## 63.10 Heat-map acceptance criteria

Before declaring the feature accepted, prove:

- migration number is 008 or later and 005/006/007 were not rerun;
- no new Torn request path is created merely for heat maps;
- a watched War faction produces activity history for its members from faction
  polling;
- a saved individual Spy target produces activity history from the individual
  watch path;
- a watched Spy faction produces member activity without per-member Torn
  profile fan-out;
- duplicate coverage does not inflate a player's activity ratio;
- `Online`, `Idle`, `Offline` and `Unknown` normalize deterministically;
- unknown samples are not counted as offline;
- sparse cells render as sparse;
- 7-day pruning works;
- public activity reads expose no secrets;
- the player drawer renders useful partial history after only a few days;
- existing WAR/Travel/Hospital/Spy behavior and request budgets remain intact.

---

# 64. Heat-map implementation sequence

Proceed in the following order.

## 64.1 Inspect production before mutation

Before applying migration 008 or deploying backend changes:

- inspect the live Recon Engine version;
- confirm the shared D1 database/bindings used by `scathe-honjin` and
  `scathe-honjin-intel`;
- confirm migrations 005/006/007 remain applied exactly once;
- inspect current watch coverage for the live War opponent and saved Spy
  targets;
- record current schema and recent scheduler health without exposing secrets.

## 64.2 Backend domain/storage patch

Implement:

- explicit collector presence field (`online` / `idle` / `offline` / `unknown`);
- migration 008 hourly activity storage;
- faction and individual collector aggregation writes;
- deterministic duplicate handling;
- bounded retention/pruning;
- unit/integration tests for aggregation and pruning.

Do not change collector request budget, scheduler lease, or Torn polling fan-out
unless separate production evidence proves it necessary.

## 64.3 Public activity read

Add the bounded shared-intel activity endpoint and tests for:

- one watched player;
- no-history response;
- sparse history;
- aggregation across repeated weekday/hour cells;
- CORS/bounds/security behavior.

## 64.4 Frontend activity model and drawer UI

Add:

- normalized activity-summary type;
- shared-intel client method;
- player-detail loading/error/empty states;
- 7×24 responsive heat map;
- coverage/legend/evidence interaction;
- no list-card heat-map clutter;
- no extra Torn request coordinator work.

## 64.5 Live field acceptance

Use the real War and saved Spy targets to observe at least several days of data.
Check:

- whether the grid becomes useful with real collector cadence;
- whether war/spy lease gaps are visible rather than concealed;
- whether Online+Idle is the right v0.1 definition of observed activity;
- whether the 3-sample sparse-cell threshold is sensible;
- whether 28 days is sufficient retention;
- whether peak-window summaries help or merely duplicate the grid.

Tune only from observed evidence. Do not add an opaque learned activity score.

---

# 65. Updated-7 precedence rule

Where an older section conflicts with sections **62–64**, sections 62–64 are
authoritative because they record the latest real Ranked War evidence and the
accepted next-feature design through **7 October 2026**.

In particular, the following older statements are superseded:

- WAR Top Targets are an availability-first rolling actionable shortlist — Top
  Targets are now a stable personalised whole-roster pool, while availability
  separately controls current actionability;
- LOW/UNKNOWN/stale FFScouter confidence automatically excludes or demotes a
  numeric BS estimate from WAR recommendations — confidence/freshness is now
  retained as inspectable metadata and does not control WAR Top-Target
  membership/order;
- the >25%-<=50% band is preferred ahead of >50%-<=75% — the **>50%-<=75% band
  is now primary**, followed by >25%-<=50%;
- <=25% opponents are used to pad/fallback automatic Top Targets — they remain
  visible but are not used merely to fill the default WAR shortlist;
- stable current-user-ID diversification should reorder comparable WAR
  candidates — it no longer participates in Top-Target ordering;
- `Best for me` / `DEFAULT ORDER` are the accepted personalised sort labels —
  use selectable **`BEST FOR YOU`** where personalised ordering is supported;
- compact list cards must display confidence — confidence remains in player
  detail/intel instead of the operational list-card classification row;
- automatic War-opponent shared observation remains future/operator-only — the
  scheduled/active War shell now registers the opponent faction through the
  existing bounded shared-watch facade;
- the next engineering milestone is merely real-War field acceptance — core
  scheduled-War behavior, War Travel observation and the revised personalised
  targeting model have now been field accepted; the next feature package is
  **per-player Observed activity heat maps**.

The current frontend production checkpoint is **`f0afcd4`** and production
version **`b3a6d11e-365b-4587-825c-38039a15285b`** until the user reports a
later accepted deployment.
