# Match Scouting contract

| Metadata | Value |
|---|---|
| Status | Approved with amendments |
| Approval scope | Slices 0–4 |
| Approved amendments | Simple device-local timer; automatic package-defined phases; post-match timing/incompleteness flag; no routine pause/manual phase/detailed correction/per-observation confidence UI in MVP; CCR-001 through CCR-003 registry behavior |
| Decision references | ADR 0002, ADR 0006, ADR 0007 |
| Related contracts | [Submission Integrity](submission-integrity.md), [Assignment Model](assignment-model.md), [Season Package](season-package.md), [Offline Synchronization](offline-sync.md), [Authorization](authorization-contract.md) |

## Purpose and scope

This contract governs attributable Match Scouting records, observations, revisions, and purpose-specific APIs. It does not define canonical hashing, receipts, local outbox mechanics, assignment lifecycle, or empirical capture defaults; the related contracts own those concerns.

## Identity and terminology

| Identifier | Meaning | Authority |
|---|---|---|
| `recordKey` | Logical record for one scout/team/match context | Server-derived |
| `captureSessionId` | One local capture attempt | Client-authored UUID |
| `observationId` | Immutable observation or correction event | Client-authored UUID, server-validated |
| `revision` | Accepted canonical record version | Server integer |
| `assignmentId` | Assignment binding, when present | Server-validated |

Canonical identity is `(seasonKey, eventKey, competitionLevel, setNumber, matchNumber, replayNumber, teamNumber, scoutUid)`. The authenticated session supplies `scoutUid`. The TBA adapter maps source-specific competition levels into `practice | qualification | playoff` while preserving source values separately.

## Data model

```ts
interface MatchRecord {
  recordKey: string;
  revision: number;
  state: "finalized" | "superseded" | "void";
  seasonKey: string;
  seasonPackageHash: string;
  eventKey: string;
  competitionLevel: "practice" | "qualification" | "playoff";
  setNumber: number;
  matchNumber: number;
  replayNumber: number;
  teamNumber: number;
  alliance: "red" | "blue";
  station: 1 | 2 | 3;
  assignmentId?: string;
  manualContext: boolean;
  scoutUid: string;
  scoutNameSnapshot: string;
  captureSessionId: string;
  timing: MatchTimingAudit;
  observationChunkHashes: string[];
  postMatch: PostMatchResponse;
  summary: DerivedSummary;
  createdAt: Timestamp;
  finalizedAt: Timestamp;
}

interface MatchObservation {
  observationId: string;
  clientSequence: number;
  type: string;
  phase: string;
  elapsedMatchMs: number;
  clientTimestamp: string;
  payload: unknown;
  zoneId?: string;
  coordinate?: NormalizedCoordinate;
  source: string;
  supersedesObservationId?: string;
  voidsObservationId?: string;
}
```

## Lifecycle and invariants

- `finalized` is an accepted revision visible to authorized reads and analytics.
- A correction creates a new `finalized` revision and marks the prior revision `superseded`.
- `void` is a privileged terminal state with actor and reason; it never deletes evidence.
- Observations are append-oriented. Undo/correction adds a supersede or void event rather than mutating an accepted observation.
- An active capture remains pinned to its season-package hash.
- A record is synchronized only after finalization returns a Submission Integrity receipt.
- The Scout starts timing with one explicit action. Active elapsed time uses a device monotonic source; persisted wall-clock anchors support restart restoration only.
- The pinned package defines phase order and duration, and the MVP advances phases automatically without routine pause/resume or manual phase navigation.
- Restored timing is identified. The MVP captures a simple post-match timing/incompleteness issue and optional bounded note instead of detailed clock correction or per-observation confidence prompts.
- The optional observation uncertainty field is reserved for compatible future use and is not requested by the MVP rapid-capture UI.
- High-throughput numeric observations use a package-configured multi-delta counter: one derived running total plus rapid positive and negative adjustment actions. Every tap appends a sequenced, elapsed-time/phase-attributed delta observation; it never mutates an earlier observation. The package defines the label, allowed deltas, bounds, and phase applicability.
- The v1 counter validates familiarity with this interaction model only. V2 must not contractually copy its visual layout, styling, spacing, or color treatment. Invalid adjustments such as a result below the configured minimum are unavailable, and undo remains a distinct append-oriented correction path.
- A `categorical_action` activation appends one configured option as a sequenced, elapsed-time/phase-attributed observation. It never replaces prior evidence and has no preselected option.
- A `zone_action` or `coordinate_action` observation identifies both one action option from the pinned definition and one valid location. The non-map interaction produces the same payload meaning.
- Raw `timer`, `stopwatch`, and `cycle_timer` payload kinds are invalid. Timing controls persist contracted actions or state transitions; duration and cycle values are derived from their ordered elapsed-time evidence.

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Capture ID, observations, timing audit, post-match responses, proposed context |
| Server-authoritative | Canonical identity, assignment binding, scout UID, revision, state, timestamps, package acceptance |
| Derived | Record key, summary, data-quality flags |
| Local-only | UI state, persistence state, retry schedule, draft lifecycle |
| Server-internal | Authorization result, audit actor, job state |

