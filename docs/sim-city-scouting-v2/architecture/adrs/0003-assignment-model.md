# ADR 0003 — Assignment model

**Status:** Proposed

## Context

Current scouts manually choose context, producing coverage gaps and wrong-team records.

## Decision

Assignments are server-owned, event-scoped records with type, subject, assignee, station, lifecycle state, version, provenance, and audit history. Match assignment states are `planned`, `available`, `accepted`, `in_progress`, `completed`, `missed`, `cancelled`, or `reassigned`. Clients download versioned assignment projections for offline use. Mutations use expected-version preconditions. Manual fallback creates a visibly flagged emergency assignment proposal that the server validates and audits.

## Alternatives considered

Free selection cannot ensure coverage. Device-owned claiming without server versions cannot resolve offline reassignment. Hard assignment only would block emergency operation.

## Rationale and consequences

Server authority supports coverage monitoring while cached projections keep scouting usable offline. Stale assignments may require confirmation or conflict resolution.

## Implications

- **Security:** assignment-management capability is backend enforced.
- **Offline:** stale versions remain usable only under defined policy.
- **Migration:** no legacy assignments exist.
- **Performance:** event/assignee/state indexes are required.
- **Accessibility:** status, reassignment, and manual-fallback warnings cannot rely on color.

## Deferred work and validation

Dedicated versus roaming staffing and claim rules require field testing. Revisit if events operate without any lead-managed roster.
