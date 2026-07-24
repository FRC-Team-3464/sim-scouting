# Sim-City Scouting v2 product requirements

**Status:** Approved by product owner

## Product goal

Provide an assignment-driven, offline-first FRC scouting system that lets scouts capture attributable observations quickly and lets leads and strategists understand coverage, evidence, and data quality. V2 is a clean break from legacy scouting data and payloads; the existing Firebase session-cookie and CSRF platform remains the authentication baseline.

## Users and workspaces

The product has four role-aware workspaces. A user may have access to more than one workspace, but backend capabilities—not navigation visibility—authorize every operation. All workspaces share authenticated team/event context, package freshness, offline status, and accessible navigation.

### Scout workspace

**Primary users:** Scouts and Lead Scouts when personally assigned to capture.

**Purpose:** Complete attributable match and structured pit assignments quickly, accurately, and offline with minimal manual context entry.

**Responsibilities:**

- view and accept the user's active assignments;
- confirm server-provided event, match, station, and team context;
- capture, review, correct, and locally persist observations;
- submit through the outbox and inspect the user's own receipts, conflicts, and sync status; and
- resume retained work after same-user reauthentication.

An ordinary Scout cannot browse peer raw records, live cross-scout analytics, live team leaderboards, or qualification-period derived summaries. A Scout without an active assignment is read-only. The Scout workspace is the first user-facing delivery priority.

### Strategy workspace

**Primary users:** Strategists and authorized Lead Scouts.

**Purpose:** Turn finalized scouting evidence into explainable team evaluation and match-planning information without changing source observations.

**Responsibilities:**

- inspect finalized cross-scout records, provenance, disagreement, and confidence;
- compare team profiles and derived metrics;
- view versioned consensus only when sufficient validated evidence exists; and
- request authorized exports for further analysis.

Strategy access is read-only for scouting evidence. It cannot correct records, resolve assignment conflicts, publish packages, or present unvalidated predictions as fact. Full Strategy delivery follows validated capture and sufficient event data.

### Event Management workspace

**Primary users:** Lead Scouts.

**Purpose:** Operate scouting coverage and data quality during an event without exposing technical administration controls.

**Responsibilities:**

- manage rosters, availability, assignments, reassignment, intentional duplicate coverage, and emergency assignments;
- monitor missing coverage, stale work, rejected submissions, conflicts, and synchronization problems;
- review peer evidence and perform audited correction, void, and conflict-resolution workflows;
- apply narrow, reasoned event-data overrides; and
- explicitly close or reopen qualification collection with an audit reason.

This workspace cannot publish season packages, manage deployment/server configuration, change retention or backup policy, or administer technical secrets.

### Administration workspace

**Primary users:** Administrators.

**Purpose:** Provide technical governance without becoming the normal event-operations interface.

**Responsibilities:**

- manage memberships, roles, and capability policy;
- draft, publish, supersede, retire, revoke, and roll back season packages;
- manage retention, audited exports, backup/recovery status, and system governance;
- inspect audit history, operational health, and read-only scouting records for support; and
- manage environment-safe administrative settings exposed by approved contracts.

Administrators do not manage assignments, resolve event conflicts, or modify scouting records by default. Administration is online-first; destructive or privileged operations require confirmation, reason, current authorization, and audit.

Other workspaces may initially expose only the minimum capabilities required to operate the Scout workspace safely. Strategy, Event Management, and Administration functionality expands through their corresponding delivery slices.

## Account access and recovery

- Public email/password registration is allowed and creates a Firebase identity with zero application roles, capabilities, team memberships, or event scopes.
- Firebase sends and handles the email-verification action. Email verification is required before an Administrator may activate team membership and normally grant the Scout role.
- Lead Scout, Strategist, and Administrator access is always an explicit, audited role assignment; public registration never grants elevated access.
- A registered user without active membership sees a pending/no-access state rather than a protected workspace.
- Firebase owns the password-reset email and hosted reset action. The application provides only a thin request/status surface, returns a non-enumerating response, and does not introduce SMTP, custom password storage, or an application-managed reset form.
- Verification resend and password-reset initiation are rate-limited and monitored against Firebase no-cost quotas. Quota exhaustion fails safely and does not weaken verification requirements.
- Ordinary sign-out resolves the current user's unsynchronized-work choice and clears authentication only from the current browser. Scout self-service all-device sign-out is outside the approved product scope and is not a planned backlog item.
- Administrators and operations retain a separate, audited account-suspension and emergency session-revocation capability for lost devices or compromised accounts. This incident-response control is not exposed as an ordinary Scout sign-out option.

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
- Shared-device mode partitions local work by authenticated UID. Explicit sign-out offers retain or discard when unsynchronized work exists; session expiry always retains work for same-user reauthentication.
- Synchronized local records are retained for seven days and may be cleaned earlier under storage pressure.

## Quality requirements

- Target WCAG 2.2 AA, keyboard operation, screen readers, reduced motion, 200% zoom, and 320 CSS-pixel reflow.
- Primary capture actions provide visible acknowledgement within 100 ms on representative lower-powered devices.
- Payloads and downloaded resources are bounded, versioned, validated, and recoverable.
- Security acceptance includes authorization denial tests, CSRF/session regression tests, safe logs, audit events, and environment isolation.
- MVP supports current Android, iOS, iPadOS, Windows, ChromeOS, and macOS releases plus the three immediately preceding major OS versions; representative smartphones, tablets, Chromebooks, Windows laptops, and MacBooks must pass acceptance testing.

## Out of scope for MVP

- Legacy scouting-data migration, adapter, dual write, or legacy analytics inclusion
- Required pit photos or remote photo storage
- Unvalidated consensus or predictive claims presented as fact
- Broad infrastructure migration
- A generic executable form or plugin system

## Acceptance summary

At a test event, an authorized scout can install/open the app, download a package and assignment, finish match and structured pit work offline through a restart, reauthenticate if needed, reconnect, synchronize idempotently, and see server receipts. Leads can identify coverage and failures. Wrong-context, duplicate, unauthorized, corrupt, and conflicting inputs fail safely without losing local work.
