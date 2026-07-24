# Authorization contract

| Metadata | Value |
|---|---|
| Status | Proposed |
| Approval scope | Slices 0–8 |
| Primary implementation slice | Slice 0 policy/test foundation; operational integration in Slice 1; endpoint enforcement in every later slice |
| Decision references | ADR 0010, ADR 0014 |
| Related contracts | [Identity and Session](identity-session-contract.md), [Roles and Permissions](roles-permissions.md), [Assignment Model](assignment-model.md), [Offline Synchronization](offline-sync.md) |

## Purpose and scope

This contract defines the capability vocabulary, typed scopes, source of truth, policy evaluation, propagation, endpoint enforcement, offline authorization recovery, audit events, threat controls, and acceptance tests. Authentication proves identity; this contract decides what that identity may do to a resource.

## Identity and terminology

Capability names use lowercase snake-case segments in `scouting.<resource>.<action>` form. Roles are named bundles for governance and UX, not enforcement inputs. A grant is capability plus scope; a deny overrides every matching allow.

```ts
type AuthorizationScope =
  | { type: "global" }
  | { type: "season"; seasonKey: string }
  | { type: "event"; eventKey: string }
  | { type: "team"; teamNumber: number }
  | { type: "assignment"; assignmentId: string }
  | { type: "own" };

interface CapabilityGrant {
  grantId: string;
  capability: Capability;
  scope: AuthorizationScope;
  effect: "allow" | "deny";
  validFrom: string;
  validUntil?: string;
  reason: string;
  version: number;
}
```

## Data model

```ts
interface AuthorizationProjection {
  schemaVersion: 1;
  uid: string;
  teamNumber: number;
  authorizationVersion: number;
  roles: string[];
  grants: CapabilityGrant[];
  generatedAt: string;
  expiresAt: string;
}

type Capability =
  | "scouting.match.capture"
  | "scouting.match.capture_manual"
  | "scouting.pit.capture"
  | "scouting.records.read_own"
  | "scouting.records.read_event"
  | "scouting.records.read_all"
  | "scouting.records.correct_own"
  | "scouting.records.correct_all"
  | "scouting.records.void"
  | "scouting.assignments.read_own"
  | "scouting.assignments.read_event"
  | "scouting.assignments.claim"
  | "scouting.assignments.manage"
  | "scouting.packages.event.read"
  | "scouting.packages.event.refresh"
  | "scouting.packages.event.override"
  | "scouting.packages.season.read"
  | "scouting.packages.season.manage_draft"
  | "scouting.packages.season.publish"
  | "scouting.analytics.read"
  | "scouting.exports.create"
  | "scouting.users.read"
  | "scouting.users.manage"
  | "scouting.roles.manage"
  | "scouting.audit.read"
  | "scouting.identity.sessions_revoke";
```

The vocabulary is allow-listed and versioned in code and contract tests. New capability names require review; arbitrary strings do not become effective grants.

## Lifecycle and invariants

- Firestore membership/grant records are canonical. Every policy change increments `authorizationVersion` atomically and emits audit.
- Custom claims may cache only a compact authorization-version hint; `debug` grants nothing.
- Grants expire by server time. Missing, inactive, suspended, or revoked membership denies all application capabilities. Membership cannot become active until the backend confirms Firebase `emailVerified`; a client field is never sufficient.
- Deny overrides allow; more specific allow never defeats a matching deny.
- Unlisted endpoint, capability, scope, or resource state denies by default.
- Browser projections control visibility only. Every API independently evaluates policy.
- Authorization outage denies protected server work. It never converts failure into permission.

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Requested resource/action and expected policy version |
| Server-authoritative | Membership state, grants/denies, scope facts, ownership, assignment, effective decision |
| Derived | Role bundle expansion, effective capability set, projection expiry |
| Local-only | Cached projection and authorization-pending/rejected display state |
| Server-internal | Policy cache, evaluator trace, custom-claim hint, sensitive denial detail |

The server derives UID from the verified session; event/season/team/assignment/record scope comes from authoritative resources, not request assertions.

## Validation rules

Validate membership state, vocabulary, scope shape and containment, time bounds, policy version, role-bundle version, resource identity/state, ownership, assignment history, and recent-auth requirement. Reject unbounded grants and malformed deny/allow combinations. A target UID in an administrative request is data, never the actor.

## Storage, indexes, and retention

Recommended logical records are team memberships plus separately bounded grants and immutable policy audit entries. Index UID/state, team/state, authorization version, capability/scope identifiers, validity window, and target. Projection response maximum is 32 KiB; page larger grant sets. Cache TTL is an engineering-measured value, never longer than projection expiry, and sensitive/sync/version-mismatch decisions bypass it. Retention follows the common operational contract.

## Capabilities and security

