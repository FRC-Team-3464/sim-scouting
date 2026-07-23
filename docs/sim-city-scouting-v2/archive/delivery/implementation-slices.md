# Dependency-aware implementation slices

> Archived delivery draft. It is superseded by `delivery/delivery-plan.md`; photos are no longer an MVP dependency.

**Status:** Proposed; no implementation authorized by this document

Each slice must leave the application deployable behind flags, add automated tests, pass security review, and define rollout/rollback. Performance tests use representative lower-powered school devices and constrained networks. Accessibility acceptance targets WCAG 2.2 AA, keyboard use, screen readers, reduced motion, 200% zoom, and 320 CSS-pixel reflow.

## Slice 0 — Architecture and test foundations

- **Prerequisites:** ADR/product approval and ownership assignments.
- **Frontend:** feature-flag and contract-test seams only.
- **Backend/data:** runtime schemas, shared error envelope, request IDs, audit vocabulary, environment separation, v2 collection/index plan.
- **Tests/security:** contract, authorization-denial, log-redaction, CI install/build/lint/test gates; threat model and secret review.
- **Offline/performance/accessibility:** IndexedDB/browser spike, payload/device budgets, automated accessibility baseline.
- **Rollout/rollback:** documentation and disabled scaffolding; remove flag scaffolding if rejected.
- **Out of scope:** user-visible v2 features.

## Slice 1 — PWA shell and reusable authentication

- **Prerequisites:** Slice 0 and accepted retention/browser policy.
- **Frontend:** installable manifest, hashed shell/static caching, role-aware shell, update lifecycle, modern auth reuse, session-expiration preservation.
- **Backend/data:** safe session capability summary if approved; no scouting model.
- **Tests/security:** offline shell, direct routes, cookie/CSRF regression, cache isolation, update safety.
- **Offline:** launch installed shell without network; authentication-required state does not delete drafts.
- **Performance/accessibility:** defined shell bundle/start budget; navigation and status semantics pass baseline.
- **Rollout/rollback:** shell flag and cache-version rollback; no Match Scouting.
- **Out of scope:** event data, assignments, capture.

## Slice 2 — Season and event packages

- **Prerequisites:** package contracts, source precedence, publisher capability.
- **Frontend:** download, verification, freshness, active/previous package selection, storage cleanup.
- **Backend/data:** bounded season/event resources, imports, overrides, publication, hashes, ETags, indexes.
- **Tests/security:** malicious package rejection, permission checks, source mapping, replay/correction, hash and compatibility tests.
- **Offline:** last complete package activates atomically and remains usable when stale.
- **Performance/accessibility:** paged resources under budgets; update/stale states announced.
- **Rollout/rollback:** publish to test event then stable event; previous known-good package remains selectable.
- **Out of scope:** assignments and submissions.

## Slice 3 — Scout roster and assignments

- **Prerequisites:** Slice 2, role policy, assignment contract.
- **Frontend:** assignment list/detail, accept/start, offline cache, coverage and stale/reassigned states, manual fallback proposal.
- **Backend/data:** roster, lifecycle/version transitions, audit, coverage queries, lead management APIs.
- **Tests/security:** transition matrix, stale offline conflicts, privilege denial, reassignment, duplicate coverage.
- **Offline:** downloaded assignments open offline; changed assignments surface conflict on reconnect.
- **Performance/accessibility:** assignment list/page budgets; status never color-only.
- **Rollout/rollback:** event-level assignment flag; fall back to disabled v2 capture, not legacy writes.
- **Out of scope:** Match Mode observations.

## Slice 4 — Match capture vertical slice

- **Prerequisites:** Slices 1–3, method-validation decisions, data/API and sync contracts.
- **Frontend:** context confirmation, monotonic timer/audit, configured observations, undo/correction, post-match review, IndexedDB capture/outbox, sync receipt.
- **Backend/data:** chunk/finalize/revision APIs, season/assignment validation, idempotency receipts, summary derivation, indexes.
- **Tests/security:** wrong identity/context, CSRF, permissions, rapid taps, timer correction, payload bounds, duplicate/hash conflict, partial failure.
- **Offline:** complete one assignment through restart and later authenticated sync; no success before receipt.
- **Performance/accessibility:** visible tap acknowledgement <100 ms; persistence off input path; Match Mode works with non-map, keyboard review, zoom, and reduced motion.
- **Rollout/rollback:** one test event/season and allow-list; disable writes while retaining local exports/drafts.
- **Out of scope:** legacy adapter, full strategy analytics, photos.

## Slice 5 — Pit Scouting

- **Prerequisites:** Slices 1–3, pit contract, photo/retention decision.
- **Frontend:** team/event profiles, separate contributor drafts, structured claims, compression, photo queue, review/sync.
- **Backend/data:** contribution revisions, derived profile, signed upload/finalization, metadata and deletion audit.
- **Tests/security:** MIME/size/hash/ownership, conflicting offline revisions, claims provenance, no match number.
- **Offline:** structured capture and compressed photos survive restart; JSON and photos retry independently.
- **Performance/accessibility:** compression does not block input; descriptions and non-photo evidence supported.
- **Rollout/rollback:** optional-photo pilot before required policy; disable uploads without losing drafts.
- **Out of scope:** automatic match verification of claims.

## Slice 6 — Event-management data quality

- **Prerequisites:** accepted match/pit records and assignment audit.
- **Frontend:** coverage gaps, missed/stale assignments, conflicts, rejected submissions, device-reported unsynced status, correction workflow.
- **Backend/data:** quality queries, privileged corrections/voids, audit events; devices report only bounded operational summaries, not canonical sync state.
- **Tests/security:** cross-scout permissions, audit immutability, correction concurrency, privacy of device summaries.
- **Offline:** lead view caches last server state; corrections queue only where safe.
- **Performance/accessibility:** paged/filterable queues; table and status alternatives.
- **Rollout/rollback:** read-only quality view before privileged actions.
- **Out of scope:** consensus algorithms.

## Slice 7 — Strategy and consensus

- **Prerequisites:** sufficient validated data and approved algorithms.
- **Frontend:** team profiles, record evidence, agreement/confidence, comparison, match planning.
- **Backend/data:** versioned consensus jobs/read models, recalculation triggers, quality metadata.
- **Tests/security:** algorithm fixtures, stale/recompute behavior, outlier audit, strategist permissions.
- **Offline:** selected event/team summaries cache read-only with freshness.
- **Performance/accessibility:** lazy-load analytics; accessible table/text equivalents for charts.
- **Rollout/rollback:** raw evidence view first, then clearly labeled experimental consensus.
- **Out of scope:** unvalidated predictive claims presented as fact.

## Slice 8 — Administration and season governance

- **Prerequisites:** all prior security/operations controls.
- **Frontend:** memberships, permissions, package publication, retention, audit, export/system settings.
- **Backend/data:** capability management, approval/version workflow, export jobs, retention/deletion and disaster-recovery operations.
- **Tests/security:** least privilege, step-up authentication, audit completeness, destructive confirmation, export isolation.
- **Offline:** administration is online-only except read-only cached status; no offline privilege changes.
- **Performance/accessibility:** long jobs asynchronous; administrative forms and tables meet the same accessibility baseline.
- **Rollout/rollback:** read-only admin views, then narrow capabilities; revoke and roll back policy versions.
- **Out of scope:** broad infrastructure migration without a new ADR.

## Recommended order

`0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`. Slice 5 may begin after Slice 3 while Slice 4 is stabilizing if shared offline and API foundations are already accepted. No slice reintroduces legacy write compatibility.
