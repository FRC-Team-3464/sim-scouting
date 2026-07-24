# Sim-City Scouting v2 delivery plan

**Status:** Delivery sequence and authentication/authorization architecture approved through their documented scopes; implementation is not authorized by this document

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

## Controlled component registry delivery ownership

The [Season Package contract](../architecture/contracts/season-package.md#controlled-component-registry) is the sole authority for component kinds, configuration, payloads, answer states, bounds, accessibility responsibilities, compatibility, and extension rules. The [historical coverage review](../validation/controlled-component-registry-evidence.md) supplies traceable evidence and gap recommendations without becoming a second schema authority. The registry is defined before empirical field selection so prototypes, packages, clients, and backend validation share one vocabulary.

| Stage | Primary responsibility | Required output | Exit boundary |
|---|---|---|---|
| Architecture closure | **Complete:** product owner and principal architect approved CCR-001 through CCR-003 on 2026-07-24 | Versioned definition/payload interfaces, interaction models, bounds, answer-state rules, accessibility ownership, compatibility, and extension policy in the Season Package contract | No design, validation plan, or implementation invents an undeclared component kind |
| UI design exploration | Design explores accessible responsive renderers for approved kinds without embedding package-specific styling | Component states and variants across supported devices, including unanswered/error/disabled/review states and non-map alternatives | Visual artifacts preserve contract behavior but do not become schema authority |
| Scouting-method validation | Lead Scouts and Strategists select the least burdensome approved component/configuration for each season observation | Ground-truth evidence, accepted limitations, selected kind/configuration, staffing implications, and approvers | No field enters a published package without a strategy use and validated method; failed methods are simplified or removed |
| Slice 0 | Engineering converts the approved registry into executable shared schemas and fixtures | Runtime configuration/payload validators, valid/invalid fixtures, canonical-hashing vectors, compatibility tests, and renderer/server contract-test helpers | Browser and Node agree on every registry fixture; unknown kinds/versions fail closed |
| Slice 2 | Engineering implements package authoring, validation, publication, download, and activation | Hash-addressed observation/component resources, cross-reference validation, compatibility enforcement, representative payload fixtures, and atomic known-good activation | An approved package can be published and activated without executable or unknown content |
| Slice 4 | Engineering implements and validates the Match subset selected for the season | Offline-capable compiled renderers, append-action/draft-response behavior, review states, payload validation, accessibility, and representative-device evidence | The full assigned Match workflow passes through receipt using only pinned registry definitions |
| Slice 5 | Engineering implements and validates the Pit subset selected for the season | Structured Pit renderers and revision payloads using the same registry rules, with zero photo dependency | The full assigned Pit workflow passes through receipt using only pinned registry definitions |
| Future extension | Product, architecture, design, and engineering review any new kind or incompatible schema | Approved ADR/contract amendment, implementation, validators, fixtures, accessibility behavior, compatibility range, and released client support | No season package references the extension before compatible clients and backend validation exist |

Season-specific labels, deltas, range buckets, choices, anchors, units, zones, component selection, and staffing are not chosen by architecture closure. They are selected through validation and published as immutable package content. A package may configure an approved kind but may never define layout, styling, executable behavior, or a new kind.

### Recommended registry sequence

1. **Complete — close the architectural vocabulary.** CCR-001 through CCR-003 are approved and incorporated into the allow-listed kinds, definition and payload shapes, resource references, bounds, answer states, accessibility ownership, compatibility, and extension rules in the Season Package contract.
2. **Explore compiled renderers.** Design every relevant state on representative supported form factors using the approved behavior. Design may recommend a contract amendment but cannot create package-defined UI behavior.
3. **Validate each observation empirically.** Begin with the strategy decision, select the least burdensome existing kind/configuration, test it against ground truth, and record the Lead Scout, Strategist, product, engineering, and accessibility outcomes required by the validation protocol.
4. **Resolve future gaps before implementation.** Simplify or remove a field that fails validation. If a genuinely necessary need has no approved kind, pause that field and approve an ADR/contract amendment and compatible registry version before implementation; do not hide the gap in package JSON or a prototype.
5. **Make the contract executable in Slice 0.** Implement shared runtime validators, canonical fixtures, compatibility checks, and cross-runtime tests for every approved definition and payload.
6. **Make packages authoritative in Slice 2.** Author, validate, hash, publish, download, and atomically activate separate observation and component resources with complete cross-reference validation.
7. **Deliver only the validated subsets.** Slice 4 ships Match renderers and Slice 5 ships Pit renderers needed by the approved season configuration; neither slice adds an ad hoc kind.
8. **Extend deliberately.** A future kind or incompatible schema repeats architecture, design, validation, implementation, accessibility, compatibility, and release approval before a published package may reference it.

Steps 2 and 3 may iterate together, but Steps 1 and 4 bound that iteration, and Step 5 must finish before package publication or capture implementation depends on the registry. The [scouting-method validation protocol](../validation/scouting-method-validation.md#registry-dependency-and-decision-ownership) owns per-observation evidence; the Season Package contract remains schema authority.

## Detailed slice definitions

These definitions are canonical. Each slice must satisfy its prerequisites, deliverables, test gates, operational constraints, and exit criteria. Later slices may start discovery earlier, but implementation cannot bypass an unmet dependency or redefine an approved contract.

### Slice 0 — Security architecture and test foundations

**Objective:** Establish executable contracts and security/test infrastructure without enabling production v2 writes or cutting over the current login flow.

**Prerequisites:** Product requirements approved; applicable ADRs/contracts and AA decisions approved or approved with amendments; engineering owners assigned; isolated development/emulator environment identified.

**Deliverables:**

- Runtime validators and fixtures for session v2, authorization projection, capability/scope grants, common errors, audit events, canonical hashing, receipts, packages, assignments, record envelopes, every controlled component definition/payload, and component/package compatibility.
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
- Frontend session v2 validation, startup restoration, approved six-hour expiry and 30-minute warning behavior, explicit renewal, no live-capture inactivity timeout, account switch, and compatible structured error handling.
- Authoritative membership/grant resolution, scoped authorization projection, authorization-version propagation, bounded cache/fail-closed behavior, and initial route/API policy enforcement.
- UID-partitioned IndexedDB foundation, retain/discard/cancel sign-out inventory, automatic-expiry retention, seven-day synchronized-record policy, migration journal, quota status, and recovery shell.
- Waiting service-worker update lifecycle that never reloads or migrates during active work.

**Security and test gates:** Cookie/CSRF regression; zero-privilege registration; unverified-membership activation denial; verification resend throttling/quota failure; non-enumerating reset response; Firebase hosted action/authorized return domain; same-UID mismatch; six-hour expiry/30-minute warning and 15-minute recent-authentication clock boundaries; no freshness interruption during active capture; expired/revoked/disabled user; wrong Origin; stale authorization version; cross-user local isolation; direct API denial; current-browser logout and administrator/operations emergency revocation; `debug` denial invariant.

**Offline, performance, and accessibility:** Installed shell opens offline into an accurate authentication-required or retained-work state. Define shell bundle/start budgets. Navigation, dialogs, focus restoration, status semantics, zoom, keyboard, screen reader, and reduced-motion behavior pass.

**Rollout and rollback:** Deploy behind a v2 shell flag to test identities with explicit memberships. Rollback restores the previous shell/cache and preserves compatible UID-owned IndexedDB data. Existing `/api/auth/*` remains only for the current application until coordinated cutover.

**Out of scope:** Season/event packages, rosters, assignments, Match/Pit capture, analytics, and administrative mutation UI.

**Exit criteria:** An approved user can establish a versioned session and scoped projection, restart/reconnect safely, switch accounts without leakage, and receive default-deny API behavior.

### Slice 2 — Season and event packages

**Objective:** Deliver bounded, immutable, hash-verified configuration and event context that can be activated atomically and used while offline or stale.

**Prerequisites:** Slice 1 complete; ADRs 0004–0005 and package contracts approved; controlled component registry and common invariants approved; Slice 0 registry schemas/fixtures passing; TBA source policy, Lead Scout override scope, Administrator publication policy, compatibility rules, and package limits fixed.

**Deliverables:**

- Season-package draft, controlled observation/component resource validation, representative payload fixtures, publication, supersede, retire, revoke, rollback, and immutable resource APIs.
- Administrator publication with mandatory confirmation and change reason; no second-person approval workflow.
- TBA-only event import jobs, bounded projections, narrow reasoned Lead Scout overrides, provenance, ETags, paging, resource hashes, and lifecycle states.
- Client staging, compatibility validation, hash verification, atomic activation, active/previous known-good selection, pinned capture references, freshness, and cleanup.

**Security and test gates:** Package capability/scope denial, unknown component kind/version, malformed definition/payload fixture, broken cross-reference, malicious/executable content rejection, hash/compatibility failure, TBA normalization, override version conflicts, publication/revocation audit, and direct API access.

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

- Assignment-derived context confirmation, one explicit timer start, device-local monotonic timing, automatic package-defined phase progression, restart restoration, simple post-match timing/incompleteness flag, compiled renderers for the season-selected Match registry subset, a redesigned responsive/accessible multi-delta running-total control where configured, undo/supersede, post-match review, and explicit unanswered states. Routine pause/manual phase/detailed clock correction/per-observation confidence controls are excluded from MVP; v1 counter styling/layout is not copied.
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

**Prerequisites:** Slices 1–3 complete and shared submission/offline foundations from Slice 4 accepted; ADR 0009 and Pit contract approved; controlled registry schemas/fixtures passing; season Pit questions mapped to approved component definitions. Photo-provider or billing decisions are not prerequisites.

**Deliverables:**

- Event/team pit assignments, contributor-owned structured drafts, compiled renderers for the season-selected Pit registry subset, claims, units, revisions, notes, provenance, disagreements, and derived profile references.
- UID-partitioned IndexedDB draft/outbox and idempotent contribution/revision synchronization using Submission Integrity.
- Purpose-specific Pit APIs enforcing assignment, event, ownership, package, capability/scope, validation, retention, and audit.
- Clear separation of pit claims from match-observed verification.

**Security and test gates:** No match-number identity, contributor spoofing, wrong assignment/event/team, conflicting revision, role revocation, stale package, claim provenance, notes/size limits, and cross-user isolation.

**Offline, performance, and accessibility:** Structured capture/review/sync survives restart. The complete workflow contains no photo control, blob queue, upload dependency, or image-only evidence.

**Rollout and rollback:** Pilot structured Pit Scouting independently. Disable Pit writes while retaining local drafts/outbox; no photo infrastructure is involved.

**Out of scope:** Firebase Storage, Blaze billing, photo uploads/processing/retention, dedicated external photo/album links, automatic claim verification, and legacy Pit migration.

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

Optional pit photos are not a prerequisite for Slice 5. The reserved `photoIds` field is prohibited in MVP requests and canonical revisions and no dedicated external photo link is delivered. If photos are approved later, deliver them as a separately flagged extension after a storage-provider, billing, quota, retention, privacy, and accessibility review. Disabling photo uploads must never affect structured pit drafts or records.

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
- **Recommendation:** keep observation-capture methods and staffing interfaces configurable until measured validation is complete; the approved simple timer and post-match issue flag are not open experiments
- **Alternatives:** architecturally select defaults now
- **Consequences:** final observation controls wait for evidence, while the approved timer baseline may proceed in Slice 4
- **Security / offline / UX:** no special impact / all candidates remain offline-capable / avoids premature interaction lock-in
- **Slices:** 4, 7; **Approval required:** Lead Scout usability/staffing and Strategist usefulness/accuracy, with product approval where scope, staffing expectations, or complexity change; **Status:** Deferred to scouting-method validation

## Slice 0 entry criteria

Slice 0 may begin only after:

1. Product Requirements, applicable ADRs, and contracts record the approved identity, package, assignment, role, shared-device, retention, export, and recovery policies without relying on a temporary approval register.
2. ADRs and contracts reflect those decisions without unresolved contradictions.
3. Engineering owners, implementation plans, and acceptance evidence are identified for canonical hashing, PWA cache ownership, application updates, IndexedDB migration/recovery, offline reconciliation, and logging/observability; implementation occurs in the owning slices, and any architectural change requires an amended decision before scaffolding diverges.
4. Canonical hashing test-vector requirements, receipt lifecycle, capability vocabulary, shared-device boundaries, and recovery objectives are testable.
5. Supported-device test inventory and isolated staging/production environment plan are identified.
6. ADRs 0013 and 0014 and the Identity and Session and Authorization contracts remain internally consistent with their approved decisions and staged gates.
7. The endpoint policy matrix, capability/scope vocabulary, permission source, session schema, same-UID reauthentication, revocation propagation, offline authorization recovery, audit schema, threat controls, and test gates are internally consistent and testable.
8. The approved CCR-001 through CCR-003 decisions in the controlled-component [historical coverage review](../validation/controlled-component-registry-evidence.md#gap-resolutions-and-recommendations) remain incorporated into the Season Package contract, ADR 0005, and schema version 1 fixtures.
9. No production implementation, dependency, deployment, or Firestore mutation begins without explicit implementation approval.

Before Slice 1 begins, the approved Firebase verification/recovery flows must have configured authorized domains, templates, throttling, quota monitoring, and emulator/test fixtures. The approved session-duration, same-UID, account-switch, scope, claims, propagation, separate projection, and default-deny evaluator policies require contract fixtures; engineering must validate cookie/CSRF compatibility, browser session restoration, projection refresh/outage behavior, route-registry completeness, and propagation behavior. Assignment-specific refinements may remain deferred until Slice 3 only where they do not change the approved capability/scope model. Administration-only UI composition may remain deferred until Slice 8, but its capabilities, recent-auth rules, and audit requirements must be fixed before Slice 0 foundations.

### Slice 0 security exit criteria

Slice 0 completes only when:

1. Versioned session, authorization projection, capability, scope, policy-decision, error, and audit schemas have runtime validators and fixtures.
2. A pure policy evaluator passes allow, deny precedence, global/event/own/assignment scope, stale version, unavailable authority, and `debug`-grants-nothing tests.
3. Default-deny middleware and endpoint policy declarations fail closed for missing policies.
4. Membership/grant schemas, indexes, emulator fixtures, authorization-version mutation, and cache invalidation behavior are testable without production Firestore writes.
5. The authentication/authorization unit, API, emulator, browser, and end-to-end test plan is executable in CI for Slice 1 integration.
6. No alternate browser-to-Firestore or unversioned v2 authentication path has been introduced.

Slice 0 is documentation-ready when these criteria are met; production-write readiness additionally requires the engineering evidence named in the architecture overview.
