# Sim-City Scouting v2 — Codex Authentication and Authorization Architecture Review

You are working in the repository:

`FRC-Team-3464/sim-scouting`

The required working branch is:

`architecture/sim-city-scouting-v2`

This branch was created from:

`feat/firebase-session-auth`

The `feat/firebase-session-auth` branch contains the modern authentication,
Firebase session-cookie, CSRF, reauthentication, route-protection, API-client,
and related test refactoring intended to be reused as the starting security
foundation for Sim-City Scouting v2.

The existing authentication implementation is **not frozen**. Reuse means
preserve and extend the parts that remain appropriate, while allowing justified
changes needed for v2 authorization, shared-device behavior, offline scouting,
role changes, auditability, and operational requirements.

This task is an **analysis-and-documentation closure checkpoint**. Do not
implement production code.

---

## 1. Verify the repository and branch

Before doing anything else:

1. Run `git status --short --branch`.
2. Run `git branch --show-current`.
3. Run `git rev-parse HEAD`.
4. Run `git log --oneline --decorate -10`.
5. Verify that the current branch is:
   `architecture/sim-city-scouting-v2`
6. Verify that it contains the work from:
   `feat/firebase-session-auth`
7. Stop and report the problem if either condition is not true.

Do not:

- switch branches
- merge `main`
- rebase
- modify `feat/firebase-session-auth`
- force-push
- alter Firestore data
- modify deployment configuration
- update dependencies or lockfiles
- modify production frontend or backend code during this task

---

## 2. Canonical documentation

The approved documentation structure is:

```text
docs/sim-city-scouting-v2/
├── product/
│   └── product-requirements.md
├── architecture/
│   ├── architecture-overview.md
│   ├── adrs/
│   └── contracts/
├── validation/
│   └── scouting-method-validation.md
├── design/
│   └── v0-design-constraints.md
├── delivery/
│   └── delivery-plan.md
└── archive/
```

Read the canonical documents in this order:

1. `docs/sim-city-scouting-v2/product/product-requirements.md`
2. `docs/sim-city-scouting-v2/architecture/architecture-overview.md`
3. Every ADR under:
   `docs/sim-city-scouting-v2/architecture/adrs/`
4. Every contract under:
   `docs/sim-city-scouting-v2/architecture/contracts/`
5. `docs/sim-city-scouting-v2/validation/scouting-method-validation.md`
6. `docs/sim-city-scouting-v2/design/v0-design-constraints.md`
7. `docs/sim-city-scouting-v2/delivery/delivery-plan.md`
8. The project documentation index under `docs/`, if present

Treat `docs/sim-city-scouting-v2/archive/` as historical reference only. Do not
restore archived content when it conflicts with canonical documentation.

Do not reorganize the approved documentation structure.

---

## 3. Source-of-truth hierarchy

When sources conflict, use this order:

1. Confirmed current repository behavior
2. Approved ADRs
3. Approved architecture contracts
4. Architecture overview
5. Product requirements
6. Scouting-method validation plan
7. v0 design constraints
8. Delivery plan
9. Historical archive

Repository behavior describes what currently exists. It does not automatically
define the desired v2 architecture.

Report conflicts explicitly. Do not silently choose one source.

---

## 4. Objective

Validate whether the existing authentication implementation can safely support
the v2 requirements and define the required extensions for authorization.

The review must distinguish:

### Authentication

Who is the user, and is the session valid?

### Authorization

What is this authenticated user permitted to do, on which resources, within
which event or organizational scope?

The resulting documentation must provide enough clarity to approve or reject
the authentication and authorization foundation before Slice 0 implementation
begins.

---

## 5. Existing implementation to inspect

Inspect the live repository independently. At minimum, review the current
implementation and tests around:

### Frontend

- `frontend/src/auth/AuthenticationProvider.tsx`
- `frontend/src/auth/ProtectedRoute.tsx`
- `frontend/src/auth/FreshSessionRoute.tsx`
- `frontend/src/auth/ReauthenticationModal.tsx`
- `frontend/src/auth/SessionExpirationWarning.tsx`
- `frontend/src/auth/auth-context.ts`
- `frontend/src/auth/use-authentication.ts`
- `frontend/src/auth/types.ts`
- `frontend/src/api/client.ts`
- authentication page tests
- authentication provider tests
- API-client tests
- any route or session-related tests

### Backend

