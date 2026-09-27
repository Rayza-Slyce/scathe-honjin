# SCATHE HONJIN

HONJIN is a mobile-first Ranked War companion built for SCATHE.

It brings the information you actually need during war into one place: target strength, Fair Fight context, hospital status, travel state, spy intel, team status and quick access to Torn profiles.

**Live app:**

https://scathe-honjin.rayza-slyce.workers.dev

## Why HONJIN?

**Honjin — 本陣 — originally referred to a general's main camp or field headquarters: the place from which a battle was directed.**

The name was chosen to complement SCATHE's feudal Japanese / samurai theme, but it also fits what the app is meant to be: a central place for the information you need before deciding who to hit, who to watch and what is happening around the war.

## What HONJIN does

### WAR / TARGETS

You do not need to manually set up each Ranked War.

When a Ranked War is planned, HONJIN automatically detects it and populates the WAR section with the opposing faction and its roster. When the war begins, the same workspace becomes your live war view.

HONJIN then helps sort opponents into clear, explainable categories based on your own battle stats.

Targets are labelled using deterministic rules rather than a hidden score or AI guess.

HONJIN also shows:

- estimated opponent battle stats;
- Fair Fight information from FFScouter where available;
- current player status;
- hospital information;
- travel information;
- your own effective battle stats when temporary modifiers are active.

The **ATTACK** button opens the player's Torn profile, where Torn's own attack button can be used.

### SPY ROOM

Search for individual players or entire factions outside the current war.

Useful for:

- checking someone before a fight;
- building a shortlist of players;
- looking through another faction;
- sorting players by level, estimated battle stats, Fair Fight, status or name.

Saved Spy Room targets can also feed into Hospital and Travel views.

### HOSPITAL

Shows hospitalised war and Spy Room targets, including hospital timers and reasons where Torn provides them.

During a Ranked War, HONJIN defaults to showing war targets first.

### TRAVEL

Tracks known travelling players and estimates, where useful, when they may return.

HONJIN builds its own travel observations from Torn state changes and available evidence rather than relying on a premium FFScouter account.

Leaving HONJIN open gives it more opportunities to observe travel transitions. Browsers and phones can throttle background tabs, so take-off timing should still be treated as an estimate rather than a guarantee.

### TEAM

Shows the current SCATHE roster with useful live status information including:

- online/offline state;
- hospital status;
- travel state;
- level;
- last action.

Player names can be opened for more detail without filling the main list with Torn IDs.

## Automatic refreshing

HONJIN refreshes live data automatically while it is running.

Most active data uses a roughly 15-second refresh cycle, with caching and request coordination to avoid unnecessary Torn requests.

Some slower-changing information is cached for longer.

Manual refresh controls are there when you want an immediate update — normal use should not require constantly pressing refresh.

## Your Torn API key

HONJIN needs your Torn API key so it can personalise information to you.

The important bit:

**Your Torn API key is not stored on a HONJIN server.**

HONJIN currently keeps the key only for your browser session and makes the required API requests from the app.

There is no HONJIN backend storing faction members' API keys.

As always, only use an API key with the permissions you are comfortable granting.

## Installing HONJIN

HONJIN is a Progressive Web App, so you can use it directly in your browser or install it to your phone.

Open:

https://scathe-honjin.rayza-slyce.workers.dev

Then use your browser's **Add to Home Screen** / **Install App** option.

Once installed, HONJIN behaves much more like a normal phone app.

## Dark and light mode

HONJIN defaults to dark mode.

Use the moon/sun switch in the header to change between dark and light themes.

Your choice is remembered on that device.

## What HONJIN does not do

HONJIN does not:

- require leadership to grant access to a faction API key;
- depend on privileged faction attack or revive feeds;
- store your Torn API key on a backend;
- use a hidden or opaque target-scoring system;
- guarantee exact travel departure or arrival times;
- replace Torn itself for attacking players.

It is designed to give you better information quickly while keeping the reasoning visible.

## Current status

HONJIN is live and usable now.

The main features have been tested locally and on mobile, and the production PWA is deployed on Cloudflare.

The next Ranked War will provide the proper live-war field test for the full target, hospital and travel workflow.

If something looks wrong during use, especially during war, report what you saw and roughly when it happened so it can be checked properly.

---

**Built for SCATHE.**

HONJIN gives us the intel to pick our targets wisely and leave the streets of Torn stained with their blood.
