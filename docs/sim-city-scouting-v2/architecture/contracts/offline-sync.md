# Offline Synchronization contract

| Metadata | Value |
|---|---|
| Status | Approved |
| Approval scope | Slices 0–5 |
| Decision references | ADR 0008, ADR 0012 |
| Related contracts | [Submission Integrity](submission-integrity.md), [Assignment Model](assignment-model.md), [Event Package](event-package.md), [Season Package](season-package.md), [Identity and Session](identity-session-contract.md), [Authorization](authorization-contract.md) |

## Purpose and scope

This protocol governs IndexedDB, local lifecycle/outbox, shared-device isolation, foreground reconciliation, service-worker cache ownership, application updates, migrations, quota, and recovery. Domain records and canonical hashes/receipts are owned by related contracts.

## Identity and terminology

Ordinary scouting requires no device registration. Generate a random installation ID per browser profile; it is not hardware-derived, grants no authority, remains local by default, and may be reported only in bounded diagnostics.

## Data model

Database `sim-city-scouting-v2` uses versioned, forward-only, resumable migrations. User-owned keys include `ownerUid`.

| Store | Key/indexes | Purpose |
|---|---|---|
| `appMetadata` | key | Schema/app versions, migration journal |
| `preferences` | key/owner | UI/device preferences |
| `seasonPackages` | hash; season/state | Known-good versions |
| `eventPackages` | event/version; active/accessed | Offline event resources |
| `assignments` | ID; owner/event/state | Downloaded projection |
| `captures` | capture ID; owner/record/state | Match draft/timing |
| `observations` | ID; capture/sequence | Immutable local observations |
| `pitDrafts` | contribution ID; owner/event/team | Structured pit drafts |
| `outbox` | entry ID; owner/state/next attempt | Durable intent |
| `syncAttempts` | attempt ID; entry/time | Bounded diagnostics |
| `receipts` | owner/key/record | Server confirmations |
| `quarantine` | item ID; owner/reason | Corrupt/rejected data |

## Lifecycle and invariants

```ts
interface OutboxEntry {
  entryId: string;
  ownerUid: string;
  entityType: string;
  entityId: string;
  operation: string;
  idempotencyKey: string;
  payloadHash: string;
  dependencyIds: string[];
  state: "queued" | "authorization_pending" | "uploading" | "auth_required" | "retry_wait" | "authorization_rejected" | "validation_rejected" | "conflict" | "synced";
  attemptCount: number;
  nextAttemptAt?: string;
  leaseUntil?: string;
  createdAt: string;
  updatedAt: string;
  lastErrorCode?: string;
}
```

Observation actions persist capture state transactionally. Final review/submit writes the immutable payload and outbox intent in one transaction; routine taps do not independently queue network operations. A short lease prevents concurrent coordinators. Transient retry uses capped exponential backoff with jitter. `401` becomes `auth_required`; permission/scope denial becomes `authorization_rejected`; schema/domain validation becomes `validation_rejected`/quarantine; `409` becomes visible conflict; only receipt confirmation becomes `synced`.

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Immutable payload, IDs, hashes, package versions |
| Server-authoritative | Receipt, canonical record/revision, accepted hash/time |
| Derived | Local display counts/freshness from local state |
| Local-only | All outbox lifecycle, lease, retry, quota, UI, migration state |
| Server-internal | Receipt/authorization/job internals |

## Shared-device lifecycle and retention

Explicit sign-out with unsynchronized work offers retain, confirmed discard with affected count, or cancel. Retain clears the session and pauses UID-isolated work; only the same UID resumes. Discard deletes only that UID's unsynchronized local records. Session expiry always retains, marks `auth_required`, preserves context, and supports in-place same-UID authentication. A different UID cannot satisfy reauthentication and must use explicit account switch. Another UID cannot view or synchronize prior work.

