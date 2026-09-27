# SCATHE HONJIN — COMPLETE PROJECT SOURCE OF TRUTH

**Status:** Initial approved project source of truth
**Version:** v0.1 source of truth
**Date:** 20 September 2026
**Last implementation checkpoint:** 27 September 2026
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

Avoid per-player Torn polling.

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
- Airstrip/Pilot supporting evidence;
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
29. TARGETS remains useful without an active Ranked War through SPY ROOM.
30. Individual Spy Room recon can retain up to 10 selected players until the user removes them.
31. Faction Spy Room recon supports one selected faction at a time and refreshes live intelligence rather than treating persisted values as current.
32. Browser favicon and installed-PWA identity are derived from the canonical HONJIN emblem.
33. Player IDs stay out of compact operational player lists and remain available through tappable player detail.
34. When authoritative current-user modifier data is fresh, HONJIN uses current modified BS for deterministic personalised suitability/recommendation ratios and falls back explicitly to base BS when that modifier evidence is unusable.
35. HONJIN provides accepted dark and light themes through shared semantic design tokens, with dark as the default and a compact persisted header toggle.
36. ATTACK provides reliable one-tap Torn navigation by opening the target player's profile when the direct Torn attack-loader route is unreliable.

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
