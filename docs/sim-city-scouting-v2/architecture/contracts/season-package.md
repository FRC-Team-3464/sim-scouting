# Season Package contract

| Metadata | Value |
|---|---|
| Status | Approved with amendments |
| Approval scope | Slices 0–8 |
| Approved amendments | Administrator publication confirmation/reason; per-observation allow-listed controlled component registry; CCR-001 categorical append action; CCR-002 categorized spatial action; CCR-003 timer/cycle payload exclusion; empirical field configuration deferred to validation |
| Decision references | ADR 0005 |
| Related contracts | [Event Package](event-package.md), [Match Scouting](match-scouting.md), [Pit Scouting](pit-scouting.md), [Submission Integrity](submission-integrity.md), [Authorization](authorization-contract.md) |

## Purpose and scope

This contract governs versioned game configuration without executable remote forms. It defines supported capture components and validation/derivation resources, not empirical defaults or event schedules.

## Identity and terminology

```ts
interface SeasonPackageManifest {
  seasonKey: string;
  schemaVersion: number;
  contentVersion: number;
  state: "draft" | "published" | "superseded" | "retired" | "revoked";
  contentHash: string;
  compatibleClient: {
    min: string;
    maxExclusive?: string;
  };
  phases: ResourceRef;
  observations: ResourceRef;
  components: ResourceRef;
  field: ResourceRef;
  validation: ResourceRef;
  derivedMetrics: ResourceRef;
  postMatch: ResourceRef;
  pitQuestions: ResourceRef;
  analytics: ResourceRef;
  publishedAt?: string;
  publishedBy?: string;
  changeReason?: string;
  supersedesHash?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
}
```

## Data model

The `SeasonPackageManifest` above references independently hash-addressed bounded resources. `schemaVersion` governs envelope compatibility; `contentVersion` orders product revisions.

## Lifecycle and invariants

- `draft` is editable and unavailable to capture.
- `published` is active and immutable.
- `superseded` is replaced but valid for pinned work/history.
- `retired` is unavailable for new work but retained while referenced.
- `revoked` blocks new work and quarantines later pinned submissions for review.

An Administrator publishes without a second approver but must confirm and provide a non-empty reason. Changes create a new immutable version. Devices keep active and previous known-good compatible versions; active capture never switches package.

## Controlled component registry

The registry is a compiled allow-list, not a remote form engine. The `observations` resource defines what is being observed and references the `components` resource by stable `componentId`. Each Match or Pit observation independently selects one component definition. A component definition may be reused only when its behavior and configuration are identical. A multi-delta counter is therefore valid only where configured; it is not the universal component for a season package.

The [historical coverage review](../../validation/controlled-component-registry-evidence.md) is the evidence authority for registry completeness and exclusions. Its approved CCR-001 through CCR-003 conclusions are incorporated below. Historical recurrence does not select season fields or replace scouting-method validation.

### Observation definition

```ts
type ComponentKind =
  | "action_button"
  | "categorical_action"
  | "multi_delta_counter"
  | "range_selector"
  | "binary_choice"
  | "segmented_choice"
  | "state_machine"
  | "checklist"
  | "anchored_rating"
  | "measurement"
  | "zone_action"
  | "coordinate_action"
  | "note";

interface ObservationDefinition {
  observationId: string;
  domain: "match" | "pit";
  label: string;
  description?: string;
  phaseIds?: string[];
  requiredAtReview: boolean;
  allowNotObserved: boolean;
  allowNotApplicable: boolean;
  componentId: string;
}

interface ComponentDefinitionBase {
  componentId: string;
  componentSchemaVersion: 1;
}
```

`observationId` and `componentId` are stable lowercase identifiers of at most 64 characters matching `[a-z][a-z0-9_.-]*`. Every `componentId` must resolve to exactly one definition in the package's `components` resource. Labels are at most 120 characters and descriptions at most 500. Match phase IDs must exist in the same package. Pit questions normally omit `phaseIds`. `requiredAtReview` means the Scout must explicitly answer, confirm zero/no actions, select `not_observed`, or select `not_applicable` where allowed before final review can complete.

### Shared option types

