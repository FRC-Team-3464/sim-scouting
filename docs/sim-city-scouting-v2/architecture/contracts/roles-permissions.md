# Roles and permissions contract

**Status:** Proposed

## Source of truth

Server-controlled team membership records are authoritative. Firebase custom claims may cache a small membership/permission version but are not the complete mutable policy. `debug` is excluded from authorization. Every request is authenticated, resolved to current membership, checked by capability middleware, and audited when privileged.

## Initial roles and capabilities

| Capability | Scout | Pit scout | Lead | Strategist | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Read own assignments/submissions | ✓ | ✓ | ✓ |  | ✓ |
| Submit assigned match records | ✓ |  | ✓ |  | ✓ |
| Submit pit contributions |  | ✓ | ✓ |  | ✓ |
| Read cross-scout records/consensus |  |  | ✓ | ✓ | ✓ |
| Manage assignments/conflicts |  |  | ✓ |  | ✓ |
| Import/override event data |  |  | ✓ |  | ✓ |
| Publish season packages |  |  |  |  | ✓ |
| Correct/void finalized records |  |  | ✓ |  | ✓ |
| Manage users, roles, exports, audit |  |  |  |  | ✓ |

This is a recommended starting map requiring product-owner approval. Capabilities, not role names, appear in endpoint policy. Drive-team viewer can be a read-only strategist membership if a distinct role is needed.

## Schema and lifecycle

```ts
interface TeamMembership {
  membershipId: string; teamNumber: number; uid: string;
  roles: string[]; capabilityOverrides: {allow: string[]; deny: string[]};
  status: "invited" | "active" | "suspended" | "revoked";
  permissionVersion: number; createdAt: string; updatedAt: string;
}
```

- **Authoritative/server-only:** UID, team, status, effective capabilities, versions, actor/timestamps.
- **Client-authored:** invitation acceptance and authorized change request.
- **Derived:** effective capability set and session summary.
- **Local-only:** cached display labels; never used to authorize sync.
- Index by team/status, UID/status, and permission version. Audit permission changes for the governance retention period. Membership max 32 KiB and capability names are allow-listed.

## API

- `GET /api/auth/session` adds safe team/role display and `permissionVersion` after implementation.
- `GET /api/scouting/v2/admin/memberships?teamNumber=&cursor=`
- `POST /api/scouting/v2/admin/memberships`
- `PATCH /api/scouting/v2/admin/memberships/:id`

Change request: `{"expectedVersion":3,"roles":["scouting_lead"],"reason":"Event lead"}`. Success: `200 {"membershipId":"mem_1","permissionVersion":4}`.

Validation: `422 {"error":{"code":"ROLE_INVALID","message":"Membership change is invalid","retryable":false}}`
Authentication: `401 {"error":{"code":"AUTHENTICATION_REQUIRED","message":"Log in to continue","retryable":true}}`
Authorization: `403 {"error":{"code":"PERMISSION_DENIED","message":"You cannot manage memberships","retryable":false}}`
Conflict: `409 {"error":{"code":"MEMBERSHIP_VERSION_CONFLICT","message":"Membership changed","retryable":false,"details":{"currentVersion":4}}}`
Retry: `503 {"error":{"code":"PERMISSION_SERVICE_UNAVAILABLE","message":"Change was not confirmed","retryable":true,"retryAfterSeconds":5}}`

Role changes revoke sessions or require immediate reauthentication so stale claims do not retain privilege.