| Role | Baseline scope and intent |
|---|---|
| Scout | Own assignments and records; capture only assigned work; post-qualification summaries after Lead Scout closure |
| Lead Scout | Event-scoped assignment, evidence, correction, override, analytics, and export operations |
| Strategist | Event-scoped finalized evidence, analytics, and export reads; no record/package mutation |
| Administrator | Global membership, season-package, retention, recovery, audit, export, and read-only record access; no assignment/record mutation by default |

Role bundle expansion is defined normatively in Roles and Permissions. Manual emergency capture requires a Lead Scout-created/approved assignment; Scouts do not self-grant `capture_manual`.

## Policy evaluation

For each endpoint, execute:

1. Verify non-revoked Firebase session.
2. Verify CSRF and exact Origin for mutation.
3. Load current active membership and authorization version.
4. Confirm required capability exists and no matching deny applies.
5. Resolve authoritative scope containment.
6. Resolve ownership and assignment history when required.
7. Validate resource lifecycle and optimistic version.
8. Enforce recent authentication for the named sensitive operation.
9. Execute and emit required audit event; audit failure blocks privileged mutation when specified.

Policy input/output is structured and testable. Public denials disclose an actionable category without protected resource existence or evaluator internals.

## API

| Method | Endpoint | Capability | Scope | Recent authentication | Audit |
|---|---|---|---|:---:|:---:|
| GET | `/api/scouting/v2/authorization` | authenticated | own projection | No | No |
| GET | `/api/scouting/v2/seasons/:seasonKey/active` | `scouting.packages.season.read` | season | No | No |
| POST | `/api/scouting/v2/admin/seasons/:seasonKey/drafts` | `scouting.packages.season.manage_draft` | global/season | Yes | Yes |
| POST | `/api/scouting/v2/admin/seasons/:seasonKey/publish` | `scouting.packages.season.publish` | global/season | Yes | Yes |
| GET | `/api/scouting/v2/events/:eventKey/package` | `scouting.packages.event.read` | event | No | No |
| POST | `/api/scouting/v2/events/:eventKey/refresh` | `scouting.packages.event.refresh` | event | No | Yes |
| POST | `/api/scouting/v2/events/:eventKey/overrides` | `scouting.packages.event.override` | event | Yes | Yes |
| GET | `/api/scouting/v2/events/:eventKey/assignments/mine` | `scouting.assignments.read_own` | own/event | No | No |
| POST | `/api/scouting/v2/assignments/:id/accept` | `scouting.assignments.claim` | assignment/own | No | Yes |
| POST | `/api/scouting/v2/assignments/manual-fallback` | `scouting.assignments.manage` | event | No | Yes |
| POST | `/api/scouting/v2/records/chunks` | `scouting.match.capture` | assignment/own | No | Receipt trace |
| POST | `/api/scouting/v2/records/finalize` | `scouting.match.capture` | assignment/own | No | Receipt trace |
| GET | `/api/scouting/v2/records/:recordKey` | own or `scouting.records.read_event`/`read_all` | own/event/global | No | Privileged reads only |
| POST | `/api/scouting/v2/records/:recordKey/revisions` | `scouting.records.correct_own` or `correct_all` | own/event/global | Yes for others | Yes |
| POST | `/api/scouting/v2/records/:recordKey/void` | `scouting.records.void` | event/global | Yes | Yes |
| POST | `/api/scouting/v2/pit/contributions` | `scouting.pit.capture` | assignment/own | No | Receipt trace |
| GET | `/api/scouting/v2/analytics/*` | `scouting.analytics.read` | event/global | No | No |
| POST | `/api/scouting/v2/exports` | `scouting.exports.create` | event/global | Yes | Yes |
| GET | `/api/scouting/v2/admin/users` | `scouting.users.read` | global | No | Sensitive read |
| PATCH | `/api/scouting/v2/admin/memberships/:id` | `scouting.users.manage` or `scouting.roles.manage` | global | Yes | Yes |
| GET | `/api/scouting/v2/admin/audit` | `scouting.audit.read` | global/event | Yes | Yes |

All mutations require authentication and CSRF even when omitted from the compact table. Domain contracts add resource-state and idempotency rules. Endpoint registration must fail tests if no policy declaration exists.

## Errors

| HTTP | Code | Retryable | Client action |
|---:|---|:---:|---|
| 401 | `AUTHENTICATION_REQUIRED` | Yes | Preserve work and reauthenticate |
| 403 | `CAPABILITY_DENIED` | No | Remove unavailable action; retain queued evidence |
| 403 | `SCOPE_DENIED` | No | Correct event/resource context or escalate |
| 403 | `ASSIGNMENT_REQUIRED` | No | Obtain Lead Scout assignment |
| 403 | `RECENT_AUTHENTICATION_REQUIRED` | Yes | Same-UID reauthenticate and retry once |
| 409 | `AUTHORIZATION_VERSION_STALE` | Yes | Refresh session/projection and reevaluate |
| 409 | `ASSIGNMENT_VERSION_CONFLICT` | No | Preserve work for Lead Scout review |
| 503 | `AUTHORIZATION_UNAVAILABLE` | Yes | Deny server operation; preserve/retry locally |