```ts
interface ChoiceOption {
  optionId: string;
  label: string;
  description?: string;
}

interface IntegerRangeOption extends ChoiceOption {
  minimum: number;
  maximum: number;
}

interface StateDefinition extends ChoiceOption {
  isTerminal: boolean;
}

interface StateTransitionDefinition {
  transitionId: string;
  fromStateId: string;
  toStateId: string;
  label: string;
}

interface RatingAnchor extends ChoiceOption {
  score: number;
}

interface UnitDefinition {
  unitId: string;
  label: string;
  symbol: string;
}
```

Option, state, transition, anchor, and unit IDs follow the `observationId` identifier rule and are unique within their component. An option label is at most 80 characters and an option description at most 300. Stored payloads reference stable IDs, never labels.

### Component configuration interfaces

```ts
interface ActionButtonDefinition extends ComponentDefinitionBase {
  kind: "action_button";
  actionLabel: string;
}

interface CategoricalActionDefinition extends ComponentDefinitionBase {
  kind: "categorical_action";
  options: ChoiceOption[];
}

interface MultiDeltaCounterDefinition extends ComponentDefinitionBase {
  kind: "multi_delta_counter";
  incrementDeltas: number[];
  decrementDeltas: number[];
  minimum: number;
  maximum?: number;
}

interface RangeSelectorDefinition extends ComponentDefinitionBase {
  kind: "range_selector";
  minimum: number;
  maximum: number;
  options: IntegerRangeOption[];
}

interface BinaryChoiceDefinition extends ComponentDefinitionBase {
  kind: "binary_choice";
  trueLabel: string;
  falseLabel: string;
}

interface SegmentedChoiceDefinition extends ComponentDefinitionBase {
  kind: "segmented_choice";
  options: ChoiceOption[];
}

interface StateMachineDefinition extends ComponentDefinitionBase {
  kind: "state_machine";
  initialStateId: string;
  states: StateDefinition[];
  transitions: StateTransitionDefinition[];
}

interface ChecklistDefinition extends ComponentDefinitionBase {
  kind: "checklist";
  options: ChoiceOption[];
  minimumSelections: number;
  maximumSelections: number;
}

interface AnchoredRatingDefinition extends ComponentDefinitionBase {
  kind: "anchored_rating";
  anchors: RatingAnchor[];
}

interface MeasurementDefinition extends ComponentDefinitionBase {
  kind: "measurement";
  units: UnitDefinition[];
  minimumValue?: string;
  maximumValue?: string;
  decimalPlaces: number;
}

interface ZoneActionDefinition extends ComponentDefinitionBase {
  kind: "zone_action";
  actionOptions: ChoiceOption[];
  zoneSetId: string;
  allowedZoneIds: string[];
}

interface CoordinateActionDefinition extends ComponentDefinitionBase {
  kind: "coordinate_action";
  actionOptions: ChoiceOption[];
  coordinateSystemId: string;
  decimalPlaces: number;
  nonMapAlternativeObservationId: string;
}

interface NoteDefinition extends ComponentDefinitionBase {
  kind: "note";
  maximumLength: number;
  multiline: boolean;
}

type ComponentDefinition =
  | ActionButtonDefinition
  | CategoricalActionDefinition
  | MultiDeltaCounterDefinition
  | RangeSelectorDefinition
  | BinaryChoiceDefinition
  | SegmentedChoiceDefinition
  | StateMachineDefinition
  | ChecklistDefinition
  | AnchoredRatingDefinition
  | MeasurementDefinition
  | ZoneActionDefinition
  | CoordinateActionDefinition
  | NoteDefinition;
```

### Resolution and validation sequence

1. Capture starts pinned to one immutable season-package hash; package refreshes cannot change an active capture.
2. The client resolves the domain and `observationId` in that package's `observations` resource.
3. The observation's `componentId` resolves exactly one definition in the package's `components` resource.
4. The compiled client selects the renderer by the resolved `kind` and `componentSchemaVersion`; it never evaluates package-provided code or layout.
5. Each interaction is persisted locally first using the owning observation envelope and the component payload defined below.
6. Client validation uses the pinned component definition for immediate feedback, but is not authoritative.
7. Ingestion independently loads the pinned package, repeats the observation/component lookup, validates the envelope and payload, and only then accepts the evidence and issues a receipt.
8. Draft replacement, append correction, review, and reconciliation follow the owning Match or Pit contract without changing the pinned component definition.

