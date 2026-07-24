# Assignment Model contract

| Metadata | Value |
|---|---|
| Status | Approved with amendments |
| Approval scope | Slices 0–6 |
| Decision references | ADR 0003, ADR 0010 |
| Related contracts | [Match Scouting](match-scouting.md), [Pit Scouting](pit-scouting.md), [Event Package](event-package.md), [Authorization](authorization-contract.md) |

## Purpose and scope

This contract governs server-authoritative event coverage, assignment claims, lifecycle/version conflicts, intentional duplicate coverage, and emergency assignments. It does not define capture content or submission hashing.

## Identity and terminology

```ts
interface Assignment {
  assignmentId: string;
  eventKey: string;
  type: "match" | "pit" | "specialist";
  subject: MatchSubject | PitSubject;
  assigneeUid?: string;
  state: "planned" | "available" | "accepted" | "in_progress" | "completed" | "missed" | "cancelled" | "reassigned";
  version: number;
  source: "lead" | "import" | "manual_fallback";
  availableAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  supersedesAssignmentId?: string;
  createdAt: string;
  updatedAt: string;
}
```

The roster separately records membership, capabilities, availability windows, and active/standby state.

## Data model

The `Assignment` interface above is the complete canonical assignment envelope; subject types are season/event-bound references defined by their domain contracts.

## Lifecycle and invariants

- `planned → available → accepted → in_progress → completed` is the normal path.
- `missed`, `cancelled`, and `reassigned` require server time and reason.
- `accepted` claims an available version; `in_progress` binds a capture; `completed` requires an accepted receipt.
- A standby Scout or Scout without an active assignment is read-only.
- Only a Lead Scout with `scouting.assignments.manage` creates or approves a `manual_fallback` emergency assignment. The resulting assignment, not a client claim to `scouting.match.capture_manual`, authorizes the Scout's emergency capture.
- Intentional duplicate coverage uses distinct assignments; it never shares a logical assignment claim.

## Conflict matrix

| Scenario | Server authority | Client behavior | Resolution/audit |
|---|---|---|---|
| Changed before download | Latest projection only | Show current assignment | Normal version history |
| Changed after download | Server version wins | Warn before start when known | Refresh/acknowledge |
| Changed while offline | Server version wins; preserve work | Mark capture stale | Lead Scout review |
| Outdated assignment started | Preserve attributable capture | Show stale context | Accept as duplicate/former evidence or void |
| Two normal claims | First valid expected version wins | Loser sees `409` | Lead may create duplicate assignment |
| Reassigned during active match | Replacement governs coverage | Original capture continues locally | Former-assignee submission flagged |
| Former assignee submits | May receive receipt if otherwise valid | Do not claim replacement completion | Lead review; never silently reattribute |
| Missing coverage | Server marks `missed` | Show gap | Lead creates emergency assignment if useful |
| Manual emergency scouting | Lead-created assignment required | Scout confirms context | Actor, reason, context, version audited |

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Accept/start/complete intent, expected version, fallback context confirmation |
| Server-authoritative | Subject, assignee, state, version, lifecycle timestamps, audit |
| Derived | Coverage gap, duplicate coverage, stale flag, receipt linkage |
| Local-only | Download marker, local acknowledgement, capture-launch state |
| Server-internal | Transition authorization and conflict-resolution job state |

## Validation rules

Validate event membership, capability, subject/package existence, expected version, valid transition, and assignment/capture binding.

## Storage, indexes, and retention

Recommended storage is `events/{eventKey}/assignments/{assignmentId}` with immutable audit entries. Index event/state, event/assignee/state, event/match/station, and event/team/type. Maximum assignment size is 32 KiB; pages contain at most 500. Retain assignments/audit through 14 days after event end.

## Capabilities and security

- Read own: `scouting.assignments.read_own`
- Accept/start assigned: `scouting.assignments.claim`
- Manage/reassign/emergency/conflicts: `scouting.assignments.manage`

Lead Scouts manage assignments. Strategists and Administrators have no assignment mutation by default. Cached assignment/capability state is never authorization.

## API

| Method | Endpoint | Capability | Idempotent | Offline queued | Purpose |
|---|---|---|:---:|:---:|---|
| GET | `/api/scouting/v2/events/:eventKey/assignments/mine?sinceVersion=` | `scouting.assignments.read_own` | N/A | No | Download caller projection |
| POST | `/api/scouting/v2/assignments/:id/accept` | `scouting.assignments.claim` | Yes | Limited | Claim expected version |
| POST | `/api/scouting/v2/assignments/:id/start` | `scouting.assignments.claim` | Yes | Yes | Bind capture session |
| POST | `/api/scouting/v2/assignments/:id/complete` | `scouting.assignments.claim` | Yes | Yes | Link accepted receipt |
| POST | `/api/scouting/v2/assignments/manual-fallback` | `scouting.assignments.manage` | Yes | No | Create emergency assignment |
| POST | `/api/scouting/v2/assignments/:id/reassign` | `scouting.assignments.manage` | Yes | No | Reassign with reason |
| POST | `/api/scouting/v2/assignments/:id/cancel` | `scouting.assignments.manage` | Yes | No | Cancel with reason |

Accept request:

```json
{"expectedVersion":4,"idempotencyKey":"018f..."}
```

## Errors

| HTTP | Code | Retryable | Client action |
|---:|---|:---:|---|
| 401 | `AUTHENTICATION_REQUIRED` | Yes | Reauthenticate |
| 403 | `CAPABILITY_DENIED`, `SCOPE_DENIED`, or `ASSIGNMENT_REQUIRED` | No | Preserve work; explain denial/recovery |
| 409 | `ASSIGNMENT_VERSION_CONFLICT` | No | Refresh and show stale/reassigned state |
| 422 | `INVALID_TRANSITION` | No | Show current state and permitted action |
| 503 | `ASSIGNMENT_SERVICE_UNAVAILABLE` | Yes | Retry immutable intent |

## Offline and reconciliation

Downloaded assignments open offline. Mutations retain expected version/idempotency. Offline reassignment never deletes capture work.

## Audit, observability, performance, and accessibility

Audit actor, capability, transition, reason, versions, affected Scout, capture/receipt, resolution, request ID, and time. Status and warnings use text, not color alone; coverage queries are paged and indexed.

## Deferred decisions

Dedicated, reduced, roaming, and specialist staffing remain deferred to method validation.
