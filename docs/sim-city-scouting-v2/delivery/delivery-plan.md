# Sim-City Scouting v2 delivery plan

**Status:** Proposed; implementation is not authorized by this document

## Delivery policy

V2 is a clean cutover. Legacy scouting data is not preserved, exported, transformed, adapted, dual-written, or included in v2 analytics. Modern Firebase session and CSRF behavior remains in place. Firestore deletion is a separate destructive decision.

Every slice remains deployable behind flags, includes automated tests and security review, and defines rollout and rollback. Accessibility, offline recovery, representative-device performance, auditability, and safe failure are slice acceptance criteria.

## Implementation sequence

| Slice | Outcome | Key acceptance boundary |
|---:|---|---|
| 0 | Architecture and test foundations | Runtime schemas, capabilities, error/audit vocabulary, environment separation, CI and browser-storage spike |
| 1 | PWA shell and reusable authentication | Offline shell, safe update lifecycle, session expiry preserves drafts |
| 2 | Season and event packages | Bounded hash-verified/versioned resources activate atomically and remain usable when stale |
| 3 | Rosters and assignments | Audited lifecycle, offline availability, explicit reassignment conflicts |
| 4 | Match capture vertical slice | Complete an assignment offline through restart and later receive an idempotent server receipt |
| 5 | Structured pit scouting | Team/event contributions, revisions, claims, derived profile, and offline sync work with zero photos |
| 6 | Event data quality | Coverage, failures, conflicts, corrections, and bounded device status are actionable |
| 7 | Strategy and consensus | Raw evidence first; versioned experimental derivations expose agreement and freshness |
| 8 | Administration and governance | Narrow capabilities, package publication, retention, audit, export, and recovery operations |

Optional pit photos are not a prerequisite for Slice 5. If approved later, deliver them as a separately flagged extension after a storage-provider, billing, quota, retention, privacy, and accessibility review. Disabling photo uploads must never affect structured pit drafts or records.

## Cutover

1. Approve applicable ADRs, contracts, empirical method choices, and owners.
2. Validate v2 in an isolated environment, including authentication, CSRF, authorization, offline recovery, packages, assignments, idempotency, monitoring, and rollback.
3. Announce that legacy local and server scouting data will not carry forward.
4. Freeze legacy writes during a short maintenance window and deploy reviewed client/server releases together.
5. Enable v2 for smoke-test users, verify the end-to-end receipt flow, then expand by event flag.
6. Remove access to legacy scouting workflows and, after acceptance, generic and legacy authentication routes.
7. Delete obsolete Firestore data only with separate explicit approval.

Rollback disables v2 writes, preserves local v2 records, and restores the last approved release or repairs forward. It never translates v2 records into legacy writes. On first launch, legacy `scoutData-*` keys may be identified and offered for explicit deletion but are not parsed, uploaded, or migrated.

## Open decisions

| Decision | Owner | Needed by |
|---|---|---|
| Role-to-capability mapping and cross-scout visibility | Product owner | Slice 0 |
| Supported devices/browsers and shared-device retention | Product/security/engineering | Slice 0–1 |
| Record-key encoding, canonical hashing, idempotency-receipt retention, and payload/chunk limits | Engineering/security | Slice 0 |
| FIRST/TBA/manual source precedence, event-package expiry, and package publisher | Product/scouting lead | Slice 2 |
| Season-package approval workflow, supported component registry, and retention | Product/engineering | Slice 2 |
| Stale/reassigned assignment handling and manual capture fallback without assignment | Product/scouting lead | Slice 3 |
| Capture methods, spatial detail, timer flow, ratings, staffing | Method-validation owner | Before Slice 4 UI freeze |
| Audit, export, disaster recovery, Vercel region/plan/jobs/WAF | Engineering/operations | Slice 0 |
| Consensus metrics, minimum evidence, and algorithms | Strategy/data owner | Slice 7 |
| Optional photo value, provider, Blaze billing, limits, retention | Product/engineering | Post-MVP extension only |

Closing an item requires updating its owning ADR, contract, or product requirement—not only this table.
