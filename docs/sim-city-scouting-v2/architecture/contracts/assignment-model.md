# Assignment model contract

**Status:** Proposed

## Schema

```ts
interface Assignment {
  assignmentId: string; eventKey: string; type: "match" | "pit" | "specialist";
  subject: MatchSubject | PitSubject; assigneeUid?: string;
  state: "planned" | "available" | "accepted" | "in_progress" | "completed" | "missed" | "cancelled" | "reassigned";
  version: number; source: "lead" | "import" | "manual_fallback";
  availableAt?: string; acceptedAt?: string; startedAt?: string; completedAt?: string;
  supersedesAssignmentId?: string; createdAt: string; updatedAt: string;
}
```

The roster separately records event membership, capabilities, availability windows, and active status. Assignment audit entries contain actor, transition, reason, prior/new version, and server timestamp. Manual fallback proposes a new `manual_fallback` assignment and requires context confirmation.

## Lifecycle rules

Only valid transitions are accepted. `accepted` claims an available assignment; `in_progress` binds a capture session; `completed` requires an accepted record receipt. Reassignment creates a new version/audit entry and does not erase offline work. A stale client may finish the old assignment, but the server returns a flagged conflict for lead review instead of silently reattributing it.

## Ownership and limits

- **Authoritative/server-only:** assignee, subject verification, lifecycle, version, audit, timestamps.
- **Client-authored:** acceptance intent, start/complete intent, fallback reason, expected version.
- **Derived:** coverage gap, duplicate coverage, stale assignment, completion receipt linkage.
- **Local-only:** downloaded flag, local acknowledgement, capture launch state.
- Index by event/state, event/assignee/state, event/match/station, event/team/type. Retain assignment/audit with event records. Maximum 32 KiB per assignment and 500 active assignments per downloaded page.

## API

- `GET /api/scouting/v2/events/:eventKey/assignments/mine?sinceVersion=`
- `POST /api/scouting/v2/assignments/:id/accept`
- `POST /api/scouting/v2/assignments/:id/start`
- `POST /api/scouting/v2/assignments/:id/complete`
- `POST /api/scouting/v2/assignments/manual-fallback`
- Lead endpoints create, reassign, cancel, and mark missed.

Accept request: `{"expectedVersion":4}`. Success: `200 {"assignmentId":"asg_1","state":"accepted","version":5}`.

Validation: `422 {"error":{"code":"INVALID_TRANSITION","message":"Assignment cannot be accepted","retryable":false}}`
Authentication: `401 {"error":{"code":"AUTHENTICATION_REQUIRED","message":"Log in to continue","retryable":true}}`
Conflict: `409 {"error":{"code":"ASSIGNMENT_VERSION_CONFLICT","message":"Assignment changed while offline","retryable":false,"details":{"currentVersion":6,"state":"reassigned"}}}`
Retry: `503 {"error":{"code":"ASSIGNMENT_SERVICE_UNAVAILABLE","message":"Acceptance was not confirmed","retryable":true,"retryAfterSeconds":3}}`

Mutation retries reuse an idempotency key. A downloaded projection contains package version and ETag; clients never infer acceptance from local state alone.
