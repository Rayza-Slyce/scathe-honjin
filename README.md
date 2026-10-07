# SCATHE HONJIN

## Canonical product and architecture specification

The authoritative specification is `SCATHE-HONJIN-SOURCE-OF-TRUTH-v0.1-updated-7.md`. Read it fully before implementation work. Where older planning/checkpoint material conflicts with its latest precedence section, the updated-7 document is authoritative.

HONJIN is a mobile-first Ranked War companion built for SCATHE.

It brings the information you actually need into one place: target strength, Fair Fight context, hospital status, travel state, Spy Room intelligence, team status and quick access to Torn profiles.

**Live app:**

https://scathe-honjin.rayza-slyce.workers.dev

## Why HONJIN?

**Honjin — 本陣 — originally referred to a general's main camp or field headquarters: the place from which a battle was directed.**

The name complements SCATHE's feudal Japanese / samurai theme, but it also describes what the app is meant to be: a central place for the information you need before deciding who to hit, who to watch and what is happening around the war.

## WAR / TARGETS

You do not need to manually build the enemy roster for each Ranked War.

HONJIN uses Torn's available war and faction information to identify the current opponent and populate the WAR and WAR TARGETS views.

Targets are classified using clear, deterministic rules based on your own battle stats and the available opponent intelligence.

There is no hidden target score and no AI-generated guess deciding who you should attack.

HONJIN can show:

- estimated opponent battle stats;
- Fair Fight information from FFScouter where available;
- current Torn status;
- hospital information;
- travel information;
- health where available;
- your own effective battle stats when Torn reports temporary stat modifiers.

Target suitability is personalised to the currently connected HONJIN user.

The **ATTACK** button opens the player's Torn profile. The actual attack is still carried out through Torn.

## SPY ROOM

Spy Room lets you investigate players and factions outside the current Ranked War.

You can:

- search for an individual player;
- save a shortlist of individual players;
- load a faction and inspect its roster;
- sort targets by level, estimated battle stats, Fair Fight, status or name;
- feed saved targets into HONJIN's Hospital and Travel views.

## HONJIN Recon Engine

Some useful intelligence depends on seeing a player's state change over time. A browser cannot reliably do that after you close the app.

HONJIN therefore has a Recon Engine that can continue observing saved Spy Room targets while members are away.

This is especially useful for travel intelligence because seeing a player change from one state to another can provide better timing evidence than finding them already halfway through a flight.

### How long does a recon watch stay active?

A saved Spy Room target keeps a renewable **48-hour recon watch**.

In normal use you do not need to manage this yourself.

**Opening HONJIN renews the recon watch for targets you still have saved.**

While you continue using HONJIN, those saved targets can also be renewed as they are used.

If nobody opens HONJIN with that target saved for more than 48 hours, its recon watch expires and HONJIN stops spending background requests on it.

The target is not removed from your own Spy Room.

The next time you open HONJIN with that target still saved, the app registers it again automatically and recon resumes.

If another SCATHE member also has the same target saved, their use of HONJIN can keep the same recon watch active. HONJIN deduplicates shared watches rather than creating a separate background job for every member.

### What is shared?

The Recon Engine deals with public opponent observation needed for features such as travel state and state transitions.

It does **not** receive your personal Torn API key.

It does **not** provide your personal Fair Fight calculation or personalised battle-stat comparison to other users.

Your personalised target intelligence remains based on the currently connected user.

## HOSPITAL

The Hospital view brings together hospitalised WAR and saved Spy Room targets.

Where Torn provides the information, HONJIN can show:

- hospital state;
- remaining hospital time;
- hospital reason;
- relevant target intelligence.

During an active Ranked War, HONJIN defaults to keeping the view focused on war targets. You can choose to include saved Spy Room targets as well.

## TRAVEL

The Travel view tracks known travelling or abroad opponents and estimates when useful travel timing can be supported by evidence.

HONJIN owns its travel estimation logic. It does not require a paid FFScouter account for travel timing.

Possible evidence includes:

- observed Torn travel-state changes;
- origin and destination;
- aircraft image type;
- public current-property evidence where available;
- known Torn travel durations.

For example, a current `light_aircraft` observation combined with fresh evidence that the player has a Private Island with an Airstrip can support a high-confidence Airstrip-method inference.