## Validation rules

Validate authentication, CSRF, capability, envelope, assignment/context, season-package hash, observation schema, timing ranges, and cross-field rules in that order. Context numbers must be positive and within source/package bounds. Observation types and payloads must exist in the pinned package and satisfy the Season Package registry definition, including categorical option membership and the paired action/location requirements for spatial actions. Raw timer/cycle payload discriminators fail validation. Limits are one MiB per request, 500 observations or 256 KiB per chunk, 5,000 observations per record unless the package lowers it, and 1,000 note characters.

## Storage, indexes, and retention

Recommended logical storage is `matchRecords/{recordKey}/revisions/{revision}` plus bounded immutable observation chunks. Required query indexes cover event/team, event/scout, event/match/team, assignment, finalized time, state, and data-quality status. Retain records through 14 days after event end. Void and supersede operations retain audit linkage.

## Capabilities and security

- Read own record: `scouting.records.read_own`
- Submit assigned record: `scouting.match.capture`
- Read event records: `scouting.records.read_event`
- Correct another Scout's record: `scouting.records.correct_all`
- Void a record: `scouting.records.void`

Every mutation requires the Firebase session, signed CSRF protection, current membership, and backend capability enforcement. Standby Scouts cannot submit. Administrator read access does not grant correction authority.

## API

| Method | Endpoint | Capability | Idempotent | Offline queued | Purpose |
|---|---|---|:---:|:---:|---|
| POST | `/api/scouting/v2/records/chunks` | `scouting.match.capture` | Yes | Yes | Store immutable observation chunk |
| POST | `/api/scouting/v2/records/finalize` | `scouting.match.capture` | Yes | Yes | Finalize a revision and receipt |
| POST | `/api/scouting/v2/records/:recordKey/revisions` | `scouting.records.correct_own` or `correct_all` | Yes | Limited | Submit audited correction |
| POST | `/api/scouting/v2/records/:recordKey/void` | `scouting.records.void` | Yes | No | Void with reason |
| GET | `/api/scouting/v2/records/:recordKey` | owner or `scouting.records.read_event`/`read_all` | N/A | No | Read canonical record |
| GET | `/api/scouting/v2/records/mine?eventKey=&cursor=` | `scouting.records.read_own` | N/A | No | Page caller records |

Chunk and finalize requests follow [Submission Integrity](submission-integrity.md). The first accepted chunk returns the server-derived `recordKey`; later chunks/finalization must resolve to it. A client-supplied record key is never authoritative.

## Errors

| HTTP | Code | Retryable | Client action |
|---:|---|:---:|---|
| 401 | `AUTHENTICATION_REQUIRED` | Yes | Reauthenticate in place |
| 403 | `CAPABILITY_DENIED`, `SCOPE_DENIED`, or `ASSIGNMENT_REQUIRED` | No | Preserve work; explain denial/recovery |
| 409 | `REVISION_CONFLICT` | No | Open conflict review |
| 413 | `PAYLOAD_TOO_LARGE` | No | Preserve and report contract violation |
| 422 | `MATCH_VALIDATION_FAILED` | No | Show field/action errors; quarantine if finalized locally |
| 503 | `SUBMISSION_UNAVAILABLE` | Yes | Retry with same idempotency key |

## Offline and reconciliation

Capture, review, and queue work without connectivity. Chunk dependencies synchronize before finalization. Authentication expiry pauses work. Stale assignment submissions follow the Assignment Model conflict policy. Receipt reconciliation—not local upload completion—sets synchronized state.

## Audit, observability, performance, and accessibility

Audit finalization, correction, void, stale-assignment acceptance, and privileged reads/exports as required by common conventions. Logs use request/receipt IDs, never observation payloads or notes. Tap acknowledgement targets under 100 ms after local persistence. Conflict, progress, and rejection states use text and assistive semantics rather than color alone.

## Deferred decisions

Capture methods, spatial inputs, estimate-confidence semantics, rating anchors, and staffing remain governed by scouting-method validation. The simple MVP timer and issue flag are approved. Advanced timer controls, detailed clock correction, and granular confidence prompting require post-MVP validation and an approved contract amendment.
