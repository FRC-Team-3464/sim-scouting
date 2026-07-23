# Sim-City Match Scouting — Recommended Target Requirements

> Archived source requirement. It informed, but does not override, the canonical product requirements.

**Product:** Sim-City Robotics Scouting PWA
**Area:** Match Scouting
**Game context:** FRC REBUILT 2026
**Document status:** Recommended target design; reconciled with the approved clean-break migration
**Prepared from:** Current implementation requirements, broader PWA requirements, the 2026 FRC game structure, and scouting data-quality principles
**Important:** The existing application is implementation evidence only. V2 has no legacy-data preservation, adapter, or compatibility requirement.

---

## 1. Executive decision summary

The redesigned Match Scouting experience should follow these decisions:

1. **Scout one robot, not the alliance score.**
   - Capture robot-attributable actions, timing, locations, reliability, and strategic behavior.
   - Import official schedules and final match results rather than asking scouts to recreate information available from FIRST or The Blue Alliance.

2. **Load assignments automatically.**
   - Event, match, team, alliance, station, and scout identity should normally be prefilled from the event schedule and scouting assignment.
   - Manual entry should be a controlled fallback, not the normal workflow.

3. **Use a timed event log as the source of truth.**
   - Record accepted actions as append-only events with timestamps, phases, and optional zones.
   - Derive counters and summaries from those events.
   - Provide one-tap undo rather than relying on repeated direct numeric editing.

4. **Do not require scouts to count every FUEL ball unless testing proves they can do it accurately.**
   - The preferred 2026 input model is configurable **volley/batch logging** with estimated quantity and accuracy.
   - A precise-count mode may remain available for low-throughput robots or teams that validate it during practice.

5. **Use discrete field zones as the primary live-match spatial input.**
   - A precise coordinate map is useful for autonomous paths and later strategy analysis, but it is too error-prone to require for every rapid action.
   - Live scouting should use large, alliance-oriented zones with optional detailed coordinates.

6. **Automate match phases.**
   - A local match clock should progress through Auto, Transition, Shifts 1–4, and End Game.
   - Scouts may correct the phase manually if their timer starts late or the match is paused.

7. **Derive HUB activity instead of exposing four independent toggles.**
   - At the beginning of Transition, the scout identifies which alliance HUB is inactive in Shift 1, or the app receives this information from an available data source.
   - The remaining active/inactive schedule is derived automatically.

8. **Rename “Finale” to “Post-match” or “Review.”**
   - “Finale” is not a clear data-entry concept and can be confused with End Game.
   - The post-match section should cover qualitative observations, problems, review, and submission.

9. **Store data offline first.**
   - Every accepted action should be persisted to IndexedDB before it is considered safe.
   - Upload should use an outbox queue, idempotency key, retry status, and explicit local/synced states.

10. **Use a season schema, but not a completely generic form renderer.**
    - A season configuration should define labels, phases, limits, options, analytics mappings, and enabled widgets.
    - High-speed match scouting still needs specialized components such as a match timer, volley logger, undo stack, zone map, and climb control.

---

## 2. What to preserve, change, remove, and add

| Current concept | Decision | Recommended treatment |
|---|---|---|
| React, TypeScript, Tailwind CSS v4 | Preserve | Continue with the existing frontend stack. |
| Separate Node.js backend | Preserve | Keep the API boundary; do not replace it with Firebase merely to gain offline support. |
| Setup, Auto, Teleop, Endgame, Finale tabs | Change | Use Pre-match, Auto, Teleop, End Game, and Post-match/Review. During the live match, use timer-driven phase progression rather than ordinary form tabs as the primary interaction. |
| Manual event, team, match, and scout-team inputs | Change | Prefill from event selection, schedule, assignment, and authenticated user. Keep manual override behind a deliberate fallback flow. |
| Fuel integer counters with ±1/5/10 | Change | Support configurable precise-count and volley/batch modes. Prefer volley/batch mode for high-volume FUEL. |
| Direct editing of all numeric values | Reduce | Allow correction through undo/history and an edit screen. Do not make direct numeric input the main live-match interaction. |
| Boolean defaults of `false` | Remove | Use `unknown`, `yes`, `no`, and where relevant `not_applicable`. |
| Four independent HUB Active toggles | Remove | Capture the Shift 1 inactive alliance once and derive the full schedule. |
| “Finale” label | Remove | Rename to Post-match or Review. |
| Full coordinate map for every action | Change | Use large field zones for frequent actions; optional coordinate detail for auto paths and selected events. |
| LocalStorage recovery key | Replace | Use IndexedDB records with UUIDs, event-aware natural keys, versioning, and an outbox. |
| Upload path keyed only by team/match | Replace | Use a server-generated or client-generated record ID plus a unique event/match/team/scout assignment key. |
| Local copy retained after sync | Preserve with lifecycle | Keep a durable local record until server acknowledgement and retention policy permit cleanup. |
| Server-owned scout attribution | Preserve | Authentication identity and authoritative timestamps remain server-owned. |
| QR synchronization | Add later | Treat QR export/import as a fail-safe transport, not the primary persistence mechanism. |
| JSON-driven forms | Add carefully | Use season configuration plus specialized typed widgets, not a lowest-common-denominator generic form. |