A missing or ambiguous observation/component reference, unsupported kind/schema version, unavailable pinned package, or mismatched payload fails closed. The UI may preserve unsynchronized evidence for recovery, but it must not reinterpret it using a newer package.

### Component payload interfaces

The domain observation envelope owns `observationId`, client sequence, elapsed time, phase, source, correction linkage, and attribution. The component payload contains only component-specific data.

```ts
interface ActionButtonPayload {
  kind: "action_button";
}

interface CategoricalActionPayload {
  kind: "categorical_action";
  optionId: string;
}

interface MultiDeltaPayload {
  kind: "multi_delta_counter";
  delta: number;
}

interface RangeSelectionPayload {
  kind: "range_selector";
  optionId: string;
}

interface BinaryChoicePayload {
  kind: "binary_choice";
  value: boolean;
}

interface SegmentedChoicePayload {
  kind: "segmented_choice";
  optionId: string;
}

interface StateTransitionPayload {
  kind: "state_machine";
  transitionId: string;
  fromStateId: string;
  toStateId: string;
}

interface ChecklistPayload {
  kind: "checklist";
  selectedOptionIds: string[];
}

interface AnchoredRatingPayload {
  kind: "anchored_rating";
  anchorId: string;
}

interface MeasurementPayload {
  kind: "measurement";
  value: string;
  unitId: string;
}

interface ZoneActionPayload {
  kind: "zone_action";
  actionOptionId: string;
  zoneId: string;
}

interface CoordinateActionPayload {
  kind: "coordinate_action";
  actionOptionId: string;
  x: number;
  y: number;
}

interface NotePayload {
  kind: "note";
  text: string;
}

type ComponentPayload =
  | ActionButtonPayload
  | CategoricalActionPayload
  | MultiDeltaPayload
  | RangeSelectionPayload
  | BinaryChoicePayload
  | SegmentedChoicePayload
  | StateTransitionPayload
  | ChecklistPayload
  | AnchoredRatingPayload
  | MeasurementPayload
  | ZoneActionPayload
  | CoordinateActionPayload
  | NotePayload;
```

Measurement values are normalized decimal strings rather than binary floating-point values. Coordinate values are finite normalized numbers from `0` through `1`, inclusive, in the referenced coordinate system.

### Interaction and evidence semantics

| Component kind | Interaction model | Evidence rule |
|---|---|---|
| `action_button` | Append action | Every activation appends one observation event |
| `categorical_action` | Append categorized action | Every activation appends one event with exactly one configured option ID; it never replaces an earlier action |
| `multi_delta_counter` | Append action with derived total | Delta must be an allowed increment or negated decrement; total cannot cross configured bounds |
| `range_selector` | Replaceable local response | Store selected option ID; accepted corrections create a record revision |
| `binary_choice` | Replaceable local response | No default value; explicit `true` and `false` are both answered states |
| `segmented_choice` | Replaceable local response | Exactly one configured option when answered |
| `state_machine` | Append transition | Transition must exist and start from the current valid state |
| `checklist` | Replaceable local response | Unique configured option IDs within selection bounds |
| `anchored_rating` | Replaceable local response | Store anchor ID; packages provide behavioral descriptions rather than an unlabeled number |
| `measurement` | Replaceable local response | Decimal string and configured unit within bounds/precision |
| `zone_action` | Append categorized spatial action | Action option and zone must exist in the pinned definition and referenced field/zone resource |
| `coordinate_action` | Append categorized spatial action | Action option and normalized coordinate are required; the configured non-map alternative must preserve both meanings |
| `note` | Replaceable local response | Plain text only within the domain and component limit |

“Replaceable local response” means the Scout may change a draft before finalization. Once accepted, correction follows the owning Match or Pit revision contract; a package never authorizes silent mutation of accepted evidence. Append-action components persist each action locally and never issue one network request per tap.

### Answer-state invariants

- Absence means `unanswered`; it is distinct from zero, `false`, an empty selection, and an empty string.
- `not_observed` and `not_applicable` are explicit dispositions permitted only when the observation definition enables them.
- An answered component payload is required for an answered response and prohibited for `not_observed` or `not_applicable`.
- A multi-delta total displayed as zero is not automatically answered. With no actions, review requires explicit zero confirmation or an allowed non-answer disposition when `requiredAtReview` is true.
- A binary component has no preselected `false`/off value. The Scout must intentionally choose the configured true or false label.
- A checklist with zero selections is answered only when the definition permits zero selections and the Scout explicitly confirms it at review.
- Renderers and APIs must not coerce between boolean, number, string, range, option, state, or disposition values.

