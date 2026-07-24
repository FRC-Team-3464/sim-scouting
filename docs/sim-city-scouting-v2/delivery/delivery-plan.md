# Sim-City Scouting v2 delivery plan

**Status:** Delivery sequence approved through Slice 3; authentication/authorization closure additions remain proposed and implementation is not authorized by this document

## Delivery policy

V2 is a clean cutover. Legacy scouting data is not preserved, exported, transformed, adapted, dual-written, or included in v2 analytics. Modern Firebase session and CSRF behavior remains in place. Firestore deletion is a separate destructive decision.

Every slice remains deployable behind flags, includes automated tests and security review, and defines rollout and rollback. Accessibility, offline recovery, representative-device performance, auditability, and safe failure are slice acceptance criteria.

## Implementation sequence

| Slice | Outcome | Key acceptance boundary |
|---:|---|---|
| 0 | Security architecture and test foundations | Approved auth/authz contracts; runtime schemas; capability/scope evaluator; default-deny policy declarations; error/audit vocabulary; emulator/CI security harness; no production authorization writes |
| 1 | PWA shell, versioned authentication, and authorization integration | `/api/scouting/v2/auth/*`, session v2, same-UID reauthentication, account switching, authorization projection, membership/grant resolution, offline shell, and expiry-safe local ownership |
| 2 | Season and event packages | Bounded hash-verified/versioned resources activate atomically and remain usable when stale |
| 3 | Rosters and assignments | Audited lifecycle, offline availability, explicit reassignment conflicts |
| 4 | Match capture vertical slice | Complete an assignment offline through restart and later receive an idempotent server receipt |
| 5 | Structured pit scouting | Team/event contributions, revisions, claims, derived profile, and offline sync work with zero photos |
| 6 | Event data quality | Coverage, failures, conflicts, corrections, and bounded device status are actionable |
| 7 | Strategy and consensus | Raw evidence first; versioned experimental derivations expose agreement and freshness |
| 8 | Administration and governance | Narrow capabilities, package publication, retention, audit, export, and recovery operations |

## Authentication and authorization delivery ownership

Authentication and authorization are cross-cutting, but their primary implementation ownership is explicit:

| Stage | Authentication responsibility | Authorization responsibility | Exit boundary |
|---|---|---|---|
| Before Slice 0 | Approve ADR 0013 and Identity/Session contract | Approve ADRs 0010/0014, Roles/Permissions, and Authorization contract | No security foundation implementation begins with unresolved policy |
| Slice 0 | Define runtime session/error schemas and contract fixtures; retain current auth only as test evidence | Implement and test pure capability/scope evaluation, deny precedence, policy declarations, audit schema, membership/grant schemas, emulator fixtures, and default-deny middleware foundation | Framework denies undeclared/unauthorized test endpoints and passes the contract matrix without production data |
| Slice 1 | Implement versioned auth endpoints, session v2, CSRF path integration, same-UID reauthentication, account switching, revocation, and approved registration/recovery behavior | Implement authoritative membership/grant resolution, authorization-version propagation, scoped projection, cache/fail-closed behavior, and initial shell/session enforcement | An authenticated v2 user receives the correct bounded projection; direct API denial and shared-device/session tests pass |
| Slices 2–7 | Reuse the Slice 1 session boundary; add no alternate authentication path | Each slice declares and tests capability, scope, ownership/assignment, state, freshness, and audit rules for every new endpoint | No endpoint ships without a passing authorization-matrix row |
| Slice 8 | Add approved privileged reauthentication and operational account-revocation UX | Deliver user/role administration, season governance, exports, audit, retention, and recovery using the existing evaluator | Administrative workflows pass least-privilege, recent-authentication, and audit tests |

Slice 0 does not cut over the user-facing login flow. Slice 1 is the primary authentication implementation slice. Authorization begins as a mandatory foundation in Slice 0, becomes operational with identity and membership resolution in Slice 1, and remains an acceptance requirement for every subsequent slice.

## Detailed slice definitions