- `backend/routes/auth.js`
- `backend/middleware/require-authentication.js`
- `backend/middleware/csrf.js`
- `backend/auth/session.js`
- `backend/auth/firebase-auth-rest.js`
- `backend/firebase.js`
- `backend/config.js`
- `backend/app.js`
- `backend/scripts/set-debug-claim.js`
- authentication, session, CSRF, configuration, and middleware tests

### Deployment and configuration

- cookie configuration
- CORS configuration
- session durations
- expiration-warning configuration
- CSRF configuration
- environment templates
- Vercel routing and same-origin assumptions

Search for all uses of:

- `debug`
- custom claims
- session user shape
- `req.user`
- authentication middleware
- CSRF middleware
- route guards
- fresh-session logic
- authorization-like checks
- user role or permission checks
- logout cleanup
- local data ownership

Do not assume the listed paths are complete. Report renamed, missing, or
additional relevant files.

---

## 6. Authentication reuse assessment

Document which existing authentication components should be:

- reused unchanged
- reused with extension
- replaced
- retired
- deferred for later review

Evaluate at least:

### Identity and credential flow

- Firebase Authentication as the identity provider
- server-side email/password to Firebase ID-token exchange
- Firebase session-cookie creation
- whether ID tokens remain hidden from the browser
- account registration
- login
- logout
- disabled users
- revoked sessions
- password reset or account recovery requirements
- email verification requirements, if any
- display-name and user-profile ownership

### Session behavior

- HttpOnly cookie behavior
- `Secure` and `SameSite` settings
- cookie scope and naming
- session fixation prevention
- session duration
- expiration warnings
- idle versus absolute expiration
- session renewal
- reauthentication
- fresh-session requirements
- session restoration after page reload
- session restoration after PWA restart
- behavior during an active match
- behavior while offline
- behavior when connectivity returns
- behavior when a session expires with unsynchronized data
- behavior when an account is disabled while a device is offline

### CSRF behavior

- signed double-submit implementation
- session binding
- origin checks
- token refresh and invalidation
- login/register/logout behavior
- mutation coverage
- local-development behavior
- same-origin production assumptions
- error handling and retry behavior

### Shared-device behavior

- multiple scouts using one tablet
- explicit shared-device mode, if needed
- user switching
- logout
- reauthentication
- local draft ownership
- unsynchronized record ownership
- synchronized record retention
- event-package and season-package retention
- cached capability retention
- privacy warnings
- abandoned-session recovery
- lost or borrowed devices

### Sensitive actions

Determine whether sensitive operations require recent authentication, including:

- role or capability changes
- user administration
- season-package publishing
- event-package overrides
- record correction or voiding
- exports
- audit access
- destructive local-data cleanup

Do not assume the current `FreshSessionRoute` behavior is automatically correct
for Match Scouting or Pit Scouting. Evaluate whether requiring session freshness
before or during live scouting could cause data loss or interruption.

---

## 7. Authorization architecture

Design a default-deny authorization model.

Prefer capabilities or permissions over scattered role-name checks.

Evaluate and define a capability vocabulary. At minimum, consider:

```text
scouting.match.capture
scouting.match.capture-manual
scouting.pit.capture
scouting.records.read-own
scouting.records.read-event
scouting.records.read-all
scouting.records.correct-own
scouting.records.correct-all
scouting.records.void
assignments.read-own
assignments.read-event
assignments.manage
packages.event.read
packages.event.refresh
packages.event.override
packages.season.read
packages.season.manage-draft
packages.season.publish
analytics.read
exports.create
users.read
users.manage
roles.manage
audit.read
```

Do not assume these names are final. Normalize them and recommend a concise,
consistent naming convention.

Define whether roles are predefined capability bundles, such as:

- Scout
- Scouting Lead
- Strategist
- Administrator

Determine whether additional roles are justified, such as:

- Pit Scout
- Drive Team Viewer
- Event Manager
- Read-only Analyst

Avoid adding roles when capabilities and scopes are sufficient.

---

## 8. Authorization scope model

Define authorization scopes, including:

- global
- season
- event
- team
- assignment
- own record
- event records
- all records

For each capability, determine whether it is:

- global
- event-scoped
- resource-scoped
- ownership-scoped
- assignment-scoped

Examples to resolve:

- A scout may capture only assigned robots for the current event.
- A scouting lead may manage assignments only for events they control.
- A strategist may read finalized event records but not manage users.
- An administrator may publish season packages.
- Manual emergency capture may require a stronger capability or lead approval.
- Record correction may differ for a scout’s own record versus another scout’s
  record.