An `airliner` image cannot by itself distinguish Standard travel from Business Class, so HONJIN keeps that case deliberately ambiguous.

### Travel timing is an estimate

HONJIN does not invent an exact departure time just because it sees somebody travelling.

The strongest timing comes from actually observing a state transition or route change.

If HONJIN first discovers somebody after they are already airborne, an ETA is unavailable because there is no supported departure window to calculate from.

The Recon Engine improves the chance of catching those transitions even while your own phone or browser is closed.

Travel ETAs should always be treated as evidence-based estimates, not guaranteed landing times.

HONJIN shows the reasoning behind its travel inference so you can see what evidence was used.

## TEAM

The Team view shows the current SCATHE roster with useful live information including:

- online / offline state;
- hospital state;
- travel state;
- level;
- last action.

Player names can be opened for more detail.

## Automatic refreshing

HONJIN refreshes relevant live information automatically while the app is open.

Active browser-side information generally uses a roughly 15-second refresh cycle, with central caching and request coordination to avoid unnecessary Torn API traffic.

Some slower-changing information is cached for longer.

Manual refresh controls are available when you want an immediate update, but normal use should not require constantly pressing refresh.

The HONJIN Recon Engine has its own tightly limited background request budget and is separate from your personal Torn API usage.

## Battle stats and Fair Fight

HONJIN uses FFScouter's public/free intelligence for opponent battle-stat estimates and Fair Fight context.

Fair Fight information is specific to the currently connected user where supported.

HONJIN does not pretend an estimated battle-stat value is exact.

Target suitability is determined using visible rules and the available evidence rather than an opaque scoring engine.

When Torn provides current modifiers to your own battle stats, HONJIN can use those current values when deciding how an opponent compares with you.

## Your Torn API key

HONJIN needs a read-only Torn API key to identify you, load your information and personalise the app.

The important part:

**Your Torn API key is never stored on the HONJIN backend or sent to the Recon Engine.**

By default, the key is kept for the current browser session.

If you explicitly enable **Remember this device**, HONJIN stores the key in that browser so you do not need to reconnect every time.

Do not enable that option on a shared or untrusted device.

Disconnecting / forgetting the device removes HONJIN's stored copy of the key.

Your key is used by the app for the Torn requests needed for your session.

Use a Torn key with only the permissions you are comfortable granting.

## What HONJIN stores locally

Some non-secret state is saved on your device so the app can restore your workspace.

This can include:

- saved individual Spy Room player IDs;
- your saved faction workspace;
- travel observation history;
- Hospital watch state;
- preferences such as theme;
- your Torn API key only if you explicitly choose **Remember this device**.

Saved Spy Room identities are also what allow HONJIN to re-register their recon watches automatically when you open the app.

## Installing HONJIN

HONJIN is a Progressive Web App.

You can use it directly in your browser or install it on your phone.

Open:

https://scathe-honjin.rayza-slyce.workers.dev

Then use your browser's **Add to Home Screen** / **Install App** option.

Once installed, HONJIN behaves much more like a normal phone app.

After a new HONJIN version is deployed, closing and reopening the installed app ensures the latest version is loaded.

## Dark and light mode

HONJIN defaults to dark mode.

Use the moon / sun control in the header to switch between dark and light themes.

Your choice is remembered on that device.

## What HONJIN does not do

HONJIN does not:

- require leadership to provide a faction API key for its core features;
- require privileged faction attack or revive feeds;
- store ordinary members' Torn API keys on a backend;
- send your Torn API key to the Recon Engine;
- use a hidden or opaque target-scoring system;
- pretend estimated opponent battle stats are exact;
- claim an exact travel departure time without observation evidence;
- guarantee travel arrival times;
- replace Torn itself for attacking players.

HONJIN is designed to provide useful intelligence while keeping the evidence, uncertainty and reasoning visible.

## Current status

HONJIN is live and usable now.

The browser app, HONJIN Recon Engine, individual Spy watches, faction Spy watches and persistent travel observations have all been tested in production.

The next Ranked War will provide the full field test of the complete live WAR, TARGETS, HOSPITAL and TRAVEL workflow under real war conditions.

If something looks wrong, especially during a war, report what you saw and roughly when it happened so it can be checked against the available observations.

---

**Built for SCATHE.**

HONJIN gives us the intel to pick our targets wisely and leave the streets of Torn stained with their blood.