These definitions are canonical. Each slice must satisfy its prerequisites, deliverables, test gates, operational constraints, and exit criteria. Later slices may start discovery earlier, but implementation cannot bypass an unmet dependency or redefine an approved contract.

### Slice 0 — Security architecture and test foundations

**Objective:** Establish executable contracts and security/test infrastructure without enabling production v2 writes or cutting over the current login flow.

**Prerequisites:** Product requirements approved; applicable ADRs/contracts and AA decisions approved or approved with amendments; engineering owners assigned; isolated development/emulator environment identified.

**Deliverables:**

- Runtime validators and fixtures for session v2, authorization projection, capability/scope grants, common errors, audit events, canonical hashing, receipts, packages, assignments, and record envelopes.
- Pure default-deny policy evaluator with typed scope containment, deny precedence, authorization-version handling, recent-auth decision input, and structured safe denial output.
- Endpoint policy-declaration mechanism that rejects undeclared protected routes.
- Membership/grant schemas, index definitions, emulator fixtures, authorization-version mutation semantics, and cache invalidation interfaces.
- Cross-runtime canonical hashing fixtures, API contract-test helpers enforcing the normative REST design policy, safe request/correlation IDs, log-redaction rules, and audit vocabulary.
- CI gates for install, build, lint, unit, contract, API, emulator, accessibility baseline, and secret/configuration validation.
- Browser spike for IndexedDB quota, migration, eviction, service-worker update behavior, and UID partitioning on representative supported devices.

**Security and test gates:** Direct API denial; `debug` grants nothing; client UID/role/capability spoofing fails; global/event/own/assignment scope matrices pass; unavailable authority fails closed; logs contain no secrets or scouting payloads; contract tests verify REST method/path semantics, media types, required headers, status/error mapping, caching, size limits, and idempotency or preconditions where applicable.

**Offline, performance, and accessibility:** Establish storage/payload/device budgets and automated WCAG baseline. No field workflow is promised yet.

**Rollout and rollback:** Disabled scaffolding and emulator-only policy data. Remove scaffolding if the architecture is rejected; no production data rollback is required.

**Out of scope:** User-visible v2 features, production authorization records, PWA cutover, packages, assignments, or scouting submissions.