---

## 3. Product objective

The Match Scouting experience enables an assigned scout to observe one robot during one FRC match and produce reliable, analyzable evidence for:

- upcoming match strategy;
- alliance partner coordination;
- opponent defense planning;
- robot performance trends;
- reliability assessment;
- autonomous routine selection;
- endgame planning; and
- alliance selection.

The app should minimize scout workload while preserving the observations that cannot be recovered from official match data.

### 3.1 Primary success criteria

A successful redesign should:

- let a trained scout record the match while looking at the field most of the time;
- prevent loss of observations when networking is unavailable;
- make wrong-team and wrong-alliance scouting difficult;
- produce data that is comparable across scouts and matches;
- distinguish observed facts, estimates, and subjective ratings;
- support correction without destroying the original event order; and
- produce analytics-ready records without requiring scouts to calculate metrics.

### 3.2 Non-goals

The Match Scouting page should not:

- duplicate the official alliance score;
- ask scouts to enter information already available from the event schedule;
- ask one scout to reliably observe all three robots on an alliance;
- require precise map coordinates for every rapid event;
- use the network as a prerequisite for input;
- turn every possible strategy question into a live-match field; or
- mix pit-reported capabilities with observed match performance without identifying the source.

---

## 4. Scouting operating model

### 4.1 Recommended staffing

The preferred model is:

- one match scout per robot;
- six robot scouts when staffing permits;
- one scouting lead responsible for assignments, quality checks, and missing records;
- an optional super-scout or strategy observer for alliance interactions, defense quality, traffic, and field-wide context.

If the team cannot staff six scouts, the application should support reduced modes, but the UI must clearly identify the lower-confidence observation model.

### 4.2 Data-source separation

Every value should carry or imply a source:

- **Observed:** entered by a match scout.
- **Estimated:** entered as a range, bucket, or confidence-rated estimate.
- **Official:** imported from FIRST Events or The Blue Alliance.
- **Pit reported:** stated by a team in pit scouting.
- **Derived:** calculated from raw scouting events.
- **Strategist override:** corrected or annotated after review.

Do not silently merge these categories.

### 4.3 Scout training assumptions

The UI should support trained teenagers, but must not assume expert game analysis. Every subjective scale must have anchored descriptions rather than unlabeled numbers.

Example:

- **Defense effectiveness**
  - 0 — No defense observed
  - 1 — Attempted but rarely affected opponent
  - 2 — Occasionally delayed or redirected opponent
  - 3 — Consistently reduced opponent productivity
  - 4 — Dominant defense without frequent penalties

---

## 5. Recommended 2026 REBUILT workflow

The official match structure is:

- Auto: 20 seconds
- Transition: 10 seconds
- Shift 1: 25 seconds
- Shift 2: 25 seconds
- Shift 3: 25 seconds
- Shift 4: 25 seconds
- End Game: 30 seconds

The Match Scouting UI should mirror this timeline.

### 5.1 Assignment and launch

The scout normally opens a preassigned card such as:

> Qualification 34 · Red 2 · Team 3464

The card should include:

- event;
- competition level;
- set and match number where applicable;
- scheduled or estimated start time;
- team number and nickname;
- alliance and driver-station position;
- scout identity;
- assignment status;
- downloaded/offline-ready status; and
- whether a previous record already exists.

The scout should not ordinarily type any of those values.

### 5.2 Pre-match

Required observations should be limited to information that matters strategically and can be seen before the match:

- confirm the assigned robot is present;
- confirm alliance/station/team;
- starting field zone or precise starting position;
- estimated preload amount or configuration, only if useful and observable;
- robot connected/ready;
- no-show;
- obvious pre-match issue; and
- selected autonomous routine if known.

The scout starts the local timer using one large action. The app should optionally provide a short countdown or allow synchronization at the field’s Auto start cue.

### 5.3 Autonomous

