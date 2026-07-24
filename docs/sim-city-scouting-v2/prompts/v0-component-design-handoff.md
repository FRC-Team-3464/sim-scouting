# V0 handoff — controlled component catalog and neutral scouting workflows

## Role and objective

Act as an expert product designer for high-attention, offline-capable competition workflows and as a WCAG 2.2 AA accessibility specialist.

Create a design-only component catalog and neutral Match and Pit Scouting workflow exploration for Sim-City Scouting v2. The purpose is to explore the compiled UI renderers and shared workflow states already approved by architecture. This is not a final season form, production implementation, or request to invent product or data-model behavior.

The Lead Scout and Strategist are not currently available to validate season-specific observations. Therefore, every sample field, label, option, delta, range, zone, rating anchor, and staffing assumption must be visibly identified as illustrative and not season-approved.

## Read these repository documents first

Treat the following files as authoritative in this order:

1. `docs/sim-city-scouting-v2/product/product-requirements.md`
2. `docs/sim-city-scouting-v2/architecture/architecture-overview.md`
3. `docs/sim-city-scouting-v2/architecture/contracts/season-package.md`, especially **Controlled component registry**
4. `docs/sim-city-scouting-v2/architecture/contracts/match-scouting.md`
5. `docs/sim-city-scouting-v2/architecture/contracts/pit-scouting.md`
6. `docs/sim-city-scouting-v2/architecture/contracts/assignment-model.md`
7. `docs/sim-city-scouting-v2/architecture/contracts/offline-sync.md`
8. `docs/sim-city-scouting-v2/validation/scouting-method-validation.md`
9. `docs/sim-city-scouting-v2/design/ui-design-constraints.md`, especially **Compiled registry component design brief**

Archived prompts and documents under `docs/sim-city-scouting-v2/archive/` are historical reference only and must not override the documents above.

If a requested visual behavior conflicts with a canonical document, report the conflict and follow the canonical document. Do not resolve a conflict by silently inventing a component, payload, endpoint, role, field, or workflow.

## Scope boundary

Produce visual design exploration and an annotated, isolated prototype using static illustrative mock data only.

Do not:

- modify or integrate production frontend or backend code;
- add dependencies, update lockfiles, or change deployment configuration;
- connect to Firebase, Firestore, TBA, an API, authentication, or persistent browser storage;
- create a final season form or claim that an illustrative observation is approved;
- invent a component kind, payload, answer state, timer payload, or remote form/plugin system;
- use archived 2026-specific fields as current requirements;
- add Pit photo upload, external photo links, previews, or image placeholders;
- expose peer raw records, live Scout leaderboards, or qualification-period derived summaries to ordinary Scouts; or
- present generated code as implementation-ready or approved for repository integration.

If the design tool requires code to render the exploration, keep it isolated, mock-only, and disposable. Architecture and implementation review remain mandatory before any generated code can enter the application.

## Design principles

- Optimize for fast, calm, interruption-tolerant operation in loud, crowded stands and pits.
- Use a neutral, high-contrast visual foundation with persistent textual alliance labels where Match identity requires them. Do not saturate the interface red or blue.
- Keep match/team/assignment context, package pinning/freshness where relevant, device-local timer/phase, local-save feedback, synchronization state, latest action, and correction access understandable.
- Preserve large touch targets, visible focus, keyboard operation, screen-reader meaning, 200% zoom, reduced motion, and 320 CSS-pixel reflow.
- Do not communicate identity, selection, state, urgency, or error through color, position, icon, motion, or haptics alone.
- Treat local persistence and server synchronization as different states. A locally saved action is not synchronized without a server receipt.
- Treat unanswered, zero, `false`, empty, `not_observed`, `not_applicable`, unavailable, invalid, rejected, conflicted, queued, and synchronized as distinct states.
- Preserve append-oriented evidence and corrections. Never make accepted evidence look silently overwritten or deleted.

## Illustrative content policy

Use generic labels such as `High-throughput total`, `Outcome A`, `Outcome B`, `Zone A`, `Zone B`, `State A`, `State B`, and `Example measurement`. Where realistic values help show layout stress, add a persistent annotation: **Illustrative configuration — requires scouting-method validation**.