**Exit criteria:** The [Slice 0 security exit criteria](#slice-0-security-exit-criteria) pass and Slice 1 can integrate authentication without inventing new security semantics.

### Slice 1 — PWA shell, versioned authentication, and authorization integration

**Objective:** Deliver the installable v2 shell and make the Slice 0 security foundation operational for authenticated, role-aware, shared-device use.

**Prerequisites:** Slice 0 complete; ADR 0013, ADR 0014, Identity/Session, Authorization, Roles/Permissions, and Offline Synchronization decisions approved; duration, freshness, account-switch, and revocation policies resolved. Public zero-privilege registration, mandatory Firebase-managed verification, and Firebase-managed recovery are approved.

**Deliverables:**

- Installable PWA manifest and content-hashed shell/static caching; authenticated API responses are never service-worker cached.
- `/api/scouting/v2/auth/*` endpoints for CSRF, public zero-privilege registration, verification resend, Firebase-managed recovery initiation, login, session v2, same-UID reauthentication, and current-browser logout.
- Frontend session v2 validation, startup restoration, warning/expiry behavior, account switch, and compatible structured error handling.
- Authoritative membership/grant resolution, scoped authorization projection, authorization-version propagation, bounded cache/fail-closed behavior, and initial route/API policy enforcement.
- UID-partitioned IndexedDB foundation, retain/discard/cancel sign-out inventory, automatic-expiry retention, seven-day synchronized-record policy, migration journal, quota status, and recovery shell.
- Waiting service-worker update lifecycle that never reloads or migrates during active work.

**Security and test gates:** Cookie/CSRF regression; zero-privilege registration; unverified-membership activation denial; verification resend throttling/quota failure; non-enumerating reset response; Firebase hosted action/authorized return domain; same-UID mismatch; expired/revoked/disabled user; wrong Origin; stale authorization version; cross-user local isolation; direct API denial; current-browser logout and administrator/operations emergency revocation; `debug` denial invariant.

**Offline, performance, and accessibility:** Installed shell opens offline into an accurate authentication-required or retained-work state. Define shell bundle/start budgets. Navigation, dialogs, focus restoration, status semantics, zoom, keyboard, screen reader, and reduced-motion behavior pass.

**Rollout and rollback:** Deploy behind a v2 shell flag to test identities with explicit memberships. Rollback restores the previous shell/cache and preserves compatible UID-owned IndexedDB data. Existing `/api/auth/*` remains only for the current application until coordinated cutover.

**Out of scope:** Season/event packages, rosters, assignments, Match/Pit capture, analytics, and administrative mutation UI.

**Exit criteria:** An approved user can establish a versioned session and scoped projection, restart/reconnect safely, switch accounts without leakage, and receive default-deny API behavior.

### Slice 2 — Season and event packages

**Objective:** Deliver bounded, immutable, hash-verified configuration and event context that can be activated atomically and used while offline or stale.

**Prerequisites:** Slice 1 complete; ADRs 0004–0005 and package contracts approved; TBA source policy, Lead Scout override scope, Administrator publication policy, compatibility rules, and package limits fixed.

**Deliverables:**

- Season-package draft, validation, publication, supersede, retire, revoke, rollback, and immutable resource APIs.
- Administrator publication with mandatory confirmation and change reason; no second-person approval workflow.
- TBA-only event import jobs, bounded projections, narrow reasoned Lead Scout overrides, provenance, ETags, paging, resource hashes, and lifecycle states.
- Client staging, compatibility validation, hash verification, atomic activation, active/previous known-good selection, pinned capture references, freshness, and cleanup.

**Security and test gates:** Package capability/scope denial, malicious/executable content rejection, hash/compatibility failure, TBA normalization, override version conflicts, publication/revocation audit, and direct API access.

**Offline, performance, and accessibility:** Last complete compatible package remains available with textual freshness/revocation status. Resources stay within contract budgets and activate without blocking interaction.

**Rollout and rollback:** Publish to an isolated test season/event first; retain the previous known-good version. Rollback changes the active immutable version and never edits published content.

**Out of scope:** Assignment lifecycle, scouting capture, photo storage, arbitrary executable forms, or a second event-data source.

**Exit criteria:** A permitted user downloads and atomically activates a verified package; stale/offline operation and revoked/incompatible recovery behave exactly as contracted.

### Slice 3 — Rosters and assignments

**Objective:** Establish server-authoritative scouting coverage, assignment lifecycle, emergency coverage, and offline conflict behavior.

**Prerequisites:** Slices 1–2 complete; ADRs 0003/0010/0014 and Assignment contract approved; Lead Scout event scopes and roster ownership defined.

**Deliverables:**

- Event roster, active/standby availability, own/event assignment projections, lifecycle/version transitions, claims, completion linkage, reassignment, cancellation, missed coverage, and immutable audit.
- Scout assignment queue/detail with accept/start/release behavior and offline cached projection.
- Lead Scout management for intentional duplicate coverage, reassignment, and flagged emergency assignments; Scouts cannot independently begin manual scouting.
- Former-assignee evidence and stale-version conflict states that preserve attribution without completing the replacement assignment.

**Security and test gates:** Transition matrix, optimistic-version conflicts, wrong event/assignee, standby read-only enforcement, emergency-assignment denial, Lead/Admin separation, duplicate claims, reassignment races, and audit completeness.

**Offline, performance, and accessibility:** Downloaded assignments open offline. Reconnect exposes changed/reassigned context without deleting work. Lists are indexed/paged and status never relies on color.

**Rollout and rollback:** Event-scoped flag and test roster. Rollback disables new v2 assignment/capture entry while retaining server audit and local projections; it never falls back to legacy writes.

**Out of scope:** Match observations, Pit contributions, unrestricted manual scouting, and strategy analytics.

**Exit criteria:** Lead Scouts can establish auditable coverage and Scouts can safely claim/use assignments through offline/reassignment scenarios.

### Slice 4 — Match capture vertical slice

**Objective:** Complete one assigned Match Scouting workflow locally through restart and synchronize it idempotently to an attributable canonical revision.

**Prerequisites:** Slices 0–3 complete; ADRs 0002, 0006, and 0007 and Match/Submission/Offline contracts approved; required scouting-method choices validated for the delivered observation subset.

**Deliverables:**

- Assignment-derived context confirmation, monotonic match timing/audit, package-configured observations, undo/supersede, post-match review, and explicit unanswered states.
- Transactional IndexedDB capture/observations/outbox, immutable canonical payload/hash, bounded chunk upload, finalization, receipt reconciliation, retry, rejection, and conflict recovery.
- Purpose-specific Match APIs with current capability, event/assignment/ownership, package, resource-state, idempotency, and audit enforcement.
- Own-record/receipt/sync-status views and Lead Scout conflict visibility without ordinary Scout peer access or live leaderboards.

**Security and test gates:** Spoofed identity/context, wrong assignment/event, CSRF, revoked role, stale authorization/assignment, duplicate key/hash conflict, chunk substitution/order, validation failure, partial response loss, and receipt replay.

**Offline, performance, and accessibility:** Entire assigned workflow survives offline restart and expired session. Visible local acknowledgement targets under 100 ms; persistence is off the rapid-input path. Keyboard review, screen reader semantics, reflow, non-map alternatives, and reduced motion pass.

**Rollout and rollback:** One test event/season and explicit allow-list. Rollback disables server writes but preserves local drafts/outbox and bounded recovery export; no legacy submission path is used.

**Out of scope:** Universal unvalidated capture defaults, full event-quality dashboard, consensus, predictive analytics, and photos.

**Exit criteria:** An assigned Scout completes a match offline and later receives exactly one valid server receipt without data loss, misattribution, or premature synchronized status.

### Slice 5 — Structured Pit Scouting

**Objective:** Deliver attributable, offline structured Pit Scouting and derived team/event profiles with zero photo dependency.

**Prerequisites:** Slices 1–3 complete and shared submission/offline foundations from Slice 4 accepted; ADR 0009 and Pit contract approved; season pit questions defined. Photo-provider or billing decisions are not prerequisites.

**Deliverables:**

- Event/team pit assignments, contributor-owned structured drafts, claims, units, revisions, notes, provenance, disagreements, and derived profile references.
- UID-partitioned IndexedDB draft/outbox and idempotent contribution/revision synchronization using Submission Integrity.
- Purpose-specific Pit APIs enforcing assignment, event, ownership, package, capability/scope, validation, retention, and audit.
- Clear separation of pit claims from match-observed verification.

**Security and test gates:** No match-number identity, contributor spoofing, wrong assignment/event/team, conflicting revision, role revocation, stale package, claim provenance, notes/size limits, and cross-user isolation.

**Offline, performance, and accessibility:** Structured capture/review/sync survives restart. The complete workflow contains no photo control, blob queue, upload dependency, or image-only evidence.

**Rollout and rollback:** Pilot structured Pit Scouting independently. Disable Pit writes while retaining local drafts/outbox; no photo infrastructure is involved.

**Out of scope:** Firebase Storage, Blaze billing, photo uploads/processing/retention, automatic claim verification, and legacy Pit migration.

**Exit criteria:** A Scout completes and synchronizes a structured contribution with zero photos; authorized users see attributable profile evidence and disagreement.

### Slice 6 — Event-management data quality

**Objective:** Make coverage gaps, synchronization failures, authorization/validation rejections, conflicts, and audited corrections operationally actionable for Lead Scouts.

**Prerequisites:** Accepted assignment, Match, and Pit records; required indexes/audit; approved correction/void, qualification-close, device-summary, and export scopes.

**Deliverables:**

- Event Management views for missing/missed/stale assignments, duplicate/former evidence, rejected/quarantined submissions, conflicts, receipt gaps, and bounded device operational summaries.
- Lead Scout correction, void, conflict-resolution, qualification close/reopen, and narrow event-override workflows with required reasons and recent authentication where contracted.
- Purpose-specific quality queries, immutable audit links, and asynchronous identifiable export requests for approved roles.

**Security and test gates:** Ordinary Scout peer/analytics denial, Lead/Admin separation, correction concurrency, void preservation, privileged read/export audit, device-summary privacy, and qualification-summary release rules.

**Offline, performance, and accessibility:** Lead views may cache last server state as visibly stale; privileged mutations are online unless explicitly declared safe. Queues are indexed, paged, filterable, and have table/text alternatives.

**Rollout and rollback:** Start with read-only coverage/quality views, then enable narrow privileged operations. Rollback disables mutations without erasing audit or source evidence.

**Out of scope:** Season-package administration, silent record mutation/merge, consensus algorithms, and unrestricted device telemetry.

**Exit criteria:** Lead Scouts can diagnose and resolve event data-quality problems without technical Administrator powers or loss of original evidence.

### Slice 7 — Strategy and consensus

**Objective:** Provide authorized, explainable strategy views over finalized evidence and only validated/versioned derivations.

**Prerequisites:** Sufficient accepted event data; ADR 0011 and metric-specific validation approved; qualification visibility policy enforced; derivation owners and freshness rules identified.

**Deliverables:**

- Read-only Strategy workspace for finalized raw evidence, provenance, disagreement, confidence, team comparison, and match-planning inputs.
- Versioned consensus/read-model jobs with contributing revisions, algorithm version, agreement/outlier measures, recomputation/freshness, and safe failure independent of submission acceptance.
- Authorized analytics and export APIs with event/global scope and audit where required.

**Security and test gates:** Scout live-leaderboard/peer denial, post-qualification release, strategist read-only enforcement, cross-event denial, stale derivation, algorithm fixtures, outlier/provenance preservation, and export authorization.

**Offline, performance, and accessibility:** Selected summaries may cache read-only with freshness. Analytics lazy-load; charts have table/text equivalents and never present unvalidated predictions as facts.

**Rollout and rollback:** Release raw evidence views first, then clearly labeled experimental derivations. Disable a derivation version without invalidating accepted records.

**Out of scope:** Source-record mutation, assignment management, opaque rankings, and unvalidated predictive claims.

**Exit criteria:** Strategists can trace every presented result to authorized source revisions and understand agreement, uncertainty, algorithm version, and freshness.

### Slice 8 — Administration and governance

**Objective:** Deliver technical governance and recovery controls without granting Administrators normal event-operation or record-mutation powers.

**Prerequisites:** Prior security/operational controls accepted; Administrator capability bundle, recent-authentication window, audit availability, export/retention, backup/restore, and destructive confirmation rules approved.

**Deliverables:**

- Membership, role, scoped-grant, suspension/revocation, and authorization-version administration with last-Administrator safeguards.
- Season-package draft/publication/revoke/rollback with mandatory confirmation/change reason and no second-person approval workflow.
- Read-only scouting support access, audit search, asynchronous requester-bound exports, retention status, backup/restore evidence, Administrator account suspension and emergency session revocation, and approved system-governance settings.
- Online-only privileged workflows with current policy, recent authentication, explicit target/environment, reason, bounded diff, request ID, and audit.

**Security and test gates:** Least privilege; Administrator cannot manage assignments or correct/void records by default; Lead Scout cannot publish packages or manage technical settings; recent-auth challenge; role-change propagation; export isolation; audit completeness; destructive confirmation; restore/environment safeguards.

**Offline, performance, and accessibility:** Administration is online-first; cached status is read-only and visibly stale. Long operations are resumable asynchronous jobs. Forms, tables, confirmations, and job status meet the same accessibility baseline.

**Rollout and rollback:** Release read-only governance/status first, then narrow mutations by capability. Policy/package versions can be revoked or rolled back; audit remains immutable.

**Out of scope:** Deployment/server-secret editing from event workflows, broad infrastructure migration, Administrator assignment operation, and silent scouting-record modification.

**Exit criteria:** Authorized Administrators can govern identity, packages, retention, audit, export, and recovery through least-privilege, recently authenticated, fully audited workflows.

Optional pit photos are not a prerequisite for Slice 5. If approved later, deliver them as a separately flagged extension after a storage-provider, billing, quota, retention, privacy, and accessibility review. Disabling photo uploads must never affect structured pit drafts or records.

## Cutover

1. Approve applicable ADRs, contracts, empirical method choices, and owners.
2. Validate v2 in an isolated environment, including authentication, CSRF, authorization, offline recovery, packages, assignments, idempotency, monitoring, and rollback.
3. Announce that legacy local and server scouting data will not carry forward.
4. Freeze legacy writes during a short maintenance window and deploy reviewed client/server releases together.
5. Enable v2 for smoke-test users, verify the end-to-end receipt flow, then expand by event flag.
6. Remove access to legacy scouting workflows and, after acceptance, generic data routes, `/api/login`, `/api/register`, and the superseded `/api/auth/*` surface; v2 clients retain only `/api/scouting/v2/auth/*`.
7. Delete obsolete Firestore data only with separate explicit approval.

Rollback disables v2 writes, preserves local v2 records, and restores the last approved release or repairs forward. It never translates v2 records into legacy writes. On first launch, legacy `scoutData-*` keys may be identified and offered for explicit deletion but are not parsed, uploaded, or migrated.

## Decision-review register

This is a temporary approval surface and never replaces Product Requirements, an ADR, a contract, or validation authority. `PO required` identifies whether product-owner approval is needed. After approval, each entry must pass the repository-wide [approval-closure review](../README.md#approval-closure-and-temporary-review-material), be incorporated into every appropriate canonical owner, and then be removed. If only part remains open, replace the entry with only that unresolved question. Remove this section when no unresolved entries remain.

### DR-016 — Scouting methods and staffing

- **Existing authority:** ADRs 0005, 0006, 0011; method-validation protocol
- **Recommendation:** keep capture and staffing interfaces configurable until measured validation is complete
- **Alternatives:** architecturally select defaults now
- **Consequences:** final Match Mode controls wait for evidence
- **Security / offline / UX:** no special impact / all candidates remain offline-capable / avoids premature interaction lock-in
- **Slices:** 4, 7; **PO required:** Scouting-lead approval; **Status:** Deferred to scouting-method validation

### DR-017 — Optional pit photos

- **Existing authority:** ADR 0009; pit contract
- **Recommendation:** no MVP photo dependency; reconsider only after product-value and cost validation
- **Alternatives:** required or optional MVP uploads
- **Consequences:** no Firebase Storage or Blaze dependency in MVP
- **Security / offline / UX:** no image risk / no blob queue / structured pit flow stays complete
- **Slices:** later than 5; **PO required:** Later; **Status:** Deferred to a later delivery slice

## Authentication and authorization closure register

This temporary register is the focused approval surface for unresolved parts of ADRs 0013–0014 and their contracts. It does not override the cited authority. “PO decision” states the exact approval still needed. Approved entries must pass the repository-wide [approval-closure review](../README.md#approval-closure-and-temporary-review-material), be incorporated into every appropriate canonical owner, and then be removed; an approved row is not retained merely as history. Remove this section when no unresolved entries remain.

| ID | Topic and authority | Recommendation / alternatives | Security, offline, and UX impact | Slices | PO decision | Status |
|---|---|---|---|---|---|---|
| AA-01 | Existing authentication reuse — ADR 0013; Identity/Session | Reuse Firebase identity, Node exchange, HttpOnly session, revocation checks, signed CSRF, and exact Origin behind new `/api/scouting/v2/auth/*` endpoints. Alternative: retain unversioned public paths or replace the security boundary. | Preserves tested controls while giving v2 one clean namespace; no offline login; coordinated client/server cutover. | 0–1 | Approve reuse through the versioned v2 namespace. | Proposed |
| AA-02 | Authentication extensions — ADR 0013; Identity/Session | Add session v2, same-UID reauthentication, explicit account switch, and credential age. Alternative: current identity/timing response only. Administrator/operations emergency revocation remains a separate incident-response control, not Scout all-device logout. | Prevents cross-user replay; preserves offline work; adds explicit switch/freshness UX. | 0–1 | Approve extensions. | Proposed |
| AA-03 | Session duration/renewal — ADR 0013 | Keep six-hour absolute duration, warn at 30 minutes, explicit renewal, no live-capture idle timeout. Alternatives: shorter duration, rolling or idle expiry. | Limits session window without interrupting matches; offline expiry pauses sync. | 0–1 | Approve or amend duration/warning/idle policy. | Proposed |
| AA-04 | Fresh-session semantics — ADR 0013 | Use server `authenticatedAt`, not warning state; active capture is never freshness-gated. Alternative: route-only warning gate. | Real credential-age control; avoids match interruption; clearer prompt. | 0–8 | Approve credential-age model. | Proposed |
| AA-06 | Capability vocabulary — ADR 0014; Authorization | Use allow-listed `scouting.<resource>.<action>` vocabulary in contract. Alternative: current mixed names or role checks. | Default-deny and testable; cached names remain hints; consistent UX. | 0–8 | Approve vocabulary. | Proposed |
| AA-07 | Scope model — ADR 0014; Authorization | Typed global, season, event, team, assignment, and own scopes. Alternative: event IDs embedded ad hoc in roles. | Blocks cross-scope access; supports downloaded assignments; explains denials. | 0–8 | Approve typed scopes. | Proposed |
| AA-08 | Permission source of truth — ADR 0014 | Firestore membership/grants are canonical. Alternatives: custom claims only or client state. | Auditable dynamic policy; server lookup needed; offline grants provisional. | 0–8 | Approve Firestore authority. | Proposed |
| AA-09 | Custom-claim usage — ADR 0014 | Store only compact authorization-version hint and feature-only `debug`. Alternative: dynamic grants in claims. | Avoids stale/oversized claims; no offline authority; invisible to ordinary UX. | 0–1 | Approve limited claims. | Proposed |
| AA-10 | Authorization propagation — ADR 0014 | Increment version on every change; sensitive/sync/version-mismatch checks use current authority; bounded cache otherwise. Alternative: wait for session expiry. | Faster revocation; stale offline capture preserved but sync denied; refresh states required. | 0–8 | Approve propagation rule. | Proposed |
| AA-11 | Public session contract — Identity/Session | Versioned identity, roles/global hints, auth version, credential and expiry times; dynamic scopes fetched separately. Alternative: embed every grant. | Bounded/privacy-aware; offline retains last projection; one additional projection request. | 0–1 | Approve separate scoped projection. | Proposed |
| AA-12 | Backend policy enforcement — ADR 0014; Authorization | Reusable ordered evaluator and mandatory endpoint declarations. Alternative: scattered middleware/role checks. | Prevents frontend-only bypass; fails closed; consistent errors. | 0–8 | Approve enforcement model. | Proposed |
| AA-15 | Role change/revocation — ADRs 0013–0014 | Increment version, revoke/re-authenticate, recheck sync, retain rejected evidence. Alternative: wait for expiry/delete work. | Prompt revocation without destructive loss; recovery status required. | 0–8 | Approve behavior. | Proposed |
| AA-16 | Offline authorization — ADR 0014; Authorization | Permit downloaded-assignment capture as authorization pending; server acceptance always current. Alternative: block all offline capture when projection is stale. | Preserves field evidence while denying stale server access; explicit pending/rejected UX. | 0–6 | Approve recommendation. | Proposed |
| AA-18 | Logout/unsynchronized work — ADRs 0008/0013 | Retain/discard/cancel; timeout retains; only same UID resumes; different UID uses account switch. Alternative: automatic purge or cross-user recovery. | Prevents deletion and cross-user upload; adds inventory/confirmation. | 0–5 | Approve same-UID/account-switch refinement; base policy is already approved. | Proposed |
| AA-19 | Sensitive-operation reauthentication — ADR 0013; Authorization | Proposed 15-minute credential age for role changes, publication, overrides, others' correction/void, exports, audit, revocation, destructive cleanup. Alternatives: none or per-route warning threshold. | Limits stolen-session impact; online-only privileged prompt; no capture interruption. | 0–8 | Approve or amend window and operation list. | Proposed |
| AA-20 | Authorization audit — Authorization contract | Audit policy changes, sensitive reads/actions, emergency/correction/publication/export/cleanup with bounded diffs and redaction. Alternative: platform logs only. | Investigation and accountability; no offline audit authority; reason prompts. | 0–8 | Approve event set and fields. | Proposed |
| AA-21 | Authentication/authorization test gates — both contracts | Unit, API, emulator, browser, and end-to-end denial/revocation/offline/shared-device gates. Alternative: rely on current auth tests. | Prevents regression and direct-API bypass; exercises offline recovery; adds CI work. | 0–8 | Approve as Slice 0 gate. | Proposed |

## Slice 0 entry criteria

Slice 0 may begin only after:

1. Product Requirements, applicable ADRs, and contracts record the approved identity, package, assignment, role, shared-device, retention, export, and recovery policies without relying on a temporary approval register.
2. ADRs and contracts reflect those decisions without unresolved contradictions.
3. Engineering owners, implementation plans, and acceptance evidence are identified for canonical hashing, PWA cache ownership, application updates, IndexedDB migration/recovery, offline reconciliation, and logging/observability; implementation occurs in the owning slices, and any architectural change requires an amended decision before scaffolding diverges.
4. Canonical hashing test-vector requirements, receipt lifecycle, capability vocabulary, shared-device boundaries, and recovery objectives are testable.
5. Supported-device test inventory and isolated staging/production environment plan are identified.
6. ADRs 0013 and 0014, the Identity and Session contract, the Authorization contract, and every remaining item in the authentication/authorization closure register are approved or approved with amendments.
7. The endpoint policy matrix, capability/scope vocabulary, permission source, session schema, same-UID reauthentication, revocation propagation, offline authorization recovery, audit schema, threat controls, and test gates are internally consistent and testable.
8. No production implementation, dependency, deployment, or Firestore mutation begins without explicit implementation approval.

Before Slice 1 begins, the approved Firebase verification/recovery flows must have configured authorized domains, templates, throttling, quota monitoring, and emulator/test fixtures. Session duration, cookie/CSRF compatibility, account switching, browser session restoration, authorization projection, propagation, and fail-closed membership resolution must be approved. Assignment-specific refinements may remain deferred until Slice 3 only where they do not change the approved capability/scope model. Administration-only UI composition may remain deferred until Slice 8, but its capabilities, recent-auth rules, and audit requirements must be fixed before Slice 0 foundations.

### Slice 0 security exit criteria

Slice 0 completes only when:

1. Versioned session, authorization projection, capability, scope, policy-decision, error, and audit schemas have runtime validators and fixtures.
2. A pure policy evaluator passes allow, deny precedence, global/event/own/assignment scope, stale version, unavailable authority, and `debug`-grants-nothing tests.
3. Default-deny middleware and endpoint policy declarations fail closed for missing policies.
4. Membership/grant schemas, indexes, emulator fixtures, authorization-version mutation, and cache invalidation behavior are testable without production Firestore writes.
5. The authentication/authorization unit, API, emulator, browser, and end-to-end test plan is executable in CI for Slice 1 integration.
6. No alternate browser-to-Firestore or unversioned v2 authentication path has been introduced.

Slice 0 is documentation-ready when these criteria are met; production-write readiness additionally requires the engineering evidence named in the architecture overview.
