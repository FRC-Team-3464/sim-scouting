# Sim-City Scouting v2 — Codex Phase 1.6 Master Prompt

You are the architecture-validation and future implementation agent for the **Sim-City Scouting v2** project, a Progressive Web Application for FIRST Robotics Competition Team 3464.

You have access to the repository, but you do **not** have access to the prior ChatGPT or v0 conversations. The repository documentation is your onboarding context. Your first task is an **analysis-only architecture phase**. Do not implement production code yet.

---

## 1. Required Git branch and baseline

The authoritative code baseline is:

- Base branch: `feat/firebase-session-auth`
- Working branch: `architecture/sim-city-scouting-v2`

`feat/firebase-session-auth` contains the latest authentication, Firebase session-cookie, CSRF, reauthentication, route-protection, API-client, and related test refactoring intended for reuse in v2. `main` is currently behind that work and must **not** be treated as the architecture baseline.

At the beginning of the task:

1. Run `git status --short --branch`.
2. Run `git branch --show-current`.
3. Run `git rev-parse HEAD`.
4. Run `git log --oneline --decorate -10`.
5. Verify that the current branch is `architecture/sim-city-scouting-v2`.
6. Verify that it was created from, or contains, `feat/firebase-session-auth`.
7. Confirm that the expected modern authentication implementation exists:
   - `/api/auth/*`
   - Firebase Authentication
   - HttpOnly Firebase session cookies
   - CSRF middleware
   - `AuthenticationProvider`
   - `ProtectedRoute`
   - `FreshSessionRoute`
   - in-place reauthentication/session-expiration handling
8. Stop and report the problem if the branch, ancestry, or expected authentication implementation is missing.

During this task:

- Do not switch branches.
- Do not merge `main`.
- Do not rebase.
- Do not modify `feat/firebase-session-auth`.
- Do not force-push.
- Commit documentation changes only to `architecture/sim-city-scouting-v2`.
- Do not modify production React or backend application code.


---

## 2. Documentation organization

The current repository documentation is spread across:

```text
docs/
├── prompts/
├── proposals/
├── requirements/
├── sim-city-scouting-v2/
├── technical-debt/
└── deployment-setup.md
```

You are authorized to reorganize documentation during this analysis-only task when doing so improves clarity. Do not move production source files.

Use this target structure unless repository inspection reveals a better structure:

```text
docs/
├── README.md
├── legacy/
│   └── requirements/
│       └── match-scouting-page.md
├── platform/
│   ├── deployment/
│   │   └── deployment-setup.md
│   ├── proposals/
│   │   └── firebase-session-authentication.md
│   └── technical-debt/
│       └── frontend-lint-baseline.md
└── sim-city-scouting-v2/
    ├── README.md
    ├── product/
    │   ├── requirements/
    │   │   ├── sim-city-scouting-pwa-requirements.md
    │   │   └── match-scouting-v2-requirements.md
    │   └── analysis/
    │       ├── phase-1-product-analysis.md
    │       └── phase-1-5-product-analysis.md
    ├── architecture/
    │   ├── codex-project-handoff.md
    │   ├── phase-1-scouting-redesign-spec.md
    │   ├── phase-1-6-architecture-decisions.md
    │   ├── adrs/
    │   └── contracts/
    ├── validation/
    │   └── phase-2-method-validation-plan.md
    ├── design/
    │   ├── v0-design-constraints.md
    │   └── directions/
    ├── delivery/
    │   ├── migration-cutover-plan.md
    │   ├── implementation-slices.md
    │   └── unresolved-product-questions.md
    └── prompts/
        ├── frc-scouting-ui-ux-redesign-prompt.md
        ├── phase-1-5-expand-product-analysis.md
        ├── v0-to-codex-handoff-prompt.md
        └── codex-phase-1-6-master-prompt.md
```

Documentation-reorganization rules:

1. Inventory and read all current documentation before moving it.
2. Use `git mv` so file history is preserved.
3. Do not delete content merely because it is outdated. Move superseded material to an appropriate legacy or archive location and label its status.
4. Update every relative Markdown link and every repository reference after moving files.
5. Add `docs/README.md` as the documentation entry point.
6. Add `docs/sim-city-scouting-v2/README.md` as the v2 documentation map, including:
   - document purpose
   - status
   - owner or intended audience
   - source-of-truth priority
   - recommended reading order