Synchronized records retain seven days from receipt and may clean earlier under quota pressure. Unsynchronized work never deletes based only on age. Season packages retain active/previous compatible versions. Event packages retain active/previous and every locally referenced version; unreferenced versions use LRU cleanup. Clear-data flow inventories users/unsynchronized items, confirms destruction, and never implies server deletion. Lost-device response revokes sessions; privacy warnings acknowledge browser-origin data is not separate application-level hardware encryption.

## PWA cache, updates, and migrations

The service worker scope is the application origin/path and owns content-hashed shell/static caches only. It never caches authenticated API responses or owns canonical data. Application code owns IndexedDB/sync. Optional background sync may wake the same coordinator but cannot implement different rules.

A new worker downloads to a new cache and waits. Prompt only outside active capture. Activation requires compatible client/package rules and successful journaled migration. No forced reload may discard work. Failure keeps the prior worker/cache and exposes diagnostics.

Migrations preflight quota, journal progress, preserve source stores until commit, and quarantine corrupt records. Failure prevents automatic reset and leaves retry, bounded export, quarantine inspection, or explicitly confirmed reset. Offline startup uses the last approved shell and last successfully migrated database.

## Validation rules

Validate schema/profile compatibility, owner partition, immutable intent, dependency graph, receipt/hash association, and state transition.

## Storage, indexes, and retention

The IndexedDB table above defines required stores/indexes. Retain the last 20 attempts per entry. Estimate storage at startup and before package download; warn at 70%, stop nonessential download at 85%, and never delete unsynchronized work automatically. Quarantine requires explicit export/delete action. Shared-device and package retention follow the lifecycle rules above.

## Capabilities and security

Local ownership checks prevent accidental cross-user display but are not server authorization. Reconciliation requires the authenticated owner; every domain upload rechecks current capability, scope, assignment, and resource state. Cached permission may allow authorization-pending capture but grants no server acceptance. The service worker, device ID, and cached permissions grant nothing.

## API

| Method | Endpoint | Capability | Idempotent | Offline queued | Purpose |
|---|---|---|:---:|:---:|---|
| POST | `/api/scouting/v2/sync/status` | authenticated owner | Yes | No | Reconcile up to 100 key/hash pairs |

Request:

```json
{"items":[{"idempotencyKey":"018f...","payloadHash":"sha256:..."}]}
```

Response:

```json
{"items":[{"idempotencyKey":"018f...","state":"accepted","recordKey":"mr_...","revision":1,"receiptId":"rcpt_..."}]}
```

## Errors

| HTTP | Code | Retryable | Client action |
|---:|---|:---:|---|
| 401 | `AUTHENTICATION_REQUIRED` | Yes | Pause and reauthenticate |
| 403 | `CAPABILITY_DENIED` or `SCOPE_DENIED` | No | Preserve owner work as authorization rejected |
| 409 | `IDEMPOTENCY_HASH_CONFLICT` | No | Preserve and show conflict |
| 422 | `SYNC_QUERY_INVALID` | No | Quarantine invalid intent |
| 503 | `SYNC_STATUS_UNAVAILABLE` | Yes | Keep queued; retry |

## Offline and reconciliation

The foreground coordinator is authoritative. Connectivity/background signals may wake it. It respects dependencies, leases, immutable key/hash pairs, authentication pause, authorization refresh/rejection, explicit conflict/quarantine, and server receipts. The API above reconciles uncertain results without blind resubmission. Authorization-rejected work may retry only after same-UID authority changes or enter audited Lead Scout recovery; it is never deleted or uploaded by a second user.

## Audit, observability, performance, and accessibility

Origin-accessible local data is UID-partitioned but not an authorization source. Never log payloads/notes. Audit explicit discard/reset and server reconciliation anomalies without uploading local lifecycle. Persistence stays off the rapid-input path; failed persistence is blocking. Sync/update/quota states use restrained live regions and textual actions.

## Deferred decisions

Engineering must validate actual quota, eviction, migration, cache/update, and background-wake behavior on approved OS/browser combinations. Future photos require a separate blob store/quota lifecycle.
