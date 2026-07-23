# ADR 0002 — Record identity and idempotency

**Status:** Proposed

## Context

Legacy `{team}/{match}` keys collide. Drafts currently conflate local identity, logical records, and retries.

## Decision

Canonical match identity is `(seasonKey,eventKey,competitionLevel,setNumber,matchNumber,replayNumber,teamNumber,scoutUid)`. The server derives a stable `recordKey` from normalized values. A random `captureSessionId` identifies one local attempt; random `observationId` values identify observations; a random `idempotencyKey` identifies one immutable request payload; `revision` identifies accepted record versions. Store an idempotency receipt keyed by authenticated UID and idempotency key with a payload hash. Same key/hash returns the original result; same key/different hash returns `409`.

## Alternatives considered

Server-only random record IDs impede deterministic conflict checks. Client UUID alone cannot prove logical identity. Team/match/scout keys without event/replay remain collision-prone.

## Rationale and consequences

The split makes offline retry safe while allowing explicit corrections and duplicate coverage. Clients may propose context but cannot choose authoritative identity.

## Implications

- **Security:** identity and ownership are session-derived.
- **Offline:** captures and requests retain independent stable IDs.
- **Migration:** no legacy-key mapping.
- **Performance:** indexed canonical fields support queries; payload hashes cost bounded CPU.
- **Accessibility:** conflict UI must explain duplicate, retry, and revision states plainly.

## Deferred work and validation

Define encoded key length, receipt retention, and canonical hashing in the data/API contract. Revisit if Firestore identifier limits or privacy requirements prohibit UID-derived keys.