Recommended autonomous observations:

- starting zone/coordinate;
- autonomous routine path;
- mobility/path completion;
- collection source and collection success;
- each scoring volley or scoring event;
- estimated FUEL attempted and estimated FUEL scored;
- shooting zone;
- autonomous TOWER Level 1 attempt and result;
- collision/interference;
- A-stop, disablement, or failure;
- routine completion time; and
- final autonomous zone.

The app should derive:

- autonomous estimated score contribution;
- autonomous scoring rate;
- autonomous accuracy estimate;
- auto path repeatability across matches;
- auto collection behavior;
- auto climb success rate; and
- auto failure rate.

### 5.4 Transition

Both HUBS are active during Transition. The app should show:

- a clear Transition timer;
- one-tap scoring/volley controls;
- collection source;
- movement/role selection; and
- a prominent prompt to identify which alliance HUB will be inactive in Shift 1 when that becomes visible.

The scout should select one of:

- Red HUB inactive first;
- Blue HUB inactive first;
- Unknown/not observed.

The app derives HUB activity for Shifts 1–4. If the selected robot’s alliance is known, the UI should simply display **Our HUB active** or **Our HUB inactive** for each shift.

### 5.5 Alliance Shifts 1–4

Each shift should use the same specialized live-match panel. It should not be rendered as four unrelated forms.

The panel should show:

- current shift and remaining time;
- our HUB active/inactive status;
- last action and undo;
- robot’s current zone/role;
- quick scoring or volley controls;
- collection source;
- defense action;
- hoarding/storage behavior if strategically defined;
- breakdown/disabled control; and
- optional notes marker for post-match follow-up.

When the observed robot’s HUB is active, prioritize:

- collection;
- shooting location;
- volley/batch logging;
- estimated accuracy; and
- cycle timing.

When the observed robot’s HUB is inactive, prioritize:

- collecting/staging FUEL;
- defense;
- counter-defense/evasion;
- repositioning;
- feeding or alliance support;
- idle/blocked/broken; and
- scoring mistakenly into an inactive HUB.

This captures strategic behavior that a single “fuel” counter cannot explain.

### 5.6 End Game

Both HUBS are active during End Game. Track:

- continued scoring events;
- time the robot commits to the TOWER;
- TOWER approach zone;
- climb attempt;
- achieved level: none, Level 1, Level 2, or Level 3;
- climb start and completion time;
- failed attempt reason where observable;
- assisted or blocked climb;
- interference with partners;
- robot stable at match end; and
- continued scoring instead of climbing.

The climb control should be a clear state machine rather than a single post-match dropdown:

1. Not attempted
2. Approaching
3. Attempting
4. Level 1 achieved
5. Level 2 achieved
6. Level 3 achieved
7. Failed
8. Fell/lost level
9. Unknown/not visible

The submitted summary can still derive the final climb level expected by existing analytics.

### 5.7 Post-match and review

After the buzzer, show a short, structured review rather than a large generic form.

Recommended fields:

- final robot state;
- breakdown or disablement period;
- intake reliability;
- shooting consistency;
- maneuverability;
- defense effectiveness;
- counter-defense/evasion;
- driver decision quality;
- alliance cooperation/traffic impact;
- penalties caused, only when confidently attributable;
- robot damage or parts lost;
- no-show/did not participate;
- confidence in the record;
- short evidence-based note; and
- flagged event requiring scouting-lead review.

Use anchored 0–4 scales and include **Not observed**. Do not require scouts to rate traits they could not see.

The review should highlight:

- missing required observations;
- improbable values;
- conflicting states;
- duplicate assignment/record;
- timer synchronization issues;
- locally saved state; and
- submit/sync state.

---

## 6. Recommended FUEL data-entry model

### 6.1 Problem with a simple integer counter

REBUILT can involve rapid, high-volume FUEL scoring. Requiring a scout to tap once per ball can create:

- missed robot movement and collection behavior;
- inaccurate counts during large volleys;
- accidental double taps;
- fatigue and scout disengagement;
- false precision; and
- poor comparability between scouts.

The app should support multiple collection modes controlled by the season configuration.

### 6.2 Recommended default: volley/batch events

A scoring event should capture:

- timestamp;
- phase/shift;
- HUB active status;
- shooting zone;
- estimated attempted quantity bucket;
- estimated scored quantity or accuracy bucket;
- collection source when known;
- event confidence; and
- optional field coordinate.

Suggested quantity buckets:

- 1–5
- 6–10
- 11–20
- 21–30
- 31+

Suggested accuracy buckets:

