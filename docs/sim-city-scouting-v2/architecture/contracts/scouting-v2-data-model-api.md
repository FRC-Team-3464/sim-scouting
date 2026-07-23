# Scouting v2 data model and API contract

**Status:** Proposed
**API prefix:** `/api/scouting/v2`

## Identity

| Identifier | Meaning | Authority |
|---|---|---|
| `recordKey` | Canonical logical record | Server-derived |
| `captureSessionId` | One device capture attempt | Client-authored UUID |
| `observationId` | Immutable observation/correction | Client-authored UUID, server-validated |
| `idempotencyKey` | One immutable request attempt | Client-authored UUID |
| `revision` | Accepted canonical version | Server-only integer |
| `payloadHash` | Canonical request digest | Server-derived |

Canonical identity fields are `seasonKey`, `eventKey`, `competitionLevel`, `setNumber`, `matchNumber`, `replayNumber`, `teamNumber`, and authenticated `scoutUid`. `competitionLevel` is `practice | qualification | playoff`; source adapters map FIRST/TBA-specific levels and preserve source values separately.

## Match record schema

```ts
interface MatchRecordRevision {
  recordKey: string; revision: number; status: "finalized" | "superseded" | "void";
  seasonKey: string; seasonPackageHash: string; eventKey: string;
  competitionLevel: "practice" | "qualification" | "playoff";
  setNumber: number; matchNumber: number; replayNumber: number;
  teamNumber: number; alliance: "red" | "blue"; station: 1 | 2 | 3;
  assignmentId?: string; manualContext: boolean;
  scoutUid: string; scoutNameSnapshot: string;
  captureSessionId: string; timing: MatchTimingAudit;
  observationChunkHashes: string[]; postMatch: PostMatchResponse;
  summary: DerivedSummary; createdAt: Timestamp; finalizedAt: Timestamp;
}
```

Observations include `observationId`, monotonic `clientSequence`, `type`, `phase`, `elapsedMatchMs`, client timestamp, configured payload, optional `zoneId`/normalized coordinate, `source`, and optional `supersedesObservationId` or `voidsObservationId`.

## Ownership and storage

| Class | Fields |
|---|---|
| Authoritative | Canonical identity, assignment binding, `scoutUid`, revision, status, timestamps, package hash |
| Client-authored | Capture ID, observations, timing audit, post-match responses, idempotency key |
| Derived | Record key, payload hash, summary, data-quality flags |
| Local-only | Outbox state, retry time, UI state, persistence status, device preferences |
| Server-only | Receipt, audit actor, authorization result, internal job state |

Suggested storage: `matchRecords/{recordKey}/revisions/{revision}`, bounded `observationChunks`, and `idempotencyReceipts/{uid_key}`. Query indexes: event/team, event/scout, event/match/team, assignment, finalized time, and data-quality status. Schema and payload versions are required. Retain canonical event data and audit according to the later governance policy; idempotency receipts default to 30 days. Maximum request body: 1 MiB; maximum 500 observations or 256 KiB encoded observation chunk; notes 1,000 characters; maximum 5,000 observations per record unless a season package sets a lower bound.

## API

- `POST /records/chunks` — validate context and store an immutable observation chunk; the server derives and returns `recordKey`.
- `POST /records/finalize` — validate chunks and create a revision.
- `POST /records/:recordKey/revisions` — submit a correction revision.
- `POST /records/:recordKey/void` — privileged void.
- `GET /records/:recordKey` — owner/capability-gated canonical record.
- `GET /records/mine?eventKey=&cursor=` — caller records.

### Finalize request

```json
{
  "idempotencyKey": "018f...",
  "captureSessionId": "018e...",
  "context": {"seasonKey":"2026","seasonPackageHash":"sha256:...","eventKey":"2026mabos","competitionLevel":"qualification","setNumber":1,"matchNumber":34,"replayNumber":1,"teamNumber":3464,"assignmentId":"asg_..."},
  "timing": {"startedAtClient":"2026-03-20T14:00:00Z","events":[{"type":"start","elapsedMs":0}]},
  "chunkHashes": ["sha256:..."],
  "postMatch": {"confidence":"medium","notes":"Clear view except end game"}
}
```

Each chunk request includes the same normalized context, `captureSessionId`, package hash, client chunk sequence, content hash, and observations. The first accepted chunk returns the server-derived `recordKey`; later chunks and finalization must resolve to the same key. A client-provided key is never authoritative. Identical chunk retries return the original acknowledgement, while a reused chunk identity with different content returns `409`.

### Success and duplicate

```json
{"recordKey":"mr_...","revision":1,"status":"accepted","receiptId":"rcpt_...","finalizedAt":"2026-03-20T14:03:05Z"}
```

An identical idempotency retry returns `200` with the same body and `duplicate: true`; a new record returns `201`.

### Errors

```json
{"error":{"code":"VALIDATION_FAILED","message":"Submission contains invalid fields","retryable":false,"details":[{"path":"context.teamNumber","code":"must_be_positive"}]}}
```

```json
{"error":{"code":"AUTHENTICATION_REQUIRED","message":"Log in to continue","retryable":true}}
```

```json
{"error":{"code":"REVISION_CONFLICT","message":"A newer record revision exists","retryable":false,"details":{"currentRevision":2}}}
```

```json
{"error":{"code":"SERVICE_UNAVAILABLE","message":"Submission was not confirmed","retryable":true,"retryAfterSeconds":5}}
```

Statuses are `400/422` validation, `401` authentication, `403` CSRF/permission, `404` unknown resource, `409` hash/revision conflict, `413` size, `429` throttling, and `503` transient dependency failure. The client retries only retryable outcomes with the same idempotency key; it never reports synchronization before a receipt is returned.
