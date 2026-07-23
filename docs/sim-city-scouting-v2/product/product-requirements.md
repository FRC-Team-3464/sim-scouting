# Sim-City Scouting v2 product requirements

**Status:** Proposed canonical product scope

## Product goal

Provide an assignment-driven, offline-first FRC scouting system that lets scouts capture attributable observations quickly and lets leads and strategists understand coverage, evidence, and data quality. V2 is a clean break from legacy scouting data and payloads; the existing Firebase session-cookie and CSRF platform remains the authentication baseline.

## Users and workspaces

- **Scout:** complete match and pit assignments with minimal manual context entry.
- **Strategy:** inspect team evidence, trends, agreement, and confidence.
- **Event management:** manage assignments, coverage, conflicts, and data quality.
- **Administration:** manage capabilities, season packages, retention, audit, and exports.

The Scout workspace is the first delivery priority. Other workspaces may initially expose only the capabilities needed to operate it safely.

## Product principles

- Assignments and downloaded event data supply event, match, team, alliance, and station context.
- Unanswered is distinct from `false`, zero, unavailable, and not applicable.
- Every observation remains attributable; multiple scouts never silently overwrite one another.
- All capture saves locally first and displays an explicit sync state. Only a server receipt means synchronized.
- Match records use event-aware identities, idempotent submission, and auditable corrections.
- Purpose-specific backend APIs enforce capabilities. Browser code never accesses Firestore directly.
- Accessibility and offline recovery are acceptance criteria, not follow-up polish.

## Match scouting

An assignment opens a capture session. The scout confirms derived context, starts a monotonic match clock, records configured observations with rapid controls, corrects mistakes without destroying audit history, reviews the result, and queues it for synchronization.

Exact counts, batches, made/missed attempts, cycle events, rate intervals, quantity ranges, confidence, spatial granularity, rating anchors, and timer interaction are configurable candidates. Their defaults must be chosen through [scouting-method validation](../validation/scouting-method-validation.md), not assumed by architecture or UI implementation.

## Pit scouting

Pit scouting is keyed by season, event, and team—never match number. Structured contributions remain separate by contributor and revision. A derived profile exposes provenance and disagreement and distinguishes pit claims from match-observed evidence.

The MVP must be complete and useful without photos. Robot photos are an optional, deferred enhancement for identification and visual context; they are never required evidence and must not block creating, reviewing, syncing, or using a structured pit contribution. No blob-storage provider, paid billing plan, upload endpoint, retention policy, or photo quota is required for MVP.

If photos are later approved, their rollout requires an explicit storage/cost decision, measured event usage, retention limits, accessibility descriptions, metadata stripping, and graceful operation when uploads are disabled. The data model may reserve optional photo references to avoid redesigning contribution identity.

## Offline and PWA behavior

- The installed shell and previously downloaded event/season packages open without a network connection.
- IndexedDB stores packages, assignments, drafts, captures, observations, outbox entries, attempts, receipts, and quarantine records.
- Authentication expiry pauses synchronization and supports in-place reauthentication without deleting work.
- Conflicts, validation failures, stale packages, storage pressure, and app updates remain visible and actionable.
- A service worker caches shell/static assets; foreground application code owns business synchronization.

## Quality requirements

- Target WCAG 2.2 AA, keyboard operation, screen readers, reduced motion, 200% zoom, and 320 CSS-pixel reflow.
- Primary capture actions provide visible acknowledgement within 100 ms on representative lower-powered devices.
- Payloads and downloaded resources are bounded, versioned, validated, and recoverable.
- Security acceptance includes authorization denial tests, CSRF/session regression tests, safe logs, audit events, and environment isolation.

## Out of scope for MVP

- Legacy scouting-data migration, adapter, dual write, or legacy analytics inclusion
- Required pit photos or remote photo storage
- Unvalidated consensus or predictive claims presented as fact
- Broad infrastructure migration
- A generic executable form or plugin system

## Acceptance summary

At a test event, an authorized scout can install/open the app, download a package and assignment, finish match and structured pit work offline through a restart, reauthenticate if needed, reconnect, synchronize idempotently, and see server receipts. Leads can identify coverage and failures. Wrong-context, duplicate, unauthorized, corrupt, and conflicting inputs fail safely without losing local work.
