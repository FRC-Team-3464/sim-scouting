# ADR 0008 — IndexedDB outbox and synchronization

**Status:** Proposed

## Context

LocalStorage lacks transactions, blobs, migrations, and durable sync state.

## Decision

Use versioned IndexedDB stores for metadata, preferences, season/event packages, assignments, captures, observations, drafts, outbox, attempts, receipts, pit records, and quarantine. A transactional local action updates capture data and outbox intent together. Foreground sync is authoritative; optional background sync may wake it but does not own business rules. Retry transient failures with capped exponential backoff and jitter. Authentication expiry pauses entries for in-place login. Validation failures are quarantined; conflicts require explicit resolution.

## Alternatives considered

LocalStorage and service-worker-only synchronization were rejected. Direct Firestore persistence violates the backend boundary.

## Rationale and consequences

IndexedDB supports offline durability and migrations but requires careful quota, corruption, and upgrade handling.

## Implications

- **Security:** local data is origin-accessible; retention on shared devices is bounded.
- **Offline:** capture, review, and queue work with zero connectivity.
- **Migration:** legacy LocalStorage is discarded with notice.
- **Performance:** persistence is asynchronous and does not block tap acknowledgement.
- **Accessibility:** sync changes use live regions without excessive announcements.

## Deferred work and validation

Profile quota and iOS eviction behavior. A future optional-photo extension must establish a separate blob-storage budget before adding image data to IndexedDB.
