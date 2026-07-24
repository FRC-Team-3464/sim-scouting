# Pit Scouting contract

| Metadata | Value |
|---|---|
| Status | Approved with amendments |
| Approval scope | Slice 5 |
| Approved decisions | Photo-free structured MVP; dedicated external photo links excluded; `photoIds` reserved but prohibited in MVP payloads; future extension deferred; CCR-001 through CCR-003 registry behavior |
| Decision references | ADR 0009 |
| Related contracts | [Submission Integrity](submission-integrity.md), [Assignment Model](assignment-model.md), [Season Package](season-package.md), [Offline Synchronization](offline-sync.md), [Authorization](authorization-contract.md) |

## Purpose and scope

This contract governs contributor-owned structured Pit Scouting revisions and derived team/event profiles. It is complete with zero photos. Optional photo infrastructure is explicitly outside MVP.

## Identity and terminology

Pit context is `(seasonKey, eventKey, teamNumber)`; match number is prohibited. Contributions remain distinct by contributor and revision.

```ts
interface PitRecord {
  contributionId: string;
  revision: number;
  seasonKey: string;
  eventKey: string;
  teamNumber: number;
  assignmentId?: string;
  contributorUid: string;
  seasonPackageHash: string;
  robotIdentity: {
    label?: string;
    changeNote?: string;
  };
  dimensions?: MeasurementSet;
  drivetrain?: StructuredAnswer;
  mechanisms: StructuredAnswer[];
  capabilities: CapabilityClaim[];
  autonomous: StructuredAnswer[];
  endgame: StructuredAnswer[];
  controls?: StructuredAnswer;
  sensors?: StructuredAnswer[];
  reliability?: StructuredAnswer;
  repairability?: StructuredAnswer;
  driverExperience?: StructuredAnswer;
  notes?: string;
  /** Reserved for a future approved extension; must be absent in MVP data. */
  photoIds?: string[];
  createdAt: string;
  finalizedAt: string;
}
```

## Data model

The `PitRecord` above is the immutable accepted contribution envelope and declares `photoIds` only as a forward compatibility point. The current MVP runtime profile narrows this interface by requiring `photoIds` to be absent from requests and stored canonical revisions. A separate derived profile references revisions rather than copying away provenance.

## Lifecycle and invariants

Local draft becomes a finalized contribution revision only through a Submission Integrity receipt. Corrections create new revisions. A derived profile references contributing revisions and exposes disagreements; it never overwrites source contributions. Claims include source, contributor, confidence, and optional structured evidence. Match-observed verification remains outside pit records.

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Structured answers, claims, notes, contribution/capture IDs |
| Server-authoritative | Contributor UID, accepted revision, timestamps, package/assignment validation |
| Derived | Team/event profile, disagreement, claimed-versus-verified indicators |
| Local-only | Draft, UI, outbox, retry state |
| Server-internal | Authorization, audit, derivation job state |

## Validation rules

Validate season/event/team, active or conflict-eligible assignment, package hash/questions, controlled-component definition/payload pairs, units/ranges, claim schema, notes, and contribution size. Categorical actions and spatial actions follow CCR-001 and CCR-002 when a validated Pit method uses them. Claimed interview durations use `measurement` with a configured time unit and claim provenance; raw timer/cycle payload discriminators are invalid under CCR-003. The MVP rejects any present `photoIds` field, including an empty array, through `422 PIT_VALIDATION_FAILED` with a bounded field error. It does not ignore or strip the field because absent and empty are canonically distinct. No dedicated external photo/album URL field is accepted.

## Storage, indexes, and retention

Notes max 2,000 characters; contribution JSON max 512 KiB. Index event/team, contributor/event, assignment, and finalization time. Retain contributions/profile/audit through 14 days after event end; deletion creates an audit tombstone where policy requires.

## Capabilities and security

- Submit assigned contribution: `scouting.pit.capture`
- Read own contribution: `scouting.records.read_own`
- Read profile/peer evidence: `scouting.records.read_event`
- Correct/resolve: `scouting.records.correct_all`

The session supplies contributor UID. Browser code does not choose storage paths or authoritative attribution.

## API

| Method | Endpoint | Capability | Idempotent | Offline queued | Purpose |
|---|---|---|:---:|:---:|---|
| POST | `/api/scouting/v2/pit/contributions` | `scouting.pit.capture` | Yes | Yes | Finalize initial contribution |
| POST | `/api/scouting/v2/pit/contributions/:id/revisions` | owner or `scouting.records.correct_all` | Yes | Yes | Create revision |
| GET | `/api/scouting/v2/pit/events/:eventKey/teams/:teamNumber` | `scouting.records.read_event` | N/A | No | Read derived profile/evidence |

Requests use [Submission Integrity](submission-integrity.md) idempotency, hashing, receipt, and error rules.

## Errors

| HTTP | Code | Retryable | Client action |
|---:|---|:---:|---|
| 401 | `AUTHENTICATION_REQUIRED` | Yes | Reauthenticate |
| 403 | `CAPABILITY_DENIED`, `SCOPE_DENIED`, or `ASSIGNMENT_REQUIRED` | No | Preserve work; explain denial/recovery |
| 409 | `PIT_REVISION_CONFLICT` | No | Open revision review |
| 422 | `PIT_VALIDATION_FAILED` | No | Show field errors/quarantine |
| 503 | `PIT_SUBMISSION_UNAVAILABLE` | Yes | Retry unchanged intent |

## Offline and reconciliation

Structured capture, review, and queue survive restart. JSON submission has no photo dependency.

## Audit, observability, performance, and accessibility

Audit finalization, revision, conflict resolution, profile derivation version, actor, reason, and receipt. Structured inputs remain usable without images and expose units, labels, and disagreements accessibly.

## Optional photo extension

MVP requires `photoIds` to be absent from requests and canonical revisions and exposes no photo UI, dedicated external photo/album link, local blob queue, provider, upload endpoint, processing, quota, billing, or retention dependency. The optional interface field is a declaration-only future compatibility point and identifies no current resource. Clients do not solicit, fetch, preview, or render external media; notes remain plain text and do not become a photo-link workflow. A later approved extension must use blob/object storage rather than Firestore/JSON, remain independently disableable, and define identifier semantics, cost, retention, validation, metadata stripping, descriptions, ownership, idempotency, offline behavior, and graceful failure.

## Deferred decisions

Photo value/provider is deferred beyond Slice 5. Exact season pit questions remain package-governed.
