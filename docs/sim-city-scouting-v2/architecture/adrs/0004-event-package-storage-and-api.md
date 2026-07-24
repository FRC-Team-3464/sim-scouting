# ADR 0004 — Event package storage and API

**Status:** Approved with amendments by product owner

## Context

Scouts need schedules and assignments offline. A single event document risks Firestore size and update contention.

## Decision

Store event metadata, teams, matches, results/rankings, roster, assignments, and overrides as bounded documents/subcollections. Publish a versioned API projection with `packageVersion`, `contentHash`, `generatedAt`, source provenance, and resource hashes. TBA is the sole external event-data source and imports run through Node. Lead Scout manual overrides are narrow, separate, reasoned, versioned records and do not mutate imported source data. Clients use ETag/conditional fetch and atomically activate complete downloaded packages. A stale complete package remains usable offline with visible freshness; an active capture stays pinned to its original package hash.

## Alternatives considered

One unbounded document was rejected. Direct client access violates the data boundary. Static bundled schedules cannot handle corrections.

## Rationale and consequences

Bounded resources allow incremental refresh and independent correction. Projection generation adds backend work and cache invalidation rules.

## Implications

- **Security:** import and override capabilities are separate.
- **Offline:** last complete package remains usable with visible staleness.
- **Migration:** no legacy event package is imported.
- **Performance:** resource paging and compression must respect Vercel payload limits.
- **Accessibility:** stale/update states are announced textually.

## Deferred work and validation

Define measured refresh/expiry intervals and TBA outage procedures during Slice 2. Revisit if TBA availability or correctness fails event acceptance criteria.