Document how scope is represented and enforced.

---

## 9. Permission source of truth

Evaluate and recommend one of:

- Firebase custom claims
- Firestore authorization profiles
- hybrid custom claims plus Firestore
- another repository-compatible model

Consider:

- claim size
- update frequency
- propagation delay
- revocation
- active-session refresh
- offline use
- backend lookup cost
- event-scoped permissions
- auditability
- operational complexity
- caching
- stale authorization state

Do not put large or highly dynamic event-level permission sets in custom claims
without explicit justification.

Define:

- canonical source of roles
- canonical source of capabilities
- canonical source of event scopes
- authorization version
- cache duration
- refresh rules
- invalidation rules
- behavior when authorization data cannot be loaded
- default-deny behavior

---

## 10. Session contract

Define the versioned public session contract returned to the frontend.

At minimum, evaluate fields such as:

```json
{
  "user": {
    "uid": "firebase-uid",
    "displayName": "Scout Name"
  },
  "roles": ["scout"],
  "capabilities": [
    "scouting.match.capture",
    "scouting.pit.capture",
    "scouting.records.read-own"
  ],
  "authorizationVersion": 1,
  "sessionExpiresAt": "ISO-8601 timestamp",
  "sessionExpirationWarningAt": "ISO-8601 timestamp"
}
```

Do not accept this example without analysis.

Decide:

- which fields are exposed
- which are server authoritative
- whether roles and capabilities are both returned
- whether scoped grants are returned
- whether event permissions are embedded or fetched separately
- schema versioning
- compatibility behavior
- cache policy
- refresh behavior
- revocation behavior
- role-change propagation
- privacy implications
- maximum expected payload size

The browser may use session capabilities for UX and navigation, but the server
must independently enforce every protected operation.

---

## 11. Backend enforcement model

Define reusable backend authorization middleware or policy evaluation.

For every v2 endpoint, document:

- authentication required
- CSRF required
- capability required
- scope required
- ownership check
- assignment check
- resource-state check
- recent-authentication requirement
- audit requirement

Create or update an endpoint authorization matrix.

At minimum, cover planned endpoint groups for:

- session and identity
- season packages
- event packages
- assignments
- Match Scouting records
- observations and corrections
- Pit Scouting
- consensus and analytics
- exports
- user and role management
- audits

Example format:

| Endpoint or operation | Authentication | CSRF | Capability | Scope | Ownership/assignment | Recent authentication | Audit |
|---|---|---|---|---|---|---|---|

The server must not trust:

- client-provided UID
- client-provided role
- client-provided capability
- client-provided assignment ownership
- hidden frontend controls
- route guards
- the `debug` claim

`debug` remains a feature flag only and must never grant access.

---

## 12. Offline authorization

Define the difference between:

1. permission to capture locally
2. permission to queue data locally
3. permission to submit to the server
4. server acceptance at synchronization time

Resolve these cases:

- A scout downloads assignments and later loses the Scout role.
- An account is disabled while the device is offline.
- A role is changed while an old session remains active.
- A user signs out with unsynchronized records.
- A second user signs into the same shared tablet.
- An assignment is reassigned while the original scout is offline.
- A scout begins an outdated assignment.
- A submission was valid when captured but authorization changed before upload.
- Cached capabilities are stale.
- The device cannot refresh its session or authorization profile.
- A server rejects upload because of authorization rather than validation.
- An administrator restores a user’s access later.

Define:

- whether local capture may continue
- whether queued data remains readable
- who owns queued data
- whether another user may upload it
- quarantine behavior
- retry behavior
- escalation to a scouting lead
- preservation of valuable observations
- privacy protections
- audit fields
- user-facing status distinctions

Do not delete unsynchronized scouting data merely because authorization changed.
Define a safe, auditable recovery path.

---

## 13. Assignment authorization

The authorization model must work with assignment-driven scouting.

Define:

- who creates assignments
- who edits assignments
- who may claim an assignment
- who may accept or release an assignment
- who may reassign during an event
- whether a lead may intentionally create duplicate coverage
- whether assignment possession is sufficient to submit
- what happens after reassignment
- manual emergency-capture authorization
- submission from a previously assigned scout
- stale assignment versions
- offline assignment conflict behavior

Assignment authorization must not depend only on frontend state.

---

