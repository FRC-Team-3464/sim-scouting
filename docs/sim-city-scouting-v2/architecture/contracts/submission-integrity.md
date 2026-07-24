# Submission Integrity contract

| Metadata | Value |
|---|---|
| Status | Approved |
| Approval scope | Slices 0, 4, and 5 |
| Decision references | ADR 0002, ADR 0007 |
| Related contracts | [Match Scouting](match-scouting.md), [Pit Scouting](pit-scouting.md), [Offline Synchronization](offline-sync.md) |

## Purpose and scope

This reusable protocol defines canonical serialization, hashes, immutable chunks, idempotency keys, server receipts, replay/conflict behavior, and cross-runtime fixtures. It applies to Match and Pit submissions. It does not replace authentication, CSRF, capability checks, schema validation, or domain-specific lifecycle rules.

## Identity and terminology

| Identifier | Meaning | Authority |
|---|---|---|
| `idempotencyKey` | One immutable operation attempt | Client UUID |
| `payloadHash` | Digest of canonical final envelope | Client/server calculated; server value authoritative |
| `chunkHash` | Digest of one immutable canonical chunk | Client/server calculated; server value authoritative |
| `receiptId` | Acceptance evidence | Server-generated |

## Data model

```ts
interface SubmissionReceipt {
  receiptId: string;
  ownerUid: string;
  idempotencyKey: string;
  operation: string;
  payloadHash: string;
  recordKey: string;
  revision: number;
  eventKey: string;
  state: "accepted";
  acceptedAt: string;
  expiresAt: string;
}
```

## Canonical serialization and hashing

The initial profile is `jcs-nfc-sha256-v1`:

1. Validate the versioned typed payload.
2. Normalize authorized keys and string values to Unicode NFC.
3. Normalize timestamps to UTC RFC 3339 with exactly three fractional-second digits and `Z`.
4. Reject normalized-key collisions, unsupported values, non-finite numbers, unsafe integers, and schema-range violations.
5. Preserve absent optional fields as absent. Keep explicit `null`, `unanswered`, `not_observed`, `not_applicable`, `false`, zero, and allowed empty strings distinct.
6. Construct the versioned hash envelope.
7. Serialize with restricted RFC 8785/JCS: keys ordered by UTF-16 code units, arrays in semantic order, negative zero as `0`, and ECMAScript shortest round-trippable finite numbers.
8. Encode canonical JSON as UTF-8 and calculate SHA-256.
9. Format the digest as `sha256:` plus 64 lowercase hexadecimal characters.

Precise domain decimals use schema-normalized decimal strings instead of binary floating point. A normalized-key collision is a validation error; neither value may overwrite the other.

## Hash scope and chunks

The final envelope includes `hashProfile`, payload schema version, operation, season-package hash, normalized proposed context, capture/contribution ID, immutable content, and ordered chunk hashes. It excludes HTTP/session/CSRF material, retry counts, local lifecycle/UI fields, server timestamps, derived summaries, authorization results, and the digest field.

Each immutable chunk has its own envelope, sequence, content, and hash. Finalization covers the ordered chunk hashes; a missing, changed, substituted, or reordered chunk fails. The client stores exact canonical inputs and never regenerates a different payload under the same idempotency key.

## Lifecycle and invariants

- A new UID/key/hash may create one accepted record revision and receipt.
- The same UID/key/hash replays the original response without another canonical write.
- The same UID/key with a different hash returns `409 IDEMPOTENCY_HASH_CONFLICT`.
- A client/server digest mismatch stores no canonical record and returns a non-retryable error.
- Keys never cross authenticated UIDs.
- Only a server receipt permits synchronized UI state.
- Receipt state is immutable; cleanup removes it after retention rather than changing acceptance.

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Idempotency key, declared hash profile/digests, immutable content/chunks |
| Server-authoritative | Recalculated digests, receipt, accepted record/revision/time |
| Derived | Canonical UTF-8 and payload/chunk digests |
| Local-only | Retry/outbox lifecycle |
| Server-internal | Composite receipt key, authorization and cleanup state |

## Validation rules

Apply the canonicalization algorithm above after domain schema validation. Reject unsupported profiles, normalized-key collisions, unsafe values, digest mismatch, changed immutable keys, missing/reordered chunks, and cross-UID receipt access.

## Storage, indexes, and retention

Store receipts logically in `idempotencyReceipts` using an irreversible encoded UID/key composite identifier. Index by receipt ID, UID/key, record, event/expiry, and request ID. Retain receipts through 14 days after event end. Cleanup emits bounded counts/errors without retaining payloads. Orphan chunks remain invisible to analytics and expire through a bounded cleanup job.

## Capabilities and security

Submission Integrity adds no broad capability. Each domain endpoint enforces its own capability; receipt reconciliation is owner-scoped. Hashes are never authorization.

## API

This protocol has no standalone submission endpoint. Domain contracts define their write endpoints; every participating mutation carries `idempotencyKey`, `hashProfile`, `payloadHash`, schema/package versions, and immutable content or chunk references. The [Offline Synchronization contract](offline-sync.md) exclusively owns the reconciliation endpoint.

## Errors

| HTTP | Code | Retryable | Meaning/client action |
|---:|---|:---:|---|
| 200 | duplicate response | N/A | Use original receipt and mark synchronized |
| 201 | accepted | N/A | Store receipt and mark synchronized |
| 409 | `IDEMPOTENCY_HASH_CONFLICT` | No | Preserve local payload; require conflict review |
| 409 | `CHUNK_HASH_CONFLICT` | No | Preserve capture; report immutable-content conflict |
| 422 | `CANONICALIZATION_FAILED` | No | Quarantine and show safe diagnostic |
| 422 | `HASH_PROFILE_UNSUPPORTED` | No | Require compatible application update |
| 503 | `SUBMISSION_UNAVAILABLE` | Yes | Retry unchanged key/hash after backoff |

## Cross-runtime test vectors

Slice 0 fixtures must cover object ordering, nested objects, array ordering, composed/decomposed Unicode, normalized-key collision, absent/null/status distinctions, negative zero, integer boundaries, fractions, unsafe/non-finite numbers, timestamp offsets, full Match and Pit payloads, chunks, and finalization. Each fixture contains input, normalized value, exact canonical JSON, exact UTF-8 bytes, expected digest, and expected validation result. Browser JavaScript and Node must produce byte-identical outputs.

## Offline and reconciliation

Clients persist exact canonical inputs, hash profile, digest, and idempotency key before queueing. Retry never mutates them. Reconciliation is owned by the Offline Synchronization contract and only a server receipt produces synchronized state.

## Audit, observability, performance, and accessibility

Hashes provide integrity comparison and idempotency, not authentication, authorization, confidentiality, or digital signatures. TLS, Firebase session, CSRF, capabilities, and server validation remain mandatory. Full hashes and low-entropy payloads are not public identifiers. Logs may contain request/receipt IDs, result, and a short hash prefix but never payloads, notes, session material, or full hashes. Receipt reads follow record visibility; audit/export remains separately gated.

## Alternatives rejected

- Server-only hashing cannot bind an offline outbox item to exact content.
- Raw `JSON.stringify` and custom sorted JSON are runtime-sensitive.
- Canonical CBOR adds another representation without MVP benefit.
- Digital signatures add key management without replacing authenticated server authority.

## Deferred decisions

Never change an existing hash profile silently. An incompatible rule creates a new profile and client-compatibility range. Receipts retain their original profile. Unknown profiles fail explicitly.
