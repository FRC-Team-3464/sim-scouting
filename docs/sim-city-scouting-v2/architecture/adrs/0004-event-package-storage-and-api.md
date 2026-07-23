# ADR 0004 — Event package storage and API

**Status:** Proposed

## Context

Scouts need schedules and assignments offline. A single event document risks Firestore size and update contention.

## Decision

Store event metadata, teams, matches, results/rankings, roster, assignments, and overrides as bounded documents/subcollections. Publish a versioned API projection with `packageVersion`, `contentHash`, `generatedAt`, source provenance, and resource hashes. FIRST/TBA imports run through Node; manual overrides are separate audited records. Clients use ETag/conditional fetch and atomically activate complete downloaded packages.

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

Product owner must approve source precedence and expiry. Revisit if official APIs require a different synchronization topology.
