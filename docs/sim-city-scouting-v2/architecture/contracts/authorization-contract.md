# Authorization contract

| Metadata | Value |
|---|---|
| Status | Approved |
| Approval scope | Slices 0–8 |
| Primary implementation slice | Slice 0 policy/test foundation; operational integration in Slice 1; endpoint enforcement in every later slice |
| Approved decisions | Allow-listed capability vocabulary; typed scopes; Firestore authorization authority; limited custom claims; versioned propagation; separate bounded scoped projection; ordered default-deny evaluator; refined role/revocation behavior; authorization-pending offline capture; bounded redacted audit; staged security test gates |
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

interface AuthorizationProjectionResponse {
  data: AuthorizationProjection;
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

## Scoped authorization projection

`GET /api/scouting/v2/authorization` requires the HttpOnly session cookie and `Accept: application/json`; it has no body, query parameters, or CSRF requirement because it is a safe read. It returns only the authenticated UID's bounded projection. The server derives the UID from the verified session; the request accepts no target UID, team, role, grant, or scope selector. A representative response is:

```json
{
  "data": {
    "schemaVersion": 1,
    "uid": "firebase-uid",
    "teamNumber": 3464,
    "authorizationVersion": 12,
    "roles": ["Scout"],
    "grants": [
      {
        "grantId": "grant-123",
        "capability": "scouting.match.capture",
        "scope": {
          "type": "assignment",
          "assignmentId": "assignment-123"
        },
        "effect": "allow",
        "validFrom": "2026-07-24T12:00:00.000Z",
        "reason": "Event assignment",
        "version": 12
      }
    ],
    "generatedAt": "2026-07-24T12:00:01.000Z",
    "expiresAt": "2026-07-24T12:05:01.000Z"
  }
}
```

The response uses `Content-Type: application/json`, `Cache-Control: no-store`, the common safe request ID, and a maximum encoded size of 32 KiB. It contains no Firebase token, cookie, custom-claim payload, evaluator trace, other user's grants, internal deny rationale, or secret. The example timestamps are illustrative; projection TTL remains an engineering-measured bounded value. If bounded grants cannot fit, the server must fail explicitly until a separately approved pagination design exists; it must not silently truncate effective authorization.

The browser uses the projection for workspace/action composition and offline authorization-pending UX only. It may persist the last validated projection as UID-partitioned application data for offline display, despite prohibiting HTTP caching; the record retains `authorizationVersion`, `generatedAt`, and `expiresAt`, is inaccessible to other signed-in UIDs through application behavior, and is never server authority. Account switch clears it from memory. Expired or mismatched projections cannot enable new local actions beyond separately downloaded assignment policy.

Refresh occurs after login/reauthentication, session restoration, authorization-version mismatch, visibility/reconnect signals, an authoritative authorization denial, or projection expiry while online. Projection refresh does not renew the session. If projection loading fails, protected UI and server work fail closed while same-UID local evidence remains preserved.

## Lifecycle and invariants

- Firestore membership/grant records are canonical. Every policy change increments `authorizationVersion` atomically and emits audit.
- An ordinary role/grant change does not automatically terminate the Firebase session. Current backend evaluation removes or adds effective access, and the version mismatch forces projection refresh.
- Membership suspension/revocation, lost-device response, or suspected compromise denies application capabilities and may revoke Firebase sessions through the approved Administrator/operations procedure.
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

Recommended logical records are team memberships plus separately bounded grants and immutable policy audit entries. Index UID/state, team/state, authorization version, capability/scope identifiers, validity window, and target. Projection response maximum is 32 KiB. An oversized projection fails explicitly and is never truncated; pagination requires a later approved contract amendment. Cache TTL is an engineering-measured value, never longer than projection expiry, and sensitive/sync/version-mismatch decisions bypass it. Retention follows the common operational contract.

## Capabilities and security

| Role | Baseline scope and intent |
|---|---|
| Scout | Own assignments and records; capture only assigned work; post-qualification summaries after Lead Scout closure |
| Lead Scout | Event-scoped assignment, evidence, correction, override, analytics, and export operations |
| Strategist | Event-scoped finalized evidence, analytics, and export reads; no record/package mutation |
| Administrator | Global membership, season-package, retention, recovery, audit, export, and read-only record access; no assignment/record mutation by default |

Role bundle expansion is defined normatively in Roles and Permissions. Manual emergency capture requires a Lead Scout-created/approved assignment; Scouts do not self-grant `capture_manual`.

## Policy evaluation

Every route has exactly one runtime-validated declaration registered with it. Public and health endpoints must be explicitly marked; omission never means public. The declaration model is:

```ts
type OwnershipRule =
  | "none"
  | "own"
  | "own_or_privileged";

type AssignmentRule =
  | "none"
  | "active_assignment"
  | "current_or_former_assignment_with_conflict";

type RecentAuthenticationRule =
  | "not_required"
  | "required"
  | "required_for_other_owner";

type AuditRule =
  | "none"
  | "sensitive_read"
  | "privileged_mutation"
  | "receipt_trace";

interface EndpointAuthorizationPolicy {
  policyId: string;
  access: "protected";
  anyOfCapabilities: Array<Capability | "authenticated">;
  allowedScopeTypes: AuthorizationScope["type"][];
  ownershipRule: OwnershipRule;
  assignmentRule: AssignmentRule;
  allowedResourceStates?: string[];
  recentAuthentication: RecentAuthenticationRule;
  audit: AuditRule;
  authoritativeRead:
    | "always"
    | "sensitive_sync_or_version_mismatch";
}

interface PublicEndpointPolicy {
  policyId: string;
  access: "public";
  securityProfile:
    | "health"
    | "pre_auth_read"
    | "pre_auth_mutation";
}

type EndpointPolicyDeclaration =
  | EndpointAuthorizationPolicy
  | PublicEndpointPolicy;

interface AuthorizationDecision {
  outcome: "allow" | "deny";
  policyId: string;
  authorizationVersion: number;
  denialCode?:
    | "CAPABILITY_DENIED"
    | "SCOPE_DENIED"
    | "ASSIGNMENT_REQUIRED"
    | "RECENT_AUTHENTICATION_REQUIRED"
    | "AUTHORIZATION_VERSION_STALE"
    | "AUTHORIZATION_UNAVAILABLE";
}
```

`AuthorizationDecision` is server-internal. Clients receive only the common bounded error envelope. They never receive matching-grant traces, protected-resource existence, internal cache state, or evaluator reasoning.

Public declarations do not bypass security controls. `pre_auth_mutation` requires the Identity and Session contract's pre-auth CSRF binding, exact-Origin validation, input limits, enumeration resistance where applicable, and an explicit rate-limit profile. `pre_auth_read` remains bounded and non-sensitive. `health` exposes only the approved liveness/readiness projection and no configuration or dependency secrets.

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

Route construction/startup fails when a protected endpoint has no declaration, a declaration names an unknown capability/scope, or its recent-authentication/audit requirements contradict the endpoint contract. CI enumerates registered routes and contract policy rows bidirectionally: every route has exactly one effective declaration and every declared policy maps to a route. A frontend route guard, role label, `debug`, cached projection, or handler-local check cannot replace this evaluator.

The evaluator runs before business mutation. Required privileged audit must be durably committed with the mutation when the datastore boundary permits; otherwise a durable audit intent must be established before success is returned. If required audit cannot be secured, the privileged mutation fails without partial success. Denied requests may emit a bounded security event, but logs never contain evaluator traces or protected payloads.

Recent authentication is server-authoritative and passes only when `authenticatedAt` is no more than 15 minutes old. It is required for role changes, package publication, event overrides, correction or voiding of another Scout's evidence, identifiable exports, audit access, Administrator/operations emergency revocation, and destructive cleanup. It is never inferred from an expiry warning or frontend route and never interrupts ordinary active capture.

## API

| Method | Endpoint | Capability | Scope | Recent authentication | Audit |
|---|---|---|---|:---:|:---:|
| GET | `/api/scouting/v2/authorization` | authenticated | own projection | No | No |
| GET | `/api/scouting/v2/seasons/:seasonKey/active` | `scouting.packages.season.read` | season | No | No |
| POST | `/api/scouting/v2/admin/seasons/:seasonKey/drafts` | `scouting.packages.season.manage_draft` | global/season | No | Yes |
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

Offline authorization-pending capture is limited to previously downloaded assignments/packages and the original UID's partition. It cannot create assignments, change policy, publish packages, override event data, perform privileged corrections, request exports, or access audit. Permission removal never reattributes queued work; any later evidence-recovery workflow preserves the original Scout UID and requires its own approved capability and audit.

## Audit, observability, performance, and accessibility

```ts
interface AuthorizationAuditEvent {
  auditEventId: string;
  eventType: string;
  actorUid: string;
  targetType: string;
  targetId: string;
  capability?: Capability;
  scope?: AuthorizationScope;
  outcome: "allowed" | "denied" | "failed";
  reason?: string;
  priorVersion?: number;
  newVersion?: number;
  boundedDiff?: Record<string, unknown>;
  resultCount?: number;
  requestId: string;
  environment: string;
  occurredAt: string;
  expiresAt: string;
}
```

Audit login/logout/revocation links, membership/role/capability/scope changes, sensitive reauthentication, assignment/emergency changes, corrections/voids, publication/override, exports, audit access, and destructive cleanup. Every event requires actor UID, target, event type, outcome, request/correlation ID, environment, and server time. Capability and scope are required when an application policy decision exists; a reason and old/new version or bounded diff are required for privileged governance changes. Redact credentials, cookies, tokens, CSRF material, service-account data, notes, and unnecessary personal data.

Sensitive privileged reads, including Administrator raw-record access, are audited once per bounded request/page with target/query class and result count rather than copying each returned record. Ordinary own-record reads, routine authorized analytics, and rapid capture actions do not create security-audit records. Event-related audit expires under the approved 14-day post-event policy; legal hold or an active incident may suspend deletion.

Required privileged mutation audit is committed atomically with the mutation when possible or secured as a durable audit intent before success. Required sensitive reads and privileged mutations fail closed when audit evidence cannot be established. Audit never contains full scouting payloads, Scout notes, credentials, cookies, tokens, CSRF material, verification/reset codes, service-account data, photo content, or evaluator traces.

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

### Staged security delivery gates

Slice 0 must pass runtime-schema, vocabulary, scope-containment, deny-precedence, evaluator-order, route-registry completeness, missing-policy denial, safe-error, Firestore membership/grant fixture, authorization-version mutation, cache-invalidation, and `debug`-grants-nothing tests. It must establish executable helpers and fixtures for later slices; tests requiring features not yet implemented do not block Slice 0.

Slice 1 must pass session-cookie, expired/revoked/disabled/deleted identity, CSRF/Origin, session/projection schema, same-UID reauthentication, account switching, UID isolation, zero-privilege registration, verification gate, non-enumerating recovery, projection mismatch/refresh, authority outage, role-removal propagation, browser-local logout, emergency revocation, and approved expiry/warning/freshness boundary tests.

Every later endpoint-owning slice must pass its direct-API policy matrix, including wrong capability, scope, event, team, assignment, owner, resource state, expected version, deny precedence, recent authentication, audit success/failure, rate/payload limits, idempotency where applicable, and offline rejection/evidence-preservation behavior. Representative browser/end-to-end coverage includes two-user shared-device isolation, offline restart/reconnect, offline reassignment, queued work during role removal, authority/audit outage, assignment-to-receipt, and revocation/recovery.

## Deferred decisions

No product-owner or principal-architect approval remains open in this contract. Engineering must measure and document projection/cache TTL, propagation target, Firestore indexes, policy/audit outage behavior, audit volume and quota use, maximum projection/grant counts, and route-registry completeness, then pass the staged gates in the owning slices. Multi-team tenancy requires a future amendment.