7. Add brief README files to directories when their purpose would otherwise be unclear.
8. Avoid duplicate source-of-truth documents. Prefer one canonical document with links from indexes.
9. Preserve prompts as historical execution artifacts; do not treat prompts as approved architecture decisions.
10. Keep legacy requirements visibly separated from approved v2 requirements.
11. Record all moves and renames in the final response.
12. If a referenced document does not exist, report it rather than creating invented content.
13. A different target structure is allowed only when the reason is documented and the resulting hierarchy remains easy to navigate.

Do not reorganize the documentation until the initial inventory and repository-verification steps are complete.

---

## 3. Mandatory repository onboarding

Before making architecture recommendations or moving documentation:

1. Run a complete documentation inventory, such as `find docs -type f | sort`.
2. Read the current `docs/sim-city-scouting-v2/codex-project-handoff.md` first.
3. Read every current document under:
   - `docs/sim-city-scouting-v2/`
   - `docs/requirements/`
   - `docs/prompts/`
   - `docs/proposals/`
   - `docs/technical-debt/`
4. Read `docs/deployment-setup.md`.
5. Locate and read any additional documents referenced by those files.
6. Identify files mentioned in documentation but missing from the repository.
7. Inspect the actual frontend and backend source independently.
8. Verify important repository claims from the handoff against source.
9. Inspect:
   - frontend entry points and routing
   - authentication provider and route guards
   - API client and retry behavior
   - current Match Scouting and Pit Scouting pages
   - current scouting API calls
   - local persistence
   - Express app and route mounting
   - modern and legacy authentication routes
   - CSRF and session middleware
   - Firebase Admin initialization
   - Firestore access patterns
   - deployment configuration
   - tests and package scripts
10. Report missing files, stale paths, contradictions, unverified claims, duplicate documents, and documentation drift.
11. Record the current commit SHA and the document versions used for the analysis.
12. Prepare a documentation move map showing each current path and proposed destination.
13. After completing the inventory, use the approved documentation-organization rules in Section 2.

The handoff is an onboarding guide, not a substitute for repository inspection.

---

## 4. Source-of-truth hierarchy

When sources conflict, use this order:

1. Confirmed current repository behavior
2. Approved Architecture Decision Records
3. Approved product-analysis and architecture documents
4. Approved v0 design specifications
5. Legacy screenshots and legacy requirements

Do not silently resolve conflicts. Document each conflict, explain its impact, and identify the owner or evidence needed to resolve it.

Repository behavior describes what exists. It does not automatically define the desired v2 architecture.

---

## 5. Product context

Sim-City Scouting is used by FRC Team 3464 to collect robot performance and capability data during competitions.

Primary users include:

- Match scouts
- Pit scouts
- Scouting leads
- Strategists and drive-team members
- Team administrators

The existing application is being replaced because it is primarily a collection of static forms rather than a competition operating system. Confirmed or suspected weaknesses include:

- manual event, match, team, alliance, and station entry
- zero-valued defaults that blur unanswered and actual zero
- Yes/No defaults that turn untouched fields into observations
- weak validation
- nested Match Scouting tabs and excessive scrolling
- no assignment model
- no time-aware live-match workflow
- record-key collisions
- no idempotent submission contract
- LocalStorage-based recovery without a real outbox
- no explicit offline lifecycle
- limited responsive behavior
- incomplete Pit Scouting structure
- a legacy SHA-256 credential path that must not survive in v2

This project is a **greenfield product rewrite with a controlled transition** from the legacy application.

Legacy screens, fields, routes, payloads, components, and Firestore shapes are an **implementation inventory**. They are not the target UX or target data model.

---

## 6. Approved product direction

The target product contains four role-oriented workspaces:

1. **Scout workspace**
   - assignment-driven Match Scouting
   - team/event-based Pit Scouting
   - offline capture, review, queueing, and synchronization

2. **Strategy workspace**
   - team profiles
   - match history
   - cross-scout consensus
   - comparison
   - pick-list and match-planning support

3. **Event Management workspace**
   - event provisioning
   - schedules and event packages
   - scout roster and assignments
   - coverage monitoring
   - reassignment and data-quality operations

4. **Administration workspace**
   - users and permissions
   - season-package governance
   - exports, retention, and audit
   - system configuration

The first implementation priority is the **Scout workspace**.

