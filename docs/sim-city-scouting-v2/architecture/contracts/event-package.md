# Event package contract

**Status:** Proposed

## Server storage

```text
events/{eventKey}
events/{eventKey}/teams/{teamNumber}
events/{eventKey}/matches/{matchKey}
events/{eventKey}/results/{matchKey}
events/{eventKey}/rankings/{teamNumber}
events/{eventKey}/roster/{uid}
events/{eventKey}/assignments/{assignmentId}
events/{eventKey}/overrides/{overrideId}
events/{eventKey}/imports/{importId}
```

Metadata identifies season, name, location, timezone, state, active package version/hash, generation time, expiry, and source status. Every imported field carries source and source update time. Source adapters normalize FIRST and TBA data. Manual overrides are separate, reasoned, versioned, and highest precedence only for their named fields. The product owner must approve whether FIRST or TBA wins when both provide a non-overridden field.

## Offline projection

```ts
interface EventPackageManifest {
  eventKey: string; seasonKey: string; packageVersion: number; contentHash: string;
  generatedAt: string; expiresAt: string; resources: ResourceRef[];
  sourceStatus: {first?: string; tba?: string; manualRevision: number};
}
```

Resources are independently hashed/paged: metadata, teams, matches, results, rankings, roster-visible subset, and assignments. Clients download to staging stores, verify all hashes, then atomically mark the package active. Corrections increment the version; replays/rematches receive distinct canonical match keys. Removed packages are retained locally while referenced by drafts, then cleaned by LRU policy.

## Ownership and limits

- **Authoritative:** normalized keys, active version, precedence result, manual overrides.
- **Client-authored:** import/refresh request and override proposal from authorized leads.
- **Derived:** alliances, station lookup, freshness, hashes, projection.
- **Local-only:** download progress, active/previous marker, last access, storage state.
- **Server-only:** provider credentials, raw import diagnostics, job cursor.
- Index matches by scheduled time/status and teams; assignments by assignee/state. Manifest max 64 KiB, resource response max 1 MiB, page max 500 items. Keep event packages through the configured event-retention period; import diagnostics default 90 days.

## API

- `GET /api/scouting/v2/events/:eventKey/package` with `If-None-Match`
- `GET /api/scouting/v2/events/:eventKey/resources/:hash?cursor=`
- `POST /api/scouting/v2/events/:eventKey/refresh`
- `POST /api/scouting/v2/events/:eventKey/overrides`

Success: `200 {"eventKey":"2026mabos","packageVersion":12,"contentHash":"sha256:...","resources":[...]}` or `304`.
Validation: `422 {"error":{"code":"EVENT_KEY_INVALID","message":"Event key is invalid","retryable":false}}`
Authentication: `401 {"error":{"code":"AUTHENTICATION_REQUIRED","message":"Log in to continue","retryable":true}}`
Conflict: `409 {"error":{"code":"OVERRIDE_VERSION_CONFLICT","message":"Event override changed","retryable":false}}`
Retry: `503 {"error":{"code":"UPSTREAM_EVENT_DATA_UNAVAILABLE","message":"Refresh could not complete","retryable":true,"retryAfterSeconds":60}}`

An upstream failure never replaces the last complete package. Refresh endpoints return a job/status resource rather than holding a long HTTP request open.
