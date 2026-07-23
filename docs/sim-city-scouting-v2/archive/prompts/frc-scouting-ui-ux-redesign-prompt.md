# Prompt: Sim-City FRC Scouting PWA — UI/UX Redesign and React Prototype

Act as an expert FRC scouting strategist, product designer, accessibility specialist, offline-first PWA architect, and senior React frontend engineer.

I have attached or provided:

1. `match-scouting-page.md` — an inventory of the current implementation and legacy payload.
2. `match-scouting-page-enhanced.md` — the recommended target workflow and migration requirements.
3. `sim-city-scouting-pwa-requirements.md` — broader product ideas and future capabilities.
4. Screenshots of the existing application.
5. The existing React/Vite/Tailwind repository.

## Source-of-truth rules

- Treat `match-scouting-page.md` as evidence of the current implementation, not as the correct product design.
- Treat `match-scouting-page-enhanced.md` as the primary target requirements for Match Scouting.
- Treat `sim-city-scouting-pwa-requirements.md` as product direction. Do not implement a technology proposal merely because it appears there.
- The official current-season FRC game rules are authoritative for match structure and game terminology.
- Preserve legacy API compatibility only where the migration plan requires it; do not distort the new UX to match an inadequate legacy payload.
- Before coding, identify conflicts among requirements and recommend a decision.

## Technical constraints

- React with TypeScript
- Vite
- Tailwind CSS v4
- Separate Node.js REST API backend
- Progressive Web App
- Existing authentication and backend must be inspected before modification
- Do not use Next.js
- Do not introduce Supabase, Firebase, or another replacement backend without an explicit architecture decision
- Use IndexedDB for structured offline data and an outbox queue
- Use a service worker for the application shell and offline assets
- Use semantic HTML and accessible React components
- Use `lucide-react` where icons are useful
- Avoid unnecessary dependencies
- Use Tailwind v4 CSS-first conventions and design tokens

## Product objective

Redesign Match Scouting so a trained scout can watch one robot during a fast FRC match and capture reliable robot-attributable evidence with minimal device attention.

Do not optimize for reproducing the official alliance score. Import official schedule and result information when available. Optimize for observations that official results cannot provide, including:

- autonomous path and repeatability;
- collection and scoring locations;
- timing and cycle behavior;
- active/inactive HUB strategy;
- defense and counter-defense;
- TOWER attempt timing and result;
- breakdowns and reliability;
- alliance interaction; and
- evidence-based qualitative observations.

## Required design decisions

1. Event, match, team, alliance, station, and scout identity should normally come from a scouting assignment, not manual typing.
2. During the match, use a focused Match Mode with a local timer that follows Auto, Transition, Shifts 1–4, and End Game.
3. Store accepted actions as timestamped local events and derive counters/summaries.
4. Provide persistent one-tap undo and a correction history.
5. Do not default unanswered observations to false.
6. Derive Shifts 1–4 HUB activity from a single Shift 1 inactive-alliance observation.
7. Prefer configurable volley/batch logging for high-volume FUEL. Also design an optional precise-count mode for validated use cases.
8. Use large field zones as the primary live spatial control. Make precise normalized coordinates optional for Auto paths and detailed analysis.
9. Capture climb as attempt/progress/result states with timing, not only a final dropdown.
10. Rename Finale to Post-match or Review.
11. Use a neutral high-contrast base with persistent alliance indicators. Do not saturate the whole screen red or blue.
12. Support both light and dark competition themes; do not claim dark mode is always better in bright venues.
13. Persist data to IndexedDB before considering it safe and clearly distinguish local save from server sync.
14. Use idempotent sync and avoid silent record overwrite.
15. Use a versioned season schema to configure specialized scouting widgets, not a purely generic JSON form renderer.

## UX environment

Scouts may use:

- smartphones in portrait or landscape;
- tablets in portrait or landscape;
- laptops for correction and review.

Conditions include:

- crowded stands;
- noise and distraction;
- obstructed views;
- bright venue lighting;
- one-handed use;
- unstable or absent networking;
- older school-managed devices; and
- rapid repeated actions.

Optimize frequent controls for thumb reach and eyes-up use. Use at least 44×44 CSS-pixel targets, with 56×56 or larger preferred for frequent actions. Acknowledge accepted input visually within 100 ms without waiting for persistence or network activity.

## Required workflow

Design and prototype:

1. Assignment queue
2. Pre-match confirmation
3. Match timer start/synchronization
4. Auto live panel
5. Auto path/zone tool
6. Transition and Shift 1 HUB-status selection
7. Active-HUB shift panel
8. Inactive-HUB shift panel
9. Volley/batch logger
10. Optional precise counter
11. One-tap undo and event history
12. End Game climb state machine
13. Post-match anchored ratings and issue capture
14. Review and validation
15. Offline/local/sync states
16. Duplicate/conflict review
17. Scouting-lead data-quality view

## Responsive behavior

### Phone

- Primary live-scouting device
- One dominant action region
- Sticky match identity, phase, timer, last action, and undo
- No unrelated global navigation during Match Mode
- No horizontal scrolling

### Tablet

- More spatial context without simply stretching phone layouts
- Field zones and action controls may appear side by side
- Preserve reachability in portrait and landscape

### Desktop

- Prioritize assignment management, correction, record review, data quality, and analytics
- Do not enlarge touch controls unnecessarily

## Offline and sync states

Design visible states for:

- event package not downloaded;
- offline-ready;
- draft saved locally;
- queued;
- uploading;
- synced;
- retryable failure;
- authentication required;
- validation rejected;
- conflict;
- storage warning; and
- application update available.

Do not assume browser background sync is available. Include foreground retry and a Sync Center.

## Accessibility

Target WCAG 2.2 AA.

- Do not use color alone.
- Support keyboard correction/review.
- Use accessible labels and live regions carefully.
- Respect reduced motion.
- Make haptics optional and non-authoritative.
- Support 200% zoom and 320 CSS-pixel reflow.
- Provide a non-map alternative for spatial observations.

## Architecture and data requirements

Before implementation, propose:

- typed local record/event/outbox models;
- versioned season-schema structure;
- legacy payload adapter;
- v2 API envelope;
- idempotency and conflict policy;
- official schedule/result import boundaries;
- raw-event-to-summary derivation; and
- testing strategy.

Do not invent backend endpoints without clearly marking them as proposals.

## Required work sequence

### Phase 1 — Analysis only

1. Inspect the current repository, both requirement files, screenshots, routes, data models, API calls, local persistence, authentication, and tests.
2. Create a current-state architecture and behavior summary.
3. List every conflict between the current implementation and the recommended target.
4. Classify each current field as Preserve, Redefine, Replace, Derive, or Remove.
5. Identify data that can be imported from FIRST/The Blue Alliance instead of scouted.
6. Identify metrics that may be unreliable or too cognitively expensive.
7. Propose the event-based data model and migration plan.
8. Do not change code during this phase.

### Phase 2 — Scouting-method validation plan

Create a practical test plan comparing:

- individual FUEL counting;
- volley/batch logging;
- field zones versus detailed coordinates;
- auto timer progression versus manual tabs; and
- different qualitative rating anchors.

Define inter-scout agreement and video-review criteria.

### Phase 3 — Two design directions

Create two practical design directions, each showing:

- phone Auto;
- phone active-HUB shift;
- phone inactive-HUB shift;
- tablet Match Mode;
- End Game climb;
- Post-match review;
- offline/sync states; and
- Red, Blue, and neutral alliance variants.

Explain the speed, accuracy, accessibility, and implementation tradeoffs.

### Phase 4 — Core prototype

After a direction is selected, implement only:

1. typed mock assignment data;
2. focused Match Mode shell;
3. local timer/phase state machine;
4. event log and undo;
5. active/inactive HUB derivation;
6. volley logger;
7. zone selector;
8. climb state machine;
9. Post-match review; and
10. responsive phone/tablet layouts.

Use mock services and keep persistence/API boundaries separate.

### Phase 5 — Offline persistence and migration

Implement:

- IndexedDB persistence;
- outbox queue;
- local/sync status;
- idempotency key;
- legacy payload adapter; and
- test coverage.

## Output quality

- Production-oriented React/TypeScript, not a landing-page mockup
- Reusable, typed components
- No duplicated Shift 1–4 implementation
- No uncontrolled mutable multi-select state
- No false default for unanswered observations
- Clear mocked/proposed boundaries
- Realistic 2026 REBUILT data
- Complete loading, empty, offline, error, correction, and disabled states
- Unit, integration, accessibility, and responsive tests
- Browser/device test matrix

Begin with **Phase 1 only**. Do not generate the complete application or modify code until the analysis, scouting-method critique, and migration proposal are reviewed.