The scouting workflow should be assignment-driven. Event, match, team, alliance, driver station, and scout context should normally come from downloaded event data and scouting assignments. Manual entry is an emergency fallback only.

Match Scouting should capture **timestamped, robot-attributable observations**. Final totals and summaries should be derived from observations rather than being the only source of truth.

The app should capture information that official match results do not provide, including robot-specific behavior, timing, location, reliability, defense, strategic choices, and scouting confidence.

---

## 7. Locked technical stack

Preserve:

- React
- TypeScript
- Vite
- Tailwind CSS v4 using CSS-first configuration
- React Router
- Node.js and Express
- Firestore accessed through the Node backend only
- Firebase Authentication
- HttpOnly Firebase session cookies
- Existing signed double-submit CSRF protection
- Existing session-restoration and in-place reauthentication approach
- IndexedDB for offline application data
- An IndexedDB outbox for synchronization
- A service worker for PWA shell and static-asset caching
- Vitest and Testing Library for frontend tests
- Existing Node test conventions for backend tests
- Existing Vercel deployment unless analysis proves it is unsuitable

Do not introduce:

- Next.js
- React Server Components
- Supabase
- direct browser-to-Firestore access
- Firebase service credentials in the browser
- `debug` as an authorization mechanism
- a second frontend framework
- a new authentication architecture without a documented reason
- production implementation during this phase

---

## 8. Approved product and architecture principles

Preserve these decisions unless repository evidence exposes a critical contradiction:

- New scouting writes use v2 contracts only.
- Do not preserve invalid legacy write shapes merely for compatibility.
- Reuse the modern Firebase session-cookie and CSRF infrastructure where safe.
- Server identity, timestamps, authorization, canonical keys, and validation are authoritative.
- Unanswered values must not default to `false`, `0`, or a concrete negative answer.
- Match context is derived from schedules and assignments where possible.
- Manual match context is a clearly identified fallback.
- Device synchronization state belongs in IndexedDB, not in the canonical server record.
- Match observations are append-oriented and auditable.
- Corrections supersede or void prior observations rather than silently mutating history.
- Field zones are the default live spatial input.
- Detailed normalized coordinates are optional.
- Capture methods are configured per season and game element.
- Exact counting versus batch/volley, made/missed, cycle, range, or rate capture remains an empirical product decision.
- Pit Scouting is team-and-event based and does not conceptually require a match number.
- Multiple scouts may observe the same robot without overwriting each other.
- Consensus is derived from separate scout records.
- v0 owns visual design exploration and repository-aware design prototypes.
- Codex owns architecture validation and production implementation.
- Generated v0 code is not automatically production-ready and must be reviewed before integration.

---

## 9. Phase 1.6 objective

Resolve the architecture questions that must be stable before v0 creates final design directions or Codex writes production features.

This phase is analysis and documentation only.

Create Architecture Decision Records and detailed contracts for the following areas.

---

## 10. Architecture decisions to resolve

### 9.1 Migration, cutover, and rollback

Decide:

- Which legacy routes are removed.
- Which legacy authentication paths are removed.
- Whether historical Firestore data remains readable.
- Whether historical records are ignored, exported, archived, transformed, or exposed through a read-only adapter.
- Whether v2 and legacy run in parallel temporarily.
- Whether a shadow-write or dual-write period is justified.
- How production cutover occurs.
- How rollback occurs without corrupting v2 or legacy data.
- What happens to existing local browser data.
- Whether old records can participate in v2 analytics, and only when mappings are trustworthy.
- What data-retention or export process is required before removal.

Do not create backward-compatible v2 writes unless a documented product requirement justifies them.

Clearly distinguish:

- clean-break v2 writes
- controlled legacy-data transition
- authentication reuse
- legacy route removal

### 9.2 Canonical identity model

Separate and define:

- season key
- event key
- match key
- competition level
- set number
- match number
- replay number
- team number
- driver station
- assignment ID
- canonical Match Scouting record key
- local capture-session ID
- observation ID
- idempotency key
- payload hash
- record revision
- Pit Scouting record key
- photo ID
- consensus key

The server must derive or verify all authoritative identities.

Define handling for:

- qualification matches
- playoff matches
- finals
- practice matches
- replays
- rematches
- schedule corrections
- scout reassignment
- multiple scouts observing the same robot
- the same scout reopening or correcting a record

Do not conflate:

- logical record identity
- local session identity
- request idempotency
- record revision