### Registry bounds and validation

- An observations resource contains at most 256 Match definitions and 256 Pit definitions. Each definition is unique by `(domain, observationId)`.
- A components resource contains at most 512 definitions with unique `componentId` values. Every observation reference must resolve, every component must be referenced by at least one observation, and reference cycles are prohibited.
- Multi-delta arrays contain one through six unique positive safe integers each. The server accepts a positive increment or the negative of a configured decrement magnitude. Bounds are safe integers and `minimum <= maximum` when a maximum exists.
- A range selector contains two through 20 ordered integer options. Options are inclusive, non-overlapping, contiguous, cover the configured minimum through maximum, and satisfy `minimum <= maximum`.
- A categorical action and segmented choice each contain two through 12 options. Categorical actions append on every activation; segmented choices remain one replaceable response. Binary labels are non-empty and distinct.
- A state machine contains two through 20 states and at most 64 transitions. The initial state exists, transition IDs are unique, endpoints exist, and unreachable nonterminal states fail publication.
- A checklist contains one through 32 options and valid selection bounds. An anchored rating contains two through 10 uniquely scored anchors with non-empty behavioral descriptions.
- A measurement contains one through 10 units, decimal precision from zero through six, valid normalized decimal bounds, and `minimumValue <= maximumValue` when both exist.
- Zone and coordinate actions contain one through 12 action options. Every spatial payload carries exactly one configured `actionOptionId`; the single-option case still stores that ID and does not infer it from a label. Zone sets, zone IDs, coordinate systems, phase IDs, and non-map alternative observation IDs must resolve within the same complete package. A coordinate action's non-map alternative must collect the same action-option semantics and a bounded textual zone/location choice. Circular alternative references fail publication.
- Notes are plain text. A package may lower but not exceed the owning domain limit: 1,000 characters for Match and 2,000 for Pit.
- Payload `kind` must match the component definition resolved from the pinned observation's `componentId`. Unknown component IDs, kinds, schema versions, options, transitions, units, zones, extra security-sensitive fields, non-finite numbers, and out-of-bound values fail validation.
- Package publication validates configuration and representative payload fixtures for every definition. Server ingestion independently validates the pinned package definition; a client renderer is never validation authority.

### Accessibility and UI ownership

The compiled application resolves `observationId -> componentId -> ComponentDefinition` and owns semantics, focus, keyboard interaction, touch targets, responsive layout, visual hierarchy, reduced motion, announcements, error presentation, and safe feedback. Packages provide bounded labels, descriptions, options, anchors, units, and field references but no layout, styling, icons, color, HTML, script, executable URLs, stylesheets, or arbitrary expressions.

Binary choices render as explicit unselected choices rather than a default-off switch. Range options expose their inclusive bounds in text. Categorical actions keep every action option directly identifiable, one-tap where validation requires rapid capture, and distinguish the latest local action without announcing every rapid event. State transitions announce the resulting state without flooding live regions. Spatial components require a complete non-map alternative that records the same action option and location meaning. Multi-delta designs preserve one-tap actions, visible total/last action, local-save feedback, invalid-adjustment prevention, and undo without copying v1 styling or layout.

### Timer and cycle behavior

`timer`, `stopwatch`, and `cycle_timer` are not component kinds or accepted payload discriminators. A compiled renderer may expose familiar start, stop, or lap-like controls only as interaction affordances for an approved `state_machine`, `action_button`, `categorical_action`, or spatial action definition. Each underlying transition or action is persisted locally with the owning observation envelope's sequence, device-local monotonic elapsed match time, and package-derived phase.

Durations, intervals, and cycles are derived from ordered accepted transitions/actions. A displayed timer value is local UI state and never replaces the underlying evidence or becomes an independently accepted observation payload. Reset, correction, restart restoration, and incomplete timing follow ADR 0006 and the Match Scouting contract; they cannot silently rewrite timestamps. A Pit interview's claimed duration uses `measurement` with a configured time unit and claim provenance rather than live Match timer behavior.

### Compatibility and extension