- 0%
- 1–25%
- 26–50%
- 51–75%
- 76–90%
- 91–100%
- Not observable

The UI may optimize these after team testing. A combined control such as **small/medium/large volley** plus **low/medium/high accuracy** may be faster than exact ranges.

### 6.3 Optional precise-count mode

Precise-count mode may be enabled when:

- a robot scores slowly enough to observe each FUEL;
- a scout has a clear, unobstructed view;
- practice validation shows acceptable inter-scout agreement; or
- video review is being performed after the match.

Precise mode should log individual accepted events or deltas with timestamps, not merely mutate one final number.

### 6.4 Derived metrics

From raw events, derive:

- estimated FUEL scored by phase;
- estimated attempts;
- accuracy range;
- volleys per active shift;
- FUEL per active second;
- active-HUB productivity;
- inactive-HUB role distribution;
- collection-to-shot cycle time;
- shooting zone distribution;
- consistency and variance across matches; and
- confidence-weighted totals.

Do not present estimated values with false single-unit precision.

---

## 7. Spatial scouting recommendation

### 7.1 Primary method: discrete zones

Use a simplified top-down field divided into large selectable zones relevant to strategy, for example:

- alliance zone;
- neutral zone left/center/right;
- opponent zone;
- depot area;
- outpost area;
- near/far HUB shooting zones;
- bump routes;
- trench routes;
- tower approach areas.

The exact zones should be defined with the strategy team and validated during practice.

Zone controls should:

- be alliance-oriented;
- use text or icons in addition to color;
- be large enough for rapid use;
- support keyboard input;
- show current robot zone;
- allow one-tap correction; and
- avoid accidental browser pan/zoom.

### 7.2 Detailed coordinate mode

Normalized coordinates are valuable for:

- autonomous path mapping;
- repeated shot-location analysis;
- route heatmaps;
- traffic analysis; and
- strategy planning.

Detailed mode should be optional during live scouting and may be completed through:

- a dedicated Auto path tool;
- tap-and-drag path drawing;
- post-match correction;
- video review; or
- a super-scout role.

### 7.3 Event representation

Every spatial event should store:

```ts
interface FieldObservation {
  id: string;
  recordId: string;
  phase: "auto" | "transition" | "shift1" | "shift2" | "shift3" | "shift4" | "endgame";
  eventType: string;
  zoneId?: string;
  xNormalized?: number;
  yNormalized?: number;
  sequence: number;
  matchTimeRemainingMs?: number;
  elapsedMatchMs?: number;
  allianceOrientation: "red" | "blue";
  confidence: "high" | "medium" | "low";
  createdAtClient: string;
}
```

Coordinates must use one canonical field coordinate system. Mirroring is a presentation concern, not a reason to rewrite stored coordinates.

---

## 8. Interaction and navigation model

### 8.1 Before and after the match

Use normal application navigation for assignment selection and post-match review.

### 8.2 During the match

Switch into a focused **Match Mode**:

- persistent team/alliance/match identity;
- persistent timer and current phase;
- one primary action panel;
- large zone/role controls;
- one-tap undo;
- local-save indicator;
- no bottom navigation to unrelated app areas;
- no accidental route changes; and
- no blocking network operations.

The scout may open a compact phase drawer for correction, but routine phase changes should occur automatically.

### 8.3 Touch design

- Minimum general target: 44×44 CSS pixels.
- Preferred frequent-action target: at least 56×56 CSS pixels.
- Separate high-frequency controls sufficiently to prevent mis-taps.
- Place the primary actions within thumb reach on phone layouts.
- Use press feedback within 100 ms.
- Do not delay a local action while awaiting persistence or upload.
- Keep Undo persistently reachable.

### 8.4 Theme

Do not make the entire screen saturated red or blue.

Use a neutral, high-contrast base and communicate alliance through:

- header stripe or border;
- alliance badge and text;
- selected-state accent;
- field orientation;
- team card; and
- persistent iconography.

Provide both light and dark competition themes. Dark mode may help on some OLED devices, but light/high-contrast mode may be more readable under bright venue lighting. Remember the scout’s selected preference locally.

### 8.5 Feedback

- Visible state change is authoritative.
- Haptic feedback is optional progressive enhancement.
- Respect reduced motion.
- Do not animate layout position after taps.
- Use a distinct invalid-action cue without blocking valid rapid repeated inputs.

---

## 9. Season configuration architecture

### 9.1 Recommended approach

Use a versioned season configuration that selects specialized UI widgets.

Example:

```ts
interface GameSchema {
  schemaVersion: number;
  season: number;
  gameKey: string;
  phases: PhaseDefinition[];
  fieldZones: FieldZone[];
  actionDefinitions: ActionDefinition[];
  qualitativeMetrics: QualitativeMetricDefinition[];
  validationRules: ValidationRule[];
  analyticsMappings: AnalyticsMapping[];
}
```

Supported widgets may include:

- tri-state observation;
- event button;
- counter/event delta;
- volley logger;
- timer/start-stop action;
- single-select state machine;
- multi-select issue list;
- zone selector;
- coordinate map;
- anchored rating;
- short note; and
- review confirmation.

### 9.2 Avoid a purely generic form engine

A generic JSON form is insufficient for:

- timer-driven phase transitions;
- rapid event logging;
- undo/history;
- derived HUB schedules;
- alliance-oriented maps;
- climb state transitions;
- offline outbox behavior; and
- specialized accessibility requirements.

The schema should configure domain components rather than replace them.

### 9.3 Schema delivery

- Bundle the current season schema with the PWA for guaranteed offline launch.
- The Node.js backend may provide updated signed/versioned schemas.
- Validate schemas before activation.
- Keep the previous known-good schema for rollback.
- Never activate a schema change during an active record.

---

## 10. Recommended data model

### 10.1 Match record identity

Use a durable UUID plus a natural uniqueness key.

```ts
interface MatchScoutRecordIdentity {
  recordId: string;
  eventKey: string;
  competitionLevel: "practice" | "qualification" | "playoff";
  setNumber?: number;
  matchNumber: number;
  replayNumber?: number;
  teamNumber: number;
  alliance: "red" | "blue";
  station?: 1 | 2 | 3;
  assignmentId?: string;
  scoutUserId?: string; // server authoritative after sync
  schemaVersion: number;
}
```

Suggested uniqueness policy:

```text
(eventKey, competitionLevel, setNumber, matchNumber, replayNumber, teamNumber, assignmentId)
```

Do not key records only by team and match number.

### 10.2 Raw event log

```ts
interface ScoutEvent {
  id: string;
  recordId: string;
  type: string;
  phase: string;
  matchTimeRemainingMs?: number;
  elapsedMatchMs?: number;
  payload: Record<string, unknown>;
  source: "scout" | "timer" | "import" | "review";
  confidence?: "high" | "medium" | "low";
  createdAtClient: string;
  supersedesEventId?: string;
  voidedAtClient?: string;
}
```

Use append/correct/void semantics so the audit trail and event order remain recoverable.

### 10.3 Record summary

Maintain a derived summary for fast display and queries, but do not make it the only source of truth.

```ts
interface MatchScoutSummary {
  autoFuelEstimate?: EstimateRange;
  transitionFuelEstimate?: EstimateRange;
  shiftFuelEstimates: EstimateRange[];
  endgameFuelEstimate?: EstimateRange;
  autoClimbResult?: string;
  endgameClimbResult?: string;
  activeShiftRoles: Record<string, number>;
  inactiveShiftRoles: Record<string, number>;
  reliabilityFlags: string[];
  qualitativeRatings: Record<string, number | null>;
  scoutConfidence: "high" | "medium" | "low";
}
```

### 10.4 Official result linkage

After a match, link the record to:

- official alliance score;
- official score breakdown when available;
- ranking points;
- penalties;
- replay status; and
- match result source/time.

Official data should not overwrite robot-level observed data.

---

## 11. Clean break from the current payload

### 11.1 Migration rule

Do not freeze the new UX around the legacy payload. Store the new event-based record locally and submit only to versioned v2 endpoints. Do not derive legacy fields, dual-write, import existing legacy records, or keep legacy analytics operational. Remove legacy routes after v2 acceptance as defined by the cutover plan.

### 11.2 Legacy-field recommendations