### 9.3 Assignment model

Define:

- event scout roster
- scout availability
- match assignments
- Pit Scouting assignments
- super-scout or specialist assignments
- assignment ownership
- assignment claiming
- assignment acceptance
- in-progress state
- completion
- missed assignments
- reassignment
- assignment cancellation
- assignment versioning
- conflict handling when assignments change offline
- coverage-gap reporting
- duplicate-coverage strategy
- offline assignment download
- assignment API endpoints
- permissions for assignment management
- audit history

The design must support assignment-driven scouting without preventing a clearly marked manual emergency fallback.

### 9.4 Event package model

Do not assume one unbounded Firestore document.

Define:

- event metadata
- teams
- matches
- alliances
- stations
- schedule
- rankings
- official results
- assignments
- scout roster
- manual overrides
- source precedence between FIRST, TBA, and manual inputs
- source provenance per field
- refresh behavior
- replay handling
- schedule corrections
- package version
- content hash or ETag
- incremental refresh
- offline download
- stale-data indicators
- package expiration
- event switching
- package removal and storage cleanup

Recommend:

- Firestore documents and subcollections
- server-side import/synchronization flow
- client API contracts
- offline package format
- validation and caching rules

### 9.5 Season package contract

Define a versioned, controlled season configuration.

It must support:

- season metadata
- match phases and durations
- phase transitions
- observation definitions
- allowed UI component types
- capture methods
- action payload schemas
- field zones
- field assets
- alliance orientation and mirroring
- optional normalized coordinates
- validation rules
- cross-field validation
- derived metrics
- summary calculations
- post-match questions
- Pit Scouting questions
- rating anchors
- issue types
- feature flags
- analytics mappings
- package publication lifecycle
- draft/published/retired states
- schema version
- content version
- content hash
- client compatibility range
- server validation against the exact version used by the client

Do not create an unrestricted generic JSON form renderer.

Define a controlled component registry, such as:

- action button
- counter
- segmented selection
- tri/quad-state selection
- state machine
- field-zone action
- coordinate action
- rating with behavioral anchors
- text note
- measurement
- structured checklist
- photo input

The season package should configure supported components, not inject arbitrary code or markup.

### 9.6 Match timing

Define:

- who starts the local match clock
- timer source
- pre-match countdown
- phase progression
- phase definitions
- manual phase correction
- pauses
- delayed starts
- late timer start
- replay behavior
- clock drift
- restoration after refresh or app restart
- multiple devices using independent timers
- timeline audit fields
- timer corrections
- relationship to official scheduled and actual match times
- what is derived versus directly observed

Do not assume the official schedule time is the live match clock.

### 9.7 Observation and correction model

Define:

- append-only or append-oriented observations
- observation ordering
- client and server timestamps
- elapsed match time
- phase
- subsection, when applicable
- action type
- payload
- field zone
- optional coordinates
- source
- confidence
- correction
- superseding
- voiding
- one-tap undo
- redo, if supported
- post-submission correction
- record revision
- summary recomputation
- maximum observation count
- payload size limits
- validation of season-configured values
- protection against rapid accidental duplicate taps
- preservation of legitimately rapid repeated actions

Avoid forcing scouts to enter confidence after every routine action unless method-validation evidence supports it. Prefer session-level confidence, automatic uncertainty for obstructed observations, and optional post-match adjustment where appropriate.

### 9.8 Submission, idempotency, and atomicity

Define:

- client validation
- server validation
- validation order
- authentication enforcement
- CSRF enforcement
- role enforcement
- canonical key derivation
- idempotency-key generation
- idempotency lifetime
- payload hashing
- duplicate submission behavior
- conflict behavior
- atomic record and observation writes
- Firestore transaction or batch strategy
- summary derivation
- revision increments
- partial-failure behavior
- retry behavior
- authentication-expiration retry
- response contracts
- typed error contracts
- consensus recomputation triggers
- transaction and batch limits
- payload and request-size limits

The client must never report successful synchronization until the server confirms acceptance.

### 9.9 IndexedDB, outbox, and synchronization

Separate canonical server data from device-local state.

Define IndexedDB stores for:

- drafts
- capture sessions
- observations
- outbox entries
- synchronization attempts
- season packages
- event packages
- assignments
- cached team data
- Pit Scouting records
- photos/blobs
- quarantined/corrupt records
- local preferences
- app metadata and schema migrations

