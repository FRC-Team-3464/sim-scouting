# Phase 1.5 — Correct and Expand the Product Analysis

The Phase 1 analysis previously produced in this project was based on the
assumption that the existing Sim-City Scouting application would be redesigned
and modernized.

That assumption has changed.

Treat this project as a greenfield rewrite of the FRC scouting product, with a
controlled migration from the existing application.

The existing screenshots, routes, form fields, API payloads and source code are
a legacy implementation inventory. They are not the target interaction model
and should not constrain the new information architecture or user experience.

Review:

1. The existing Phase 1 analysis
2. match-scouting-page.md
3. sim-city-scouting-pwa-requirements.md
4. match-scouting-page-enhanced.md
5. All supplied legacy UI screenshots

Do not discard valid findings from the original Phase 1 analysis. Instead,
identify which conclusions remain valid, which require revision, and which
should be removed.

## Product goal

Design a state-of-the-art, offline-first, future-proof FRC scouting PWA for:

- Match scouts
- Pit scouts
- Scouting leads
- Strategists
- Drive team members
- Team administrators

The new application uses:

- React
- TypeScript
- Vite
- Tailwind CSS v4
- A separate Node.js backend
- IndexedDB for structured offline data
- A service worker for PWA application caching
- A versioned, season-configurable scouting model

Do not use Next.js.
Do not use React Server Components.
Do not replace the Node.js backend.
Do not introduce Supabase or a different backend platform.
Do not begin implementation during this phase.

## Core product direction

The new product should be assignment-driven rather than form-driven.

A scout should normally open an assignment such as:

Qualification 34
Team 3464
Red Alliance — Station 2

The application should derive event, match, team, alliance, station, scout and
schedule information whenever that information is available.

Manual event, match and team entry should only be a fallback workflow.

The application should capture robot-attributable actions and strategic
observations that official match results cannot provide.

The scouting model should support timestamped observations rather than relying
only on final counters.

The annual FRC game must be configurable through a versioned season package
using a controlled registry of supported scouting components. Do not create an
unrestricted generic JSON form renderer.

## Required Phase 1.5 output

Produce the following:

### A. Original Phase 1 assessment

Create a table containing:

- Original conclusion
- Keep
- Revise
- Remove
- Explanation

### B. Legacy application assessment

Categorize every major current feature as:

- Preserve as-is
- Preserve the data but redesign the experience
- Replace completely
- Derive automatically
- Retain only for migration compatibility
- Remove

Include:

- Landing page
- Authentication
- Match setup
- Match scouting
- Teleop shifts
- Counters
- Yes/No controls
- Endgame
- Finale
- Pit scouting
- Local Data
- Submission and recovery
- Navigation

### C. Target product model

Define the target workspaces:

1. Scout workspace
2. Strategy workspace
3. Event-management workspace
4. Administration workspace

Describe the main users, goals and workflows for each.

### D. Target information architecture

Recommend:

- Mobile navigation
- Tablet navigation
- Desktop navigation
- Event context
- Assignment context
- Global offline/sync status
- User and role controls

Do not simply convert the existing landing-page buttons into navigation items.

### E. Match scouting interaction model

Recommend a new interaction model based on:

- Assignment-driven setup
- Automatic match-phase progression
- Timestamped scouting events
- One-tap undo
- Fast action controls
- Field zones
- Optional detailed coordinates
- Scout confidence
- Post-match review
- Offline submission
- Conflict and duplicate handling

Do not assume that exact individual game-piece counting is always the most
accurate scouting method. Support configurable methods such as:

- Exact counts
- Volley or batch logging
- Made and missed attempts
- Cycle events
- Scoring-rate intervals
- Quantity ranges
- Confidence levels

Clearly identify which methods require user testing before final selection.

### F. Pit scouting product model

Redesign pit scouting around:

- Team identity
- Robot photos
- Dimensions and weight
- Drivetrain
- Mechanisms
- Game-specific capabilities
- Autonomous capabilities
- Endgame capabilities
- Programming and controls
- Reliability
- Repairability
- Driver experience
- Pit claims requiring match verification

Pit scouting should be team/event based and should not require a match number.

### G. Offline-first state model

Define:

- Local draft
- Saved locally
- Queued
- Synchronizing
- Synchronized
- Retry required
- Conflict
- Duplicate
- Authentication expired
- Storage warning
- Event-data update available
- App update available

### H. Product risks and open decisions

List decisions that must be validated through:

- Repository analysis
- Backend analysis
- Stakeholder interviews
- Recorded-match testing
- Scout usability testing
- Data-analysis needs

End Phase 1.5 with a recommended Phase 2 design scope.

Do not generate React code yet.
Do not generate every application screen yet.