## Offline and reconciliation

Local capture and queueing use cached assignment/projection only as a UX policy and are labeled authorization pending when current authority cannot be verified. Server sync rechecks current policy. Outcomes are distinct:

| Situation | Local work | Upload | Recovery |
|---|---|---|---|
| Session expired | Retain under UID | `auth_required` | Same-UID reauthentication |
| Capability removed | Retain/quarantine | `authorization_rejected` | Later restoration or Lead Scout review |
| Account disabled/revoked | Retain, hidden from other UIDs | Denied | Administrator restoration then same-UID retry, or audited evidence review |
| Assignment reassigned | Retain | Conflict-eligible former evidence | Lead Scout resolution |
| Stale projection | Retain | Refresh then evaluate | Retry only if current policy allows |
| Authorization service unavailable | Retain/queue | No acceptance | Capped retry; no optimistic server grant |

Another user never reads or uploads the owner UID's queued work. Authorization rejection is not schema rejection and does not trigger deletion.

## Audit, observability, performance, and accessibility

Audit login/logout/revocation links, membership/role/capability/scope changes, sensitive reauthentication, assignment/emergency changes, corrections/voids, publication/override, exports, audit access, and destructive cleanup. Required fields are actor UID, target, action, capability, scope, decision/outcome, reason, old/new version or bounded diff, request/correlation ID, and server timestamp. Redact credentials, cookies, tokens, CSRF material, service-account data, notes, and unnecessary personal data.

Metrics cover allow/deny by policy category, lookup/cache latency, stale-version frequency, propagation lag, unavailable decisions, and rejected-outbox recovery. Denial UX differentiates authentication, permission, scope, assignment, freshness, conflict, and outage without revealing inaccessible data.

## Threat and failure review

| Threat/failure | Required mitigation | Test/response | Residual risk |
|---|---|---|---|
| Stolen/shared session | HttpOnly/Secure cookie, revocation, recent auth | Revoked-cookie and lost-device runbook | Local origin data may remain |
| CSRF bypass | Signed session binding and exact Origin | Wrong/missing token/origin tests | XSS remains separately material |
| UID/role/capability spoofing | Derive actor and policy server-side | Direct API spoof tests | Server policy bugs |
| Stale claims/cache | Version hint, bounded cache, authoritative sensitive checks | Role-removal propagation tests | Short bounded propagation delay on safe reads |
| Event/ownership bypass | Typed authoritative scope and assignment lookup | Cross-event/peer/assignment matrix | Misconfigured grants |
| Frontend-only protection | Endpoint policy declaration/default deny | Direct API tests | None if registration gate holds |
| Replay mutation | CSRF plus idempotency/receipts | Replay/hash-conflict tests | Authorized repeat with new key requires domain rules |
| Shared-tablet leakage | UID partition and explicit switch cleanup | Two-user browser tests | Browser/site administrators can inspect origin data |
| Authorization outage | Fail closed; retain local work | Dependency-failure tests/runbook | Scouting can capture but not synchronize |
| Role-change race | Versioned mutation and sync-time reevaluation | Concurrent change/upload tests | Conflict review workload |

## Testable acceptance criteria

1. Every v2 endpoint has a policy declaration and undeclared endpoints deny.
2. Unauthenticated, unauthorized, wrong-event, wrong-owner, wrong-assignment, stale-version, and wrong-state requests fail safely.
3. Global, event, own, and assignment grants succeed only in scope; deny overrides allow.
4. Role/capability removal propagates and old custom claims cannot preserve access.
5. `debug`, frontend routes, and client-supplied identity/grants never authorize.
6. Authorization-rejected offline work remains owner-partitioned and recoverable.
7. Sensitive operations require same-UID recent authentication and audit.
8. Audit/log output contains no secret or scouting payload content.
9. Public registration produces no membership or effective grant, and an unverified Firebase identity cannot be activated.

Unit tests cover vocabulary, scope containment, deny precedence, evaluator order, and errors. API integration tests cover middleware and audit. Firebase/Firestore emulator tests cover revocation, memberships, versions, and concurrent changes. Browser tests cover shared-device/offline state. End-to-end tests cover assignment through receipt and revocation/recovery.

## Deferred decisions

Product owner must approve the vocabulary, separately fetched scoped projection, and authorization-pending offline capture. Engineering must measure and document cache TTL, propagation target, Firestore indexes, policy outage behavior, and maximum projection/grant counts. Multi-team tenancy requires a future amendment.
