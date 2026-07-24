# ADR 0008 — IndexedDB outbox and synchronization

**Status:** Approved by product owner and principal architect

## Context

LocalStorage lacks transactions, blobs, migrations, and durable sync state.

## Decision

Use versioned IndexedDB stores for metadata, preferences, season/event packages, assignments, captures, observations, drafts, outbox, attempts, receipts, pit records, and quarantine, partitioned by authenticated UID where user-owned. No device registration is required; a random installation ID is local by default and may be reported only for bounded diagnostics. Foreground sync is authoritative; optional background sync may wake it but does not own business rules. Retry transient failures with capped exponential backoff and jitter. Authentication expiry always retains work and pauses entries for same-UID in-place login. Explicit sign-out with unsynchronized work offers retain, confirmed discard, or cancel. Synchronized records retain locally for seven days, subject to earlier quota cleanup. Validation and authorization rejections are distinct; neither deletes unsynchronized evidence, and conflicts require explicit resolution. A different UID cannot satisfy reauthentication or upload retained work.

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
