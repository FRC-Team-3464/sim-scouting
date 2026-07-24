# Event Package contract

| Metadata | Value |
|---|---|
| Status | Approved with amendments |
| Approval scope | Slices 0–6 |
| Decision references | ADR 0004 |
| Related contracts | [Season Package](season-package.md), [Assignment Model](assignment-model.md), [Offline Synchronization](offline-sync.md), [Authorization](authorization-contract.md) |

## Purpose and scope

This contract governs the immutable offline event projection built from TBA plus narrow Lead Scout overrides. TBA is the sole external source. This contract does not define season/game rules or capture data.

## Identity and terminology

```ts
interface EventPackageManifest {
  eventKey: string;
  seasonKey: string;
  packageVersion: number;
  contentHash: string;
  generatedAt: string;
  expiresAt: string;
  resources: ResourceRef[];
  state: "draft" | "published" | "superseded" | "retired" | "revoked";
  sourceStatus: {
    tba?: string;
    manualRevision: number;
  };
}
```

Logical server resources include event metadata, teams, matches, results, rankings, roster, assignments, overrides, and imports. Replays/rematches have distinct canonical match keys.

## Data model

The `EventPackageManifest` above is the canonical offline manifest. Each `ResourceRef` is immutable and hash-addressed.

## Lifecycle and invariants

- **`draft`:** Default editable assembly state; unavailable to scouting clients and capture.
- **`published`:** Active immutable version for downloads and new work; at most one active version.
- **`superseded`:** Replaced immutable version; unavailable for new work but valid for pinned work.
- **`retired`:** Withdrawn from normal use but readable while retained references exist.
- **`revoked`:** Emergency-invalid version; blocked for new work and existing offline submissions require review.

Normal flow is `draft → published → superseded → retired`. `published` or `superseded` may become `revoked`. Corrections always create a new draft/version. Publication validates all resources, calculates hashes, records reason, and atomically activates the version. Active captures remain pinned.

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Authorized refresh request or override proposal |
| Server-authoritative | Normalized keys, lifecycle, active version, applied override result |
| Derived | Alliances, station lookup, freshness, hashes, projection |
| Local-only | Staging/download progress, active/previous marker, last access |
| Server-internal | TBA credentials/configuration, raw diagnostics, job cursor |

Every imported field retains TBA update time/source value. Lead Scout overrides are separate, reasoned, versioned, field-scoped, and higher precedence only for named fields; they never mutate the imported snapshot.

## Validation rules

Validate event/season identity, TBA normalization, override capability/version/reason, resource bounds, cross-resource references, hashes, and client compatibility.

## Storage, indexes, and retention

Recommended storage is bounded event documents/subcollections; one unbounded event document is prohibited. Index matches by scheduled time/state/team and assignments by assignee/state. Manifest max is 64 KiB, response max one MiB, page max 500. Retain published versions while locally/server referenced and server event history through 14 days after event end; import diagnostics follow the same policy unless an active incident extends it.

## Capabilities and security

- Read package: authorized event membership
- Refresh TBA: `scouting.packages.event.refresh`
- Create override: `scouting.packages.event.override`
- Revoke/rollback: `scouting.packages.event.override` with confirmation/reason

Lead Scouts may override; Administrators do not receive event-operation capability by default. Provider credentials remain server-only.

## API

| Method | Endpoint | Capability | Idempotent | Offline queued | Purpose |
|---|---|---|:---:|:---:|---|
| GET | `/api/scouting/v2/events/:eventKey/package` | event membership | N/A | No | Read manifest with ETag |
| GET | `/api/scouting/v2/events/:eventKey/resources/:hash?cursor=` | event membership | N/A | No | Read hash-addressed page |
| POST | `/api/scouting/v2/events/:eventKey/refresh` | `scouting.packages.event.refresh` | Yes | No | Start TBA refresh job |
| POST | `/api/scouting/v2/events/:eventKey/overrides` | `scouting.packages.event.override` | Yes | No | Publish reasoned correction |
| POST | `/api/scouting/v2/events/:eventKey/packages/:version/revoke` | `scouting.packages.event.override` | Yes | No | Emergency revoke |

Refresh returns a job/status resource; it never holds a long request. `If-None-Match` may return `304`.

## Errors

| HTTP | Code | Retryable | Client action |
|---:|---|:---:|---|
| 401 | `AUTHENTICATION_REQUIRED` | Yes | Reauthenticate |
| 403 | `CAPABILITY_DENIED` or `SCOPE_DENIED` | No | Explain denial |
| 409 | `OVERRIDE_VERSION_CONFLICT` | No | Refresh and reapply intentionally |
| 422 | `EVENT_PACKAGE_INVALID` | No | Keep last complete version |
| 503 | `TBA_UNAVAILABLE` | Yes | Keep last complete version; retry job |

## Offline and reconciliation

Clients stage, page, hash-verify, and atomically activate complete compatible packages. Stale packages remain usable with age/freshness displayed. Revocation blocks new capture after refresh but preserves/quarantines pinned offline work.

## Audit, observability, performance, and accessibility

Audit imports, lifecycle, override actor/reason/fields/versions, rollback, request/job IDs, and time. Freshness and overrides use textual status and announcements.

## Deferred decisions

Engineering must measure refresh/expiry intervals, TBA rate/availability behavior, and outage runbooks during Slice 2 without adding a second external source silently.