Do not use current-season game terminology, official scoring values, or historical team fields as though they were approved. Example values exist only to exercise the contracted renderer behavior.

## Required design work

### 1. Controlled component catalog

Create an annotated design exploration for all 13 schema-version-1 registry kinds:

1. `action_button`
2. `categorical_action`
3. `multi_delta_counter`
4. `range_selector`
5. `binary_choice`
6. `segmented_choice`
7. `state_machine`
8. `checklist`
9. `anchored_rating`
10. `measurement`
11. `zone_action`
12. `coordinate_action`
13. `note`

For each kind, follow the required behavior and states in `ui-design-constraints.md`. Show the applicable unanswered, answered, locally persisted, invalid, disabled, `not_observed`, `not_applicable`, correction, and review states. Annotate whether the control appends an action or replaces a draft response.

Do not create independent `timer`, `stopwatch`, `cycle_timer`, grid, route, slider, layout, photo, or plugin components. Timer/cycle feedback must be derived from approved timestamped action or state-transition evidence.

### 2. Neutral Match workflow composition

Create a coherent illustrative Match workflow containing:

- assignment and match-context confirmation;
- one large explicit **Start Match** action;
- device-local elapsed time and automatic package-defined phase progression;
- a mixed set of illustrative registry components rather than a proposed season form;
- prominent latest-action and local-save feedback;
- persistent one-step correction/undo access with append-oriented semantics;
- offline, queued, authentication-required, validation-rejected, conflict, and receipt-confirmed states;
- timing-restored or incomplete-observation indication;
- post-match issue flag and optional bounded note; and
- review that distinguishes unanswered, explicit zero/false, dispositions, action history, and synchronization state.

The MVP Match workflow has no routine pause/resume, manual phase navigation, detailed clock correction, per-observation confidence prompts, raw timer component, peer records, or live leaderboard.

### 3. Neutral Pit workflow composition

Create a coherent illustrative Pit workflow containing:

- season, event, and team identity with no match-number identity;
- structured choices, a measurement with units, a claim with provenance, a checklist or rating where illustrative, and a bounded note;
- contributor-owned draft/revision and disagreement-aware review concepts;
- local save, queue, rejection/conflict, and receipt-confirmed states; and
- a complete zero-photo experience with no media affordance or placeholder.

The example must distinguish a Pit claim from Match-observed verification and must not imply that the example questions have been approved for a season.

### 4. Responsive and accessibility matrix

Show the component catalog and applicable composite states across:

- a 320 CSS-pixel narrow smartphone in portrait;
- a smartphone in landscape with reduced height;
- a touch-first tablet in portrait and landscape; and
- a Windows laptop, Chromebook, or MacBook layout operated entirely by keyboard.

Include long-label wrapping, 200% zoom/reflow, visible focus, programmatic error placement, reduced-motion behavior, non-color state indicators, restrained live-region behavior, and complete text/list alternatives for spatial inputs.

### 5. Design annotations and handoff

For every artifact:

- identify the registry `kind` and `componentSchemaVersion: 1`;
- mark illustrative values as not season-approved;
- identify append versus replaceable-draft semantics;
- annotate local persistence, synchronization, correction, and answer-state behavior;
- identify the source contract or UI constraint;
- separate contract requirements from visual recommendations;
- identify any empirical question that must wait for Lead Scout and Strategist validation; and
- flag any desired behavior that would require an ADR or contract amendment.

## Required output sequence

1. Briefly summarize the canonical constraints and list any contradictions or missing inputs. Do not start designing until this check is complete.
2. Present one coherent visual-system direction for the component catalog. This task does not require competing branded themes.
3. Produce the complete component catalog and shared states.
4. Produce the neutral Match workflow composition.
5. Produce the neutral Pit workflow composition.
6. Produce the responsive/accessibility matrix.
7. Provide a handoff table mapping each artifact to registry kind, schema version, contract behavior, illustrative configuration, unresolved empirical questions, and accessibility notes.
8. End with a clear list of what remains blocked on Lead Scout/Strategist validation and what can proceed to engineering only after explicit implementation approval.

Do not proceed from design exploration into production application implementation.