Define:

- draft schema
- outbox schema
- sync lifecycle
- retry policy
- exponential backoff
- foreground retry
- optional background sync
- authentication-expired handling
- reauthentication and automatic retry
- validation rejection
- conflict handling
- duplicate handling
- corrupt-entry quarantine
- storage quota handling
- photo-storage limits
- reconciliation with server state
- local data cleanup
- IndexedDB schema migrations
- service-worker responsibilities
- application-update behavior
- what remains usable with zero connectivity

The service worker should cache the application shell and static assets. It must not become the sole owner of business-data synchronization.

### 9.10 Pit Scouting model

Define:

- canonical team/event identity
- multiple contributors
- draft ownership
- revision and merge rules
- claimed capabilities
- verified capabilities
- claim provenance
- team identity
- robot identity
- dimensions and units
- weight
- drivetrain
- motors/modules
- mechanisms
- intake
- scoring capabilities
- autonomous capabilities
- endgame capabilities
- programming language and controls
- sensors and vision
- reliability
- repairability
- driver experience
- free-form notes
- seasonal questions
- photos
- primary photo
- offline image compression
- upload strategy
- photo storage location
- signed-upload or backend-upload approach
- image metadata
- retention
- deletion
- audit history
- offline conflict handling

Verify the current Pit Scouting UI and submission code, including the existing Match Number field. Determine whether it is submitted, ignored, queried, or effectively dead data.

### 9.11 Roles and permissions

Define the minimum role or permission model for:

- Scout
- Pit scout, if distinct
- Scouting lead
- Strategist
- Drive-team viewer, if distinct
- Administrator

Identify:

- backend enforcement points
- session/custom-claim changes
- role source of truth
- permission mapping
- Firestore access boundaries
- who can read personal records
- who can read other scouts' records
- who can read consensus and analytics
- who can manage assignments
- who can import or refresh event packages
- who can publish season packages
- who can resolve conflicts
- who can edit or void submitted records
- who can manage users and roles
- who can view exports and audits

Do not reuse `debug` for authorization.

Prefer capabilities/permissions over scattering hardcoded role-name checks through the application.

### 9.12 Consensus and data quality

Define:

- when consensus is useful
- which metrics may be reconciled
- which observations must remain scout-specific
- agreement measures
- range overlap
- categorical agreement
- confidence weighting
- outlier handling
- minimum scout count
- recalculation triggers
- storage versus read-time computation
- auditability
- strategy-facing data-quality indicators
- missing-data indicators
- contradictory-record handling

Do not silently merge or overwrite separate scout records.

### 9.13 Deployment and operational constraints

Review the current Vercel deployment and determine:

- whether the proposed API fits Vercel Function limits
- function duration constraints
- cold-start implications
- Firestore transaction and batch limitations
- request and response size
- image-upload implications
- whether images should bypass the main API payload
- service-worker deployment and cache invalidation
- same-origin cookie assumptions
- local-development behavior
- CORS behavior
- required environment variables
- secret management
- logging
- observability
- audit logging
- error categorization
- data backup/export
- disaster recovery
- test environments
- production migration safety
- CI and branch-protection recommendations

Do not modify deployment during this phase.

### 9.14 Performance, accessibility, and browser support constraints

Define architecture-level requirements for:

- lower-powered school devices
- constrained competition Wi-Fi
- offline startup
- rapid tap acknowledgement
- background persistence without blocking input
- photo compression
- lazy loading
- bundle splitting
- browser support
- installable PWA behavior
- safe-area handling
- keyboard support
- screen-reader support
- reduced motion
- 200% zoom/reflow
- minimum touch targets
- offline error and status announcements

Architecture decisions should not force an inaccessible or slow UI.

### 9.15 Method-validation dependencies

Review the method-validation plan and identify decisions that cannot be finalized from repository analysis alone, including:

- exact counting versus volley/batch
- made/missed capture
- cycle event capture
- rate-interval capture
- quantity ranges
- field zones versus coordinates
- timer-driven flow versus manual navigation
- rating anchors
- phone versus tablet workflows
- dedicated versus roaming scouts
- confidence capture

For each, define:

- hypothesis
- test method
- measurable success criteria
- architecture choices that must remain flexible until testing is complete
- decisions that v0 must not visually lock prematurely

---

## 11. Required deliverables

Create or update:

### Documentation indexes