| Legacy field | Recommendation |
|---|---|
| `scoutingTeam` | Remove from each match form; derive from user/team configuration. |
| `eventName` | Replace with stable `eventKey`; retain display name separately. |
| `teamNumber` | Preserve, but derive from assignment. |
| `matchNumber` | Preserve with competition level, set number, replay number, and event key. |
| `allianceColor` | Add and derive from schedule. |
| `autoFuel`, `transitionFuel`, shift fuel, `endgameFuel` | Replace with v2 observation-derived estimates or exact totals depending on the validated scouting mode. Add confidence/range metadata. |
| `autoClimbed` | Replace with an explicit Auto climb result enum. |
| `autoHoardedFuel` | Define precisely or remove. “Hoarded” is too subjective without an observable rule. |
| `shiftNHubActive` | Derive from Shift 1 inactive alliance; do not edit independently. |
| `shiftNCollected` | Replace boolean with collection events/source/count or role duration. |
| `shiftNDefense` | Replace boolean with defense events and an anchored effectiveness rating. |
| `shiftNHoardedFuel` | Replace with a defined inactive-HUB role such as collect/store, with optional estimated amount. |
| `endgameClimbLevel` | Replace legacy strings with a validated climb-result enum and timestamps. |
| `crossedBump`, `underTrench` | Replace simple booleans with route usage counts or zone transitions when route information matters. |
| `robotError` | Replace mutable boolean map with issue events, timestamps, severity, and resolved/not-resolved state. |
| `notes` | Preserve as a short evidence-based note with a documented limit. |
| `fieldEvents` | Retain concept, but support both zone IDs and optional normalized coordinates. |

### 11.3 Example v2 submission envelope

```ts
interface MatchScoutSubmissionV2 {
  record: MatchScoutRecordIdentity;
  timing: {
    timerStartedAtClient?: string;
    timerOffsetMs?: number;
    timerConfidence: "synced" | "approximate" | "manual";
  };
  events: ScoutEvent[];
  postMatch: {
    issues: RobotIssue[];
    ratings: Record<string, number | null>;
    notes?: string;
    confidence: "high" | "medium" | "low";
  };
  derivedSummary: MatchScoutSummary;
  client: {
    appVersion: string;
    schemaVersion: number;
    deviceRecordCreatedAt: string;
  };
  idempotencyKey: string;
}
```

The server should add authoritative identity, received time, validation results, and storage version.

---

## 12. Offline-first PWA requirements

### 12.1 Storage

Use IndexedDB for:

- event schedule cache;
- scouting assignments;
- season schema;
- active drafts;
- raw events;
- photos when needed elsewhere in the product;
- sync outbox;
- sync receipts; and
- recent official data.

Do not use LocalStorage as the authoritative match-record database.

### 12.2 Local write guarantee

For each accepted scout action:

1. update the visible state immediately;
2. append the event to the local transaction queue;
3. persist it to IndexedDB;
4. show locally saved status;
5. enqueue or update the record for upload; and
6. attempt synchronization without blocking scouting.

If persistence fails, show a high-priority warning because the action is not safely recorded.

### 12.3 Sync state model

Use explicit states:

- draft-local;
- ready-to-submit;
- queued;
- uploading;
- synced;
- retryable-failure;
- authentication-required;
- validation-rejected;
- conflict;
- superseded; and
- archived.

### 12.4 Idempotency and conflicts

- Every submission must include an idempotency key.
- Retrying the same record must not create duplicates.
- The server should return a sync receipt/version.
- Conflicting edits should not silently overwrite each other.
- A scouting lead should be able to select, merge, or retain multiple independent observations.

### 12.5 Service worker

Use the service worker for:

- application shell and static assets;
- approved current-season field assets;
- offline fallback routes; and
- update lifecycle.

Do not assume background sync works equally across all browsers. Always provide foreground retry and a visible Sync Center.

### 12.6 Storage durability

- Request persistent storage when supported.
- Show storage health and available-space warnings.
- Provide export/backup before clearing local data.
- Test iOS and school-managed devices explicitly.

### 12.7 QR fail-safe

A later phase may support:

- generating a compact signed export bundle;
- single- or multi-frame QR transfer to a strategy device;
- checksum and completeness validation;
- duplicate detection; and
- import audit trail.

QR should be a recovery/transport option, not a replacement for safe local persistence.

---

## 13. Schedule and external-data integration

Use FIRST Events or The Blue Alliance to prefetch:

- events;
- teams attending;
- match schedule;
- alliance and station assignments;
- match status;
- estimated times when available;
- final results; and
- official score breakdowns when available.

The Node.js backend should cache normalized event data so scout devices can download an event package before entering the venue.

The app must still support:

- delayed schedules;
- schedule changes;
- replays;
- substitutions;
- practice matches;
- missing external data; and
- manual administrator correction.

External data is not a trust source for scout identity or local record safety.

---

## 14. Data quality controls

### 14.1 Prevent wrong assignment

- Display team number, nickname, alliance, station, and match persistently.
- Require a deliberate confirmation before starting if assignment data was manually overridden.
- Warn if another record already exists for the same assignment.

### 14.2 Required-state model

Use:

- unanswered;
- observed yes;
- observed no;
- not applicable;
- not visible/unknown.

Do not represent unanswered as `false`.

