# Roles and Permissions contract

| Metadata | Value |
|---|---|
| Status | Approved with amendments |
| Approval scope | Slices 0–8 |
| Primary implementation slice | Slice 0 role/capability foundation; membership integration in Slice 1; administration UX in Slice 8 |
| Approved extensions | ADR 0014 capability, scope, authority, claims, propagation, projection, evaluator, role-change/revocation, offline-authorization, audit, and staged test-gate details |
| Decision references | ADR 0010, ADR 0014 |
| Related contracts | [Authorization](authorization-contract.md), [Identity and Session](identity-session-contract.md), all purpose-specific domain contracts |

## Purpose and scope

This contract governs membership lifecycle and approved role baselines. Roles organize UX; the Authorization contract owns the normalized vocabulary, scoped grants, projections, and backend policy evaluation. The Identity and Session contract owns the public session.

## Identity and terminology

Server-controlled team memberships are authoritative. Firebase custom claims may cache a small authorization-version hint but never replace current membership resolution.

## Data model

```ts
interface TeamMembership {
  membershipId: string;
  teamNumber: number;
  uid: string;
  roles: string[];
  state: "invited" | "active" | "suspended" | "revoked";
  authorizationVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

Capability grants and denies are separate bounded records using `CapabilityGrant` from the Authorization contract. This prevents one membership document from growing with event-scoped policy.

## Role baseline

| Capability | Scout | Lead Scout | Strategist | Administrator |
|---|:---:|:---:|:---:|:---:|
| Read own assignments/submissions | ✓ | ✓ | If separately Scout | Read records |
| Submit assigned match/pit work | ✓ | If assigned | If separately Scout |  |
| Read peer records/consensus |  | ✓ | ✓ | ✓ |
| Read live cross-scout analytics |  | ✓ | ✓ | ✓ |
| Read derived summaries during qualifications |  | ✓ | ✓ | ✓ |
| Read summaries after Lead closes qualifications | ✓ | ✓ | ✓ | ✓ |
| Manage assignments/conflicts/emergency coverage |  | ✓ |  |  |
| Override event data |  | ✓ |  |  |
| Correct/void records |  | ✓ |  |  |
| Publish/revoke season packages |  |  |  | ✓ |
| Manage membership/retention/recovery/audit |  |  |  | ✓ |
| Request identifiable export |  | ✓ | ✓ | ✓ |

Match and pit capture are separately grantable. Administrator record access is routine read-only and does not imply event mutation. `debug`, UI routes, cached capabilities, and device IDs authorize nothing.

## Lifecycle and invariants

Public registration creates no membership. An Administrator may create or activate membership only after the backend confirms the Firebase identity's email is verified; verification never creates membership or grants a role automatically. Activation normally assigns Scout, while elevated roles require explicit audited assignment. Invitations, if introduced for administration convenience, become active under the same verification rule. Every policy mutation increments `authorizationVersion`. Ordinary role/grant changes take effect through authoritative backend checks without automatically ending the Firebase session. Membership suspension/revocation, lost-device response, or suspected compromise denies application access and may revoke sessions. Unsynchronized evidence remains under its original UID and is never transferred silently. Deny overrides allow. A Scout without active assignment is read-only. The server-owned `qualification_collection_closed` event state gates Scout summaries; Lead Scout closure/reopen requires reason/audit.

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Invitation acceptance and authorized change request |
| Server-authoritative | UID/team/state, effective capabilities, version, actor/time |
| Derived | Effective capability set and safe session summary |
| Local-only | Display labels; never authorization |
| Server-internal | Policy evaluation/cache state |

## Validation rules

Validate actor capability, allowed role vocabulary, target Firebase UID, current server-confirmed `emailVerified`, target team, expected authorization version, reason, and last-Administrator safeguards. Reject membership activation for an unverified identity even if the client or Administrator claims verification. Capability/scope validation follows the Authorization contract.

## Storage, indexes, and retention

Index team/state, UID/state, and authorization version. Membership max is 32 KiB. Retain authorization audit through 14 days after applicable event end or longer while membership governance requires.

## Capabilities and security

The role baseline above compiles into allow-listed, scoped capabilities. Deny overrides allow. Every request applies the Authorization contract. Role names, frontend routes, custom claims, and `debug` never substitute for authoritative evaluation.

## API

| Method | Endpoint | Capability | Idempotent | Offline queued | Purpose |
|---|---|---|:---:|:---:|---|
| GET | `/api/scouting/v2/auth/session` | authenticated | N/A | No | Return safe roles and authorization version |
| GET | `/api/scouting/v2/admin/memberships?teamNumber=&cursor=` | `scouting.users.read` | N/A | No | Page memberships |
| POST | `/api/scouting/v2/admin/memberships` | `scouting.users.manage` | Yes | No | Create/invite membership |
| PATCH | `/api/scouting/v2/admin/memberships/:id` | `scouting.users.manage` or `scouting.roles.manage` | Yes | No | Versioned identity/role/state change |

Every purpose-specific endpoint declares required capabilities and uses deny-by-default middleware after authentication/CSRF. Cached session summaries drive display only; sync is reauthorized.

## Errors

| HTTP | Code | Retryable | Client action |
|---:|---|:---:|---|
| 401 | `AUTHENTICATION_REQUIRED` | Yes | Reauthenticate |
| 403 | `CAPABILITY_DENIED` or `SCOPE_DENIED` | No | Hide/disable action after authoritative denial |
| 409 | `AUTHORIZATION_VERSION_STALE` | Yes | Refresh session/projection and policy |
| 422 | `EMAIL_VERIFICATION_REQUIRED` | No | Keep membership inactive and direct the user to Firebase verification resend |
| 422 | `ROLE_OR_CAPABILITY_INVALID` | No | Correct request |
| 503 | `AUTHORIZATION_UNAVAILABLE` | Yes | Do not assume permission; retry |

## Offline and reconciliation

Offline capability displays are hints. Capture may continue within downloaded assignment policy as authorization pending; server reauthorizes upload. Removal or disablement retains same-UID work in an authorization-rejected state and never permits another user to upload it.

## Audit, observability, performance, and accessibility

Audit actor, target, roles/capabilities, activation/suspension state, reason, versions, request ID, and time. Do not copy verification links or action codes into audit. Cache bounded summaries without weakening revocation. Denial messages are clear but do not reveal protected data.

## Deferred decisions

No product-owner or principal-architect approval remains open for ADR 0014. Multi-team tenancy requires a future amendment. Scouting-method staffing does not change capability enforcement. Engineering evidence remains required under the Authorization contract's staged gates.