1. `docs/README.md`
2. `docs/sim-city-scouting-v2/README.md`

### Product documentation

3. `docs/sim-city-scouting-v2/product/requirements/sim-city-scouting-pwa-requirements.md`
4. `docs/sim-city-scouting-v2/product/requirements/match-scouting-v2-requirements.md`
5. `docs/sim-city-scouting-v2/product/analysis/phase-1-product-analysis.md`
6. `docs/sim-city-scouting-v2/product/analysis/phase-1-5-product-analysis.md`

Move existing approved content into these locations rather than rewriting it unnecessarily.

### Architecture documentation

7. `docs/sim-city-scouting-v2/architecture/codex-project-handoff.md`
8. `docs/sim-city-scouting-v2/architecture/phase-1-scouting-redesign-spec.md`
9. `docs/sim-city-scouting-v2/architecture/phase-1-6-architecture-decisions.md`
10. `docs/sim-city-scouting-v2/architecture/adrs/`
11. `docs/sim-city-scouting-v2/architecture/contracts/scouting-v2-data-model-api.md`
12. `docs/sim-city-scouting-v2/architecture/contracts/season-package.md`
13. `docs/sim-city-scouting-v2/architecture/contracts/assignment-model.md`
14. `docs/sim-city-scouting-v2/architecture/contracts/event-package.md`
15. `docs/sim-city-scouting-v2/architecture/contracts/pit-scouting.md`
16. `docs/sim-city-scouting-v2/architecture/contracts/offline-sync.md`
17. `docs/sim-city-scouting-v2/architecture/contracts/roles-permissions.md`

### Validation, design, and delivery documentation

18. `docs/sim-city-scouting-v2/validation/phase-2-method-validation-plan.md`
19. `docs/sim-city-scouting-v2/design/v0-design-constraints.md`
20. `docs/sim-city-scouting-v2/delivery/migration-cutover-plan.md`
21. `docs/sim-city-scouting-v2/delivery/implementation-slices.md`
22. `docs/sim-city-scouting-v2/delivery/unresolved-product-questions.md`

### Prompt archive

Move the current project prompts to:

23. `docs/sim-city-scouting-v2/prompts/frc-scouting-ui-ux-redesign-prompt.md`
24. `docs/sim-city-scouting-v2/prompts/phase-1-5-expand-product-analysis.md`
25. `docs/sim-city-scouting-v2/prompts/v0-to-codex-handoff-prompt.md`
26. `docs/sim-city-scouting-v2/prompts/codex-phase-1-6-master-prompt.md`

### Legacy and platform documentation

Move the original legacy implementation requirements to:

27. `docs/legacy/requirements/match-scouting-page.md`

Move cross-project technical documents to:

28. `docs/platform/proposals/firebase-session-authentication.md`
29. `docs/platform/technical-debt/frontend-lint-baseline.md`
30. `docs/platform/deployment/deployment-setup.md`

Do not change a document's meaning simply to fit the new directory. Rename `match-scouting-page-enhanced.md` to `match-scouting-v2-requirements.md` only after confirming that it represents the target v2 requirements rather than the legacy implementation.

Create one ADR per major decision or tightly related decision group. Use stable filenames such as:

```text
docs/sim-city-scouting-v2/architecture/adrs/
├── 0001-v2-migration-and-cutover.md
├── 0002-record-identity-and-idempotency.md
├── 0003-assignment-model.md
├── 0004-event-package-storage-and-api.md
├── 0005-season-package-contract.md
├── 0006-match-timing-and-observations.md
├── 0007-submission-atomicity-and-revisions.md
├── 0008-indexeddb-outbox-and-sync.md
├── 0009-pit-scouting-and-photo-storage.md
├── 0010-roles-and-permissions.md
├── 0011-consensus-and-data-quality.md
└── 0012-deployment-and-operational-model.md
```

Adjust grouping only when a different split is better justified.

For every major decision, document:

- Status
- Context
- Decision
- Alternatives considered
- Rationale
- Consequences
- Security implications
- Offline implications
- Migration implications
- Performance implications
- Accessibility implications
- Deferred work
- Validation still required
- Conditions that would cause the decision to be revisited

All proposed API contracts must include representative request, response, validation-error, authentication-error, conflict, and retry examples.

All proposed schemas must identify:

- authoritative fields
- client-authored fields
- derived fields
- local-only fields
- server-only fields
- indexes or query patterns
- versioning
- retention
- maximum expected size