### 14.3 Plausibility checks

Examples:

- timestamps must fit the selected phase;
- Shift HUB activity must follow one valid derived schedule;
- a Level 3 climb cannot precede an attempt event;
- an event cannot be recorded after match end without a correction marker;
- coordinates must be finite and within field bounds;
- exact totals must stay inside configured limits;
- a no-show record should not contain normal scoring events unless the no-show was corrected;
- duplicate rapid taps should be reviewable, not automatically discarded; and
- post-match ratings require Not observed when evidence is missing.

### 14.4 Confidence and review

The scout may mark:

- high confidence;
- medium confidence;
- low confidence; or
- incomplete/needs review.

Scouting leads should see:

- missing assignments;
- duplicate records;
- low-confidence records;
- unusual totals;
- timer drift;
- inconsistent issue/outcome combinations; and
- records not yet synchronized.

### 14.5 Measurement validation

Before competition use, test the scouting method using recorded matches or practice matches.

Measure:

- inter-scout agreement;
- missing-action rate;
- wrong-team rate;
- average correction count;
- submission completion rate;
- time spent looking at the device;
- scout fatigue/feedback; and
- agreement with video-reviewed ground truth.

Remove or simplify fields that scouts cannot collect reliably.

---

## 15. Accessibility and responsive requirements

- Target WCAG 2.2 AA.
- Support phone portrait widths from 320 CSS pixels.
- Support phone landscape, tablets, laptops, and desktop.
- No horizontal page scrolling for the core scouting workflow.
- Support keyboard-only correction and review.
- Provide accessible names for every action and value.
- Announce timer/phase changes without overwhelming screen-reader users.
- Do not rely on color, motion, or haptics alone.
- Respect reduced motion and text scaling.
- Preserve safe-area insets on installed mobile PWAs.
- Test zoom/reflow at 200%.
- Ensure controls remain usable in bright venue lighting.

---

## 16. Performance requirements

- Accepted action acknowledgement: target under 100 ms.
- Local persistence must not block the input thread.
- Initial offline-ready match view should open without network access.
- Avoid large design libraries and animation frameworks in Match Mode.
- Lazy-load analytics, administration, and photo tooling.
- Preload the field asset and season schema before the event.
- Avoid rerendering the entire form after every rapid action.
- Use data-driven repeated phase components rather than duplicated code.
- Test on older Android tablets, iPhones, and school-managed Chromebooks.

---

## 17. Security and privacy

- Require authentication for assignment access and server upload.
- Preserve drafts if authentication expires.
- Server owns authoritative scout identity, role, received timestamp, and authorization.
- Validate all event types and payloads server-side.
- Do not expose Firebase or third-party service credentials in the PWA.
- Avoid recording personal information in free-text notes.
- Redact or limit detailed payload logging.
- Define retention and clearing for shared devices.
- Sign or validate QR transfer bundles if QR sync is implemented.

---

## 18. Analytics enabled by the redesigned model

The redesigned data should support:

- autonomous routine heatmaps and repeatability;
- estimated Auto, active-shift, and End Game productivity;
- shooting-zone effectiveness;
- collection-source preferences;
- cycle-time distributions;
- active versus inactive HUB behavior;
- defense frequency and effectiveness;
- route preference through bump/trench areas;
- climb attempt timing and success by level;
- breakdown timing and reliability;
- role compatibility among alliance partners;
- confidence-weighted team comparisons; and
- differences between pit claims, observed performance, and official results.

Metrics such as OPR may be included as external or derived context, but they must not replace robot-level observations and should not be presented as direct causal truth.

---

## 19. Recommended screen deliverables

Request designs and prototypes for at least:

1. Assignment queue — offline-ready and missing-data states
2. Pre-match confirmation — scheduled assignment
3. Pre-match manual fallback — with strong warning
4. Match Mode during Auto
5. Auto path/zone logging
6. Transition with Shift 1 HUB-status selection
7. Active-HUB shift panel
8. Inactive-HUB shift panel
9. Volley entry control and precise-count alternative
10. One-tap undo and action history
11. End Game climb state machine
12. Post-match anchored ratings
13. Validation/review screen
14. Locally saved, queued, uploading, synced, and failed states
15. Duplicate/conflict review
16. Phone portrait and landscape
17. Tablet portrait and landscape
18. Desktop correction/review view
19. Red, Blue, and neutral/unknown alliance states
20. Reduced-motion, no-haptics, keyboard, and screen-reader behavior

---

## 20. Acceptance criteria

### Assignment and identity

