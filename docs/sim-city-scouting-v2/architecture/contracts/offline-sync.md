# Offline storage and synchronization contract

**Status:** Proposed

## IndexedDB database

Database `sim-city-scouting-v2`, schema versioned with forward-only, resumable migrations:

| Store | Key/indexes | Purpose |
|---|---|---|
| `appMetadata` | key | schema/app versions and migration journal |
| `preferences` | key | local UI/device preferences |
| `seasonPackages` | hash; season/status | known-good packages |
| `eventPackages` | event/version; active/accessed | offline event resources |
| `assignments` | ID; event/assignee/state | downloaded assignment projection |
| `captures` | capture ID; record key/status | match draft and timing audit |
| `observations` | ID; capture/sequence | immutable local observations |
| `pitDrafts` | contribution ID; event/team | pit drafts |
| `outbox` | entry ID; state/nextAttempt | durable sync intent |
| `syncAttempts` | attempt ID; entry/time | bounded diagnostics |
| `receipts` | idempotency key/record | server confirmations |
| `quarantine` | item ID/reason | corrupt or rejected data |

## Outbox entry

```ts
interface OutboxEntry {
  entryId: string; entityType: string; entityId: string; operation: string;
  idempotencyKey: string; payloadHash: string; dependencyIds: string[];
  state: "queued" | "uploading" | "auth_required" | "retry_wait" | "rejected" | "conflict" | "synced";
  attemptCount: number; nextAttemptAt?: string; leaseUntil?: string;
  createdAt: string; updatedAt: string; lastErrorCode?: string;
}
```

One IndexedDB transaction persists an accepted observation and updates its local capture state. Final review/submit creates or updates the corresponding outbox intent in the same transaction as the finalized local payload; routine observation taps do not independently queue network submissions. UI acknowledgement occurs immediately after local persistence; a persistence failure produces a blocking safety warning. A foreground coordinator takes a short lease, respects dependencies, and uploads with the stable idempotency key. Exponential backoff uses jitter and a cap; connectivity events may trigger earlier retry. `401` becomes `auth_required`, opens in-place reauthentication, refreshes CSRF, and resumes. Validation rejection goes to quarantine. Conflicts remain visible until resolved. Service workers cache shell/assets and may request a sync wake-up but do not contain the only sync implementation.

## Ownership, limits, retention

- **Local-only:** all lifecycle/attempt/lease/quota fields.
- **Client-authored sent to server:** immutable payload, IDs, hashes, package versions.
- **Server-authoritative returned:** receipt, canonical key/revision, accepted hash/time.
- Sync attempt diagnostics retain the last 20 attempts per entry. Synced records default to 7 days on shared devices pending product approval; active drafts are never automatically deleted. Quarantine requires export/delete action. Warn at 70% estimated quota and stop new nonessential downloads at 85%. A later photo extension must define a separate blob store, quota policy, and cleanup lifecycle.

## Reconciliation API

`POST /api/scouting/v2/sync/status` accepts at most 100 `{idempotencyKey,payloadHash}` pairs.

Request: `{"items":[{"idempotencyKey":"018f...","payloadHash":"sha256:..."}]}`
Success: `200 {"items":[{"idempotencyKey":"018f...","state":"accepted","recordKey":"mr_...","revision":1}]}`
Validation: `422 {"error":{"code":"SYNC_QUERY_INVALID","message":"Sync query is invalid","retryable":false}}`
Authentication: `401 {"error":{"code":"AUTHENTICATION_REQUIRED","message":"Log in to continue","retryable":true}}`
Conflict: `409 {"error":{"code":"IDEMPOTENCY_HASH_CONFLICT","message":"The stored payload differs","retryable":false}}`
Retry: `503 {"error":{"code":"SYNC_STATUS_UNAVAILABLE","message":"Status could not be confirmed","retryable":true,"retryAfterSeconds":5}}`

Application upgrades keep the previous shell until database migration succeeds. A failed migration leaves data exportable and prevents destructive cleanup.
