# Phase 1.6 architecture decisions

> Archived historical summary. Current decisions live in the architecture overview, ADRs, and contracts.

**Status:** Proposed for review
**Repository commit analyzed:** `c7ed1c9abba7a82c0b7da6366a0308099222c9ba`

## Locked platform

- React, TypeScript, Vite, React Router, and Tailwind CSS v4
- Node/Express API; browser code never accesses Firestore directly
- Firebase Authentication and existing HttpOnly session-cookie/CSRF flow
- IndexedDB for device-local application data and outbox state
- Service worker limited to shell/static assets and update support
- Existing same-origin Vercel deployment unless operational validation disproves suitability

## Approved product decision

V2 is a clean break. Existing legacy scouting data does not need preservation, export, transformation, a read-only adapter, or analytics inclusion. V2 does not dual-write or derive legacy payloads. Cutover removes legacy scouting and authentication routes after v2 acceptance. Rollback restores code, not legacy data compatibility.

## Recommended architecture

- Server-verified assignments and event schedules provide normal scouting context.
- A logical match record is distinct from a local capture session, request idempotency key, observation identity, and revision.
- Match observations are append-oriented, bounded, auditable, and corrected by superseding or voiding.
- Season and event packages are versioned manifests with bounded resources, not unbounded Firestore documents.
- Device sync lifecycle remains local; the server returns acceptance receipts and canonical revisions.
- Separate scout records are retained. Consensus is derived and never silently overwrites evidence.
- Pit scouting stores contributor submissions/revisions by event and team; canonical profiles are derived.
- Permissions are backend-enforced capabilities, not `debug` or frontend route visibility.

## Deferred empirical choices

Exact versus batch counting, made/missed capture, cycle capture, rate intervals, quantity ranges, spatial granularity, timer interaction, rating anchors, device layout, staffing model, and confidence capture remain configurable pending method validation.

## Decision records

See [the ADR index](../../architecture/adrs/README.md). Detailed schemas and endpoint contracts are in [architecture contracts](../../architecture/contracts/README.md).