1. A scout can open a scheduled assignment without typing event, match, team, alliance, or scout identity.
2. Manual fallback is possible but clearly marked and validated.
3. The match/team/alliance identity remains visible throughout Match Mode.

### Live scouting

4. A scout can start a timer and progress automatically through every 2026 match phase.
5. The scout can correct the current phase without losing events.
6. Frequent actions acknowledge visually within 100 ms.
7. Every accepted action is locally persisted without waiting for the network.
8. One-tap undo is available for the most recent actions.
9. HUB activity is derived from one Shift 1 inactive-alliance observation.
10. The app supports a validated volley/batch mode and an optional precise-count mode.
11. The primary spatial workflow uses fast zones; detailed coordinates are optional.
12. End Game climbing is captured as an attempt/result sequence, not only a final dropdown.

### Data quality

13. Unanswered is never silently interpreted as No.
14. Low-confidence and not-observed values are supported.
15. Invalid phase/action combinations are blocked or clearly flagged.
16. Duplicate and replay records are handled without silent overwrite.
17. The app identifies missing, unusual, conflicting, and low-confidence records for scouting-lead review.

### Offline and sync

18. The complete scouting workflow works without internet after event preparation.
19. Data survives refresh, navigation, application restart, and upload failure.
20. Local-save and server-sync states are always distinguishable.
21. Retry is idempotent and does not duplicate records.
22. A visible Sync Center works even when browser background sync is unavailable.

### Accessibility and responsiveness

23. Core scouting works at 320 CSS pixels without horizontal scrolling.
24. All correction/review functions work by keyboard and screen reader.
25. Red, Blue, and neutral states remain identifiable without relying on color.
26. Reduced-motion and no-vibration configurations remain fully functional.

### Migration

27. The application writes only v2 contracts and never derives a legacy payload.
28. A versioned v2 API stores raw events and derived summaries.
29. Existing legacy data is not imported into v2 analytics.
30. Cutover removes legacy routes only after v2 acceptance; rollback does not require legacy-data compatibility.

---

## 21. Implementation sequence

### Phase 0 — Validate the scouting method

- Interview strategy leads and experienced scouts.
- Define the decisions the data must support.
- Test precise FUEL counting versus volley estimation using match video.
- Finalize field zones and qualitative rating anchors.
- Remove metrics that cannot be collected reliably.

### Phase 1 — Reliability foundation

- IndexedDB record/event/outbox storage
- durable IDs and idempotency
- local-save status
- sync center
- event package download
- assignment identity and schedule integration

### Phase 2 — Focused Match Mode

- timer and phase state machine
- event log and undo
- alliance/HUB derivation
- zone selector
- Auto, active-shift, inactive-shift, and End Game components
- post-match review

### Phase 3 — Backend v2 and clean cutover

- versioned event-based submission endpoint
- validation and normalization
- legacy-route removal after v2 acceptance
- official-result linking
- duplicate/conflict tools

### Phase 4 — Analytics and quality operations

- scouting lead dashboard
- missing/duplicate/low-confidence review
- video-validation tools
- derived performance metrics
- strategy and pick-list integration

### Phase 5 — Optional enhancements

- detailed coordinate paths
- QR export/import
- haptic preferences
- advanced timer synchronization
- collaborative scouting and data sharing

---

## 22. Questions the team must resolve before implementation

1. What decisions should the 2026 scouting data support: match strategy, pick list, both, or additional use cases?
2. Can your scouts reliably count individual FUEL in practice, and at what throughput does accuracy fail?
3. Which volley quantity and accuracy buckets produce acceptable agreement between scouts?
4. Which field zones are actually useful to strategy?
5. Should one scout cover one robot at every event, or must a reduced-staffing mode be designed?
6. Which inactive-HUB roles matter enough to track?
7. How will defense effectiveness be anchored and trained?
8. Which penalties can scouts attribute reliably?
9. Should autonomous paths be captured live, after the match, or by a dedicated observer?
10. What is the minimum official data package required before devices go offline?
11. How long should synced local records remain on shared devices?
12. Which v2 reports are required for the first competition release?
13. When will the v2 event-based API cutover occur?
14. Is QR transfer worth the operational complexity for your competitions?
15. Which browser/device matrix must be supported and tested?

---

## 23. Recommended product principle

> Collect the smallest set of observations that trained scouts can record consistently, preserve the raw evidence, and derive everything else later.

A larger form does not automatically produce better scouting. In a fast FRC match, every extra control competes with watching the robot. The final design should be judged by data reliability and strategy usefulness—not by the number of fields collected.