## 14. Shared-device retention and privacy

Define a shared-device security and retention contract covering:

- local user identity
- local account switch
- logout
- local draft ownership
- outbox ownership
- encrypted storage, if justified
- whether synced data remains on device
- whether unsynced data remains after logout
- when cleanup occurs
- who may trigger cleanup
- protection against accidental deletion
- session remnants
- cached capability cleanup
- cached event and season packages
- privacy warnings
- auditability
- lost-device response

Avoid collecting unnecessary hardware identifiers.

If a device identifier is used, define:

- purpose
- scope
- persistence
- whether it is local-only or server-known
- reset behavior
- privacy implications

---

## 15. Audit requirements

Define audit events for:

- login
- logout
- failed login
- session revocation
- account disablement
- role changes
- capability changes
- scope changes
- sensitive reauthentication
- assignment changes
- manual emergency capture
- record correction
- record voiding
- season publication
- event-package override
- exports
- administrative data cleanup

For each, decide:

- actor
- target
- event
- timestamp
- request or correlation ID
- old value/new value, when appropriate
- reason
- retention
- who may view it
- sensitive-data redaction

Do not log credentials, raw tokens, cookies, CSRF secrets, service-account
material, or unnecessary personal data.

---

## 16. Threat and failure review

Document relevant threats and failure modes, including:

- stolen or shared sessions
- session fixation
- CSRF bypass
- confused-deputy authorization
- privilege escalation
- stale custom claims
- stale Firestore role data
- authorization-cache failure
- frontend-only protection
- direct API access
- replayed mutations
- unauthorized assignment submission
- UID spoofing
- event-scope bypass
- ownership bypass
- offline data exposure
- shared-tablet user leakage
- local-data deletion
- disabled-user offline capture
- race conditions during role changes
- partial authorization outages

For each material risk, identify:

- existing mitigation
- required mitigation
- residual risk
- test requirement
- operational response

This is not a full formal penetration test, but it must be sufficient to support
architecture approval.

---

## 17. Testing strategy

Define the test foundation required for implementation.

At minimum, include:

### Authentication tests

- valid login
- invalid login
- disabled user
- revoked session
- expired session
- warning timing
- reauthentication success
- reauthentication failure
- CSRF token binding
- missing CSRF
- wrong origin
- logout
- startup restoration
- session refresh
- cookie configuration

### Authorization tests

- unauthenticated request
- authenticated but unauthorized request
- authorized global request
- authorized event-scoped request
- wrong-event request
- ownership success and failure
- assignment success and failure
- manual emergency-capture permission
- role change
- capability removal
- stale authorization version
- default deny
- `debug` does not grant authorization

### Offline/shared-device tests

- session expires while offline
- role revoked while offline
- unsynced data survives safe logout handling
- second user cannot access first user’s protected local data
- reassigned assignment upload
- authorization-rejected outbox item
- later access restoration
- local cleanup safeguards

### Contract tests

- session contract
- authorization error format
- capability naming
- scope evaluation
- endpoint enforcement matrix
- audit events
- authorization-version mismatch

Recommend where unit, integration, API, browser, emulator, and end-to-end tests
are appropriate.

---

## 18. Canonical documentation deliverables

Update existing canonical documents rather than creating duplicates.

At minimum, update:

- `docs/sim-city-scouting-v2/architecture/architecture-overview.md`
- `docs/sim-city-scouting-v2/delivery/delivery-plan.md`

Update these only when impacted:

- `docs/sim-city-scouting-v2/product/product-requirements.md`
- `docs/sim-city-scouting-v2/design/v0-design-constraints.md`
- existing authorization, security, identity, shared-device, or offline contracts
- existing relevant ADRs

### Create or amend ADRs

Use the next available ADR numbers. Do not renumber approved ADRs.

Create or amend ADRs covering:

1. Authentication reuse and required extensions
2. Authorization capability and scope model
3. Permission source of truth and propagation
4. Shared-device session, ownership, and retention behavior

Combine closely related topics when that produces a clearer decision record.
Do not duplicate an existing ADR.

### Create or amend contracts

Create or amend:

- `docs/sim-city-scouting-v2/architecture/contracts/identity-session-contract.md`
- `docs/sim-city-scouting-v2/architecture/contracts/authorization-contract.md`

The contracts must include:

- versioning
- authoritative fields
- client-visible fields
- server-only fields
- error contracts
- endpoint enforcement expectations
- offline behavior
- shared-device behavior
- audit expectations
- testable acceptance criteria

