# ADR 0002 — Record identity and idempotency

**Status:** Approved by product owner and principal architect

## Context

Legacy `{team}/{match}` keys collide. Drafts currently conflate local identity, logical records, and retries.

## Decision

Canonical match identity is `(seasonKey, eventKey, competitionLevel, setNumber, matchNumber, replayNumber, teamNumber, scoutUid)`. The server derives a stable `recordKey` from normalized values. A random `captureSessionId` identifies one local attempt; random `observationId` values identify observations; a random `idempotencyKey` identifies one immutable request payload; `revision` identifies accepted record versions. Store an idempotency receipt keyed by authenticated UID and idempotency key with a canonical payload hash. Client and server independently calculate SHA-256 over the same versioned canonical serialization; the server-accepted hash is authoritative. Same key/hash returns the original result; same key/different hash returns `409`. Retain receipts through 14 days after the associated event ends.

Canonical payloads use the versioned `jcs-nfc-sha256-v1` profile: validate the typed schema; normalize authorized keys and string values to Unicode NFC; normalize timestamps to UTC RFC 3339 with exactly three fractional-second digits; reject normalized-key collisions, non-finite/unsafe numbers, and unsupported values; serialize with RFC 8785/JCS ordering and number rules to UTF-8; then calculate SHA-256 as lowercase hexadecimal prefixed by `sha256:`. Absent fields remain absent, while explicit `null`, `unanswered`, `not_observed`, `not_applicable`, `false`, zero, and empty string retain their distinct schema meanings.

Immutable observation chunks receive individual canonical hashes. The final submission envelope includes the hash-profile and schema versions, season-package hash, operation, normalized proposed context, capture ID, immutable content, and ordered chunk hashes. It excludes transport/session/CSRF material, retry and local lifecycle state, server timestamps, derived summaries, authorization results, and the hash field. Browser and server calculate independently; a mismatch creates no canonical record. Hashing supports integrity and idempotency comparison but does not replace TLS, authentication, CSRF, authorization, or validation.

## Alternatives considered

Server-only random record IDs impede deterministic conflict checks. Client UUID alone cannot prove logical identity. Team/match/scout keys without event/replay remain collision-prone. Server-only hashing cannot bind an offline outbox item to exact immutable content. Hashing raw `JSON.stringify` output or custom key-sorted JSON is runtime-sensitive and difficult to verify. Canonical CBOR adds a second representation without demonstrated MVP benefit. Digital signatures add key management but do not replace authenticated server authority.

## Rationale and consequences

The split makes offline retry safe while allowing explicit corrections and duplicate coverage. Clients may propose context but cannot choose authoritative identity.

## Implications

- **Security:** identity and ownership are session-derived.
- **Offline:** captures and requests retain independent stable IDs.
- **Migration:** no legacy-key mapping.
- **Performance:** indexed canonical fields support queries; payload hashes cost bounded CPU.
- **Accessibility:** conflict UI must explain duplicate, retry, and revision states plainly.

## Deferred work and validation

Slice 0 must implement the normative cross-runtime test vectors specified by the [Submission Integrity contract](../contracts/submission-integrity.md) and finalize encoded key length. Revisit through a new hash-profile version if runtime interoperability fails; never silently change an existing profile. Revisit identity encoding if Firestore identifier limits or privacy requirements prohibit UID-derived keys.