- `componentSchemaVersion` versions component configuration independently of season content. MVP accepts version `1` only.
- An unknown kind or schema version makes the package incompatible; clients keep the previous known-good package and never fall back to a generic form renderer.
- Changing a definition, label, option, action option, range, delta, state, anchor, unit, zone reference, or payload rule creates a new package content version/hash. Active capture remains pinned to its original version.
- A new component kind or incompatible payload change requires an approved contract/ADR amendment, reviewed frontend and backend code, runtime validators, canonical-hashing fixtures, accessibility behavior, compatibility bounds, and a client release before any package may use it.
- Derived metrics use a separate allow-listed declarative vocabulary evaluated by server and tested client utilities; they cannot execute code or redefine component evidence.
- Photo input is not an MVP component. A season package cannot introduce photos or external media through notes, URLs, assets, or a new unrecognized kind.

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Authorized draft labels, definitions, options, rules, mappings, resources |
| Server-authoritative | Lifecycle, hashes, publisher, compatibility, timestamps, reasons |
| Derived | Resource and whole-package hashes |
| Local-only | Download/active state, last use, known-good marker |
| Server-internal | Publication validation/audit job state |

## Validation rules

Validate registry types, schema/resource references, bounded expressions, accessibility requirements, client compatibility, sizes, and whole/resource hashes.

## Storage, indexes, and retention

Manifest max is 64 KiB, each resource 256 KiB, and package/assets five MiB. Large assets are content-hashed same-origin static/CDN resources; Firebase Storage is not required. Index by season/state/contentVersion. Retain immutable resources while any retained record references them. Draft cleanup requires policy and never affects published history.

## Capabilities and security

- Read active/package: authorized product user
- Manage drafts: `scouting.packages.season.manage_draft`
- Publish/revoke/rollback: `scouting.packages.season.publish`

Only Administrators receive publication capability. Lead Scouts cannot publish or change technical package configuration.

## API

| Method | Endpoint | Capability | Idempotent | Offline queued | Purpose |
|---|---|---|:---:|:---:|---|
| GET | `/api/scouting/v2/seasons/:seasonKey/active` | authenticated user | N/A | No | Read active manifest |
| GET | `/api/scouting/v2/seasons/:seasonKey/packages/:hash` | authenticated user | N/A | No | Read immutable version |
| POST | `/api/scouting/v2/admin/seasons/:seasonKey/drafts` | `scouting.packages.season.manage_draft` | Yes | No | Create/update draft version |
| POST | `/api/scouting/v2/admin/seasons/:seasonKey/publish` | `scouting.packages.season.publish` | Yes | No | Publish with confirmation/reason |
| POST | `/api/scouting/v2/admin/seasons/:seasonKey/packages/:hash/revoke` | `scouting.packages.season.publish` | Yes | No | Emergency revoke |

Publish request:

```json
{"draftId":"draft_3","expectedDraftVersion":7,"confirmed":true,"changeReason":"2026 game definition","idempotencyKey":"018f..."}
```

## Errors

| HTTP | Code | Retryable | Client action |
|---:|---|:---:|---|
| 401 | `AUTHENTICATION_REQUIRED` | Yes | Reauthenticate |
| 403 | `CAPABILITY_DENIED` or `SCOPE_DENIED` | No | Explain Administrator requirement |
| 409 | `DRAFT_VERSION_CONFLICT` | No | Refresh draft and resolve |
| 422 | `PACKAGE_INVALID` | No | Show resource/path validation |
| 503 | `PUBLICATION_UNAVAILABLE` | Yes | Retry unchanged publication intent |

## Offline and reconciliation

Clients activate only complete hash-verified compatible versions. Published/superseded content remains available while pinned.

## Audit, observability, performance, and accessibility

Audit actor, confirmation, reason, states, versions/hashes, compatibility, request ID, and time. Registry components require WCAG behavior and non-map alternatives. Resources are bounded and lazy-loaded where safe.

## Deferred decisions

Capture methods, categorical action options, spatial defaults/action options, rating anchors, estimate-confidence semantics, and staffing remain deferred to method validation. MVP phase order and duration remain package-defined, but the approved Scout interaction is one explicit Match timer start followed by automatic phase progression. A compiled start/stop/lap-like observation affordance must use the approved timestamped state/action model above; a new raw timer payload, advanced Match timer controls, or granular confidence prompting requires post-MVP validation and an approved contract amendment. A new component requires reviewed application code and contract amendment.