If existing canonical contracts already cover these topics, update them instead
of creating parallel files.

---

## 19. Product-owner decision register

Prepare a focused decision register with:

- Decision ID
- Topic
- Existing ADR or contract
- Codex recommendation
- Alternatives
- Security impact
- Offline impact
- UX impact
- Delivery slices affected
- Product-owner decision required
- Current status

Use these statuses:

- Proposed
- Approved
- Approved with amendments
- Deferred
- Rejected

Include at least:

1. Existing auth components approved for reuse
2. Existing auth components requiring extension
3. Session duration and renewal behavior
4. Fresh-session requirements
5. Role definitions
6. Capability vocabulary
7. Scope model
8. Permission source of truth
9. Custom-claim usage
10. Authorization-version propagation
11. Session contract
12. Backend policy-enforcement model
13. Manual emergency-capture permission
14. Assignment authorization
15. Role-change and revocation behavior
16. Offline authorization
17. Shared-device mode
18. Logout and unsynchronized-data handling
19. Sensitive-operation reauthentication
20. Audit requirements
21. Authentication and authorization test gates

Place the register in the most appropriate existing canonical document. Do not
create a parallel project-management system merely for this review.

---

## 20. Slice 0 entry criteria

Define explicit entry criteria for Slice 0.

At minimum, Slice 0 must not begin until the following are approved:

- Authentication reuse and extension ADR
- Authorization ADR
- Capability vocabulary
- Scope model
- Permission source of truth
- Session contract
- Backend enforcement strategy
- Role-change and revocation behavior
- Offline authorization behavior
- Shared-device retention behavior
- Audit requirements
- Authentication and authorization test strategy

Also distinguish:

- decisions required before Slice 0
- decisions required before Slice 1
- decisions that may be deferred until assignment implementation
- decisions that may be deferred until administration implementation

---

## 21. Required first-pass report

Before changing canonical documents, provide a first-pass report containing:

1. Current branch and commit
2. Verification that the branch contains `feat/firebase-session-auth`
3. Canonical documents read
4. Repository files inspected
5. Existing authentication behavior confirmed
6. Existing authorization behavior confirmed
7. Authentication behavior that is unclear or risky
8. Authorization gaps
9. Conflicts between code and canonical documentation
10. Existing ADRs and contracts that should be amended
11. New ADRs or contracts that may be required
12. Product-owner decisions required
13. Proposed canonical files to update
14. Proposed test strategy
15. Preliminary Slice 0 readiness assessment

Wait for product-owner approval before making documentation changes if the
review would materially replace the Firebase session-cookie model, CSRF model,
or Node-only backend boundary.

For normal extensions and clarifications, proceed after presenting the
first-pass report unless explicitly told to stop.

---

## 22. Final response format

At the end of the task, provide:

1. Repository and branch verified
2. Canonical documents reviewed
3. Source files and tests inspected
4. Authentication reuse decisions
5. Authentication extensions required
6. Authorization model
7. Capability and scope summary
8. Permission source-of-truth decision
9. Session-contract changes
10. Offline authorization behavior
11. Shared-device behavior
12. Audit requirements
13. ADRs created or amended
14. Contracts created or amended
15. Remaining product-owner decisions
16. Remaining risks
17. Slice 0 readiness assessment
18. Slice 0 entry criteria
19. Files changed
20. Tests or commands run
21. Confirmation that no production code, dependencies, deployment, or Firestore
    data were changed

---

## 23. Hard constraints

Do not:

- implement production code
- modify frontend or backend production files
- update dependencies or lockfiles
- change deployment configuration
- alter Firestore data
- create direct browser-to-Firestore access
- expose Firebase credentials
- print tokens, cookies, or secrets
- use `debug` as authorization
- rely on frontend route guards as security enforcement
- assume assignment ownership from client input
- delete unsynchronized local data without a documented recovery policy
- reorganize the canonical documentation structure
- restore archive content as canonical
- introduce Pit Scouting photo or Firebase Storage MVP dependencies
- begin Slice 0 implementation

You may:

- inspect code
- run existing non-destructive tests and linters
- update canonical documentation
- create or amend ADRs
- create or amend architecture contracts
- add Markdown or Mermaid diagrams
- propose implementation pseudocode
- define test cases and acceptance criteria

Finish with architecture decisions and documentation only.