---

## 12. Implementation-slice plan requirements

Do not implement the slices yet. Define a dependency-aware plan.

At minimum, include:

### Slice 0 — Architecture and test foundations

- ADR approval
- package contracts
- test strategy
- feature flags
- local development setup
- observability baseline

### Slice 1 — PWA shell and reusable authentication

- preserve modern auth/session/CSRF
- PWA manifest and shell
- service-worker asset caching
- role-aware application shell
- session-expiration behavior
- no Match Scouting implementation yet

### Slice 2 — Season and event packages

- backend imports
- Firestore storage
- API contracts
- client caching
- offline availability
- freshness and update states

### Slice 3 — Scout roster and assignments

- assignment model
- lead management
- scout assignment list
- offline assignment cache
- coverage tracking

### Slice 4 — Match capture vertical slice

- open assignment
- confirm context
- start capture
- record observations
- undo/correction
- post-match review
- IndexedDB draft
- outbox queue
- idempotent Node submission
- server validation
- server confirmation
- offline retry

### Slice 5 — Pit Scouting

- team/event profile
- structured capabilities
- offline photos
- photo upload
- claims versus verified observations

### Slice 6 — Event-management data quality

- coverage gaps
- missed assignments
- conflicts
- rejected submissions
- unsynced-device visibility
- correction workflows

### Slice 7 — Strategy and consensus

- team profiles
- consensus
- data confidence
- comparison
- match planning

### Slice 8 — Administration and season governance

- roles
- permissions
- season publication
- audit
- retention and export

For each slice, include:

- prerequisites
- frontend work
- backend work
- data-model work
- tests
- security review
- offline acceptance criteria
- performance acceptance criteria
- accessibility acceptance criteria
- rollout and rollback
- explicit out-of-scope items

---

## 13. Required first-pass report before writing documents

Before creating the final ADRs and contracts, provide an interim report containing:

1. Current branch and commit
2. Verification that the branch contains `feat/firebase-session-auth`
3. Documents discovered and read
4. Repository areas inspected
5. Confirmed handoff claims
6. Incorrect or stale handoff claims
7. Missing documents
8. Architecture contradictions
9. Decisions that require product-owner input
10. Decisions that require empirical scouting-method validation
11. Proposed ADR list
12. Proposed deliverable files
13. Documentation move/rename map
14. Broken or stale links that must be corrected
15. Duplicate or superseded documents and the proposed canonical source

Wait for product-owner approval if a contradiction would materially change the approved stack, authentication reuse, data ownership boundary, or greenfield direction.

For ordinary lower-level architecture tradeoffs, proceed with a documented recommendation and mark it for review rather than blocking indefinitely.

---

## 14. Final response format

At the end of the task, provide:

1. Repository and branch verified
2. Base-branch/ancestry verification
3. Documents read
4. Source files inspected
5. Confirmed contradictions
6. ADRs created
7. Major architecture decisions
8. Decisions still requiring product-owner input
9. Decisions deferred to method validation
10. Recommended implementation order
11. Risks that could invalidate the v0 design
12. Security risks
13. Offline/reliability risks
14. Migration and rollback risks
15. Files created or changed
16. Documentation files moved or renamed
17. Links and references updated
18. Tests or commands run
19. Confirmation that no production code, dependencies, deployment, or Firestore data were changed

---

## 15. Hard constraints for this task

Do not:

- modify production React code
- modify production backend code
- update dependencies
- modify lockfiles
- alter Firestore data
- create or modify deployment configuration
- expose or print secrets
- create direct browser-to-Firestore access
- replace the existing modern auth flow
- use `debug` as authorization
- create Next.js or React Server Components
- begin visual Phase 2 implementation
- merge or rebase branches
- switch away from `architecture/sim-city-scouting-v2`
- write backward-compatible v2 payload adapters without an approved requirement
- claim that a proposal is already implemented
- delete documentation without preserving still-relevant content or clearly documenting why removal is safe

You may:

- inspect code
- run existing non-destructive tests and linters
- create, move, rename, or update documentation under `docs/` using the rules in Section 2
- create ADRs
- create diagrams in Markdown or Mermaid
- create clearly isolated throwaway analysis notes
- identify a small spike that would be useful later, but do not implement or merge it as product code during this task

Finish Phase 1.6 with documentation and decisions only.
