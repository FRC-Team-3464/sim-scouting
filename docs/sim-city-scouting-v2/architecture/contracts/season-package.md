# Season Package contract

| Metadata | Value |
|---|---|
| Status | Approved with amendments |
| Approval scope | Slices 0–8 |
| Decision references | ADR 0005 |
| Related contracts | [Event Package](event-package.md), [Match Scouting](match-scouting.md), [Pit Scouting](pit-scouting.md), [Submission Integrity](submission-integrity.md), [Authorization](authorization-contract.md) |

## Purpose and scope

This contract governs versioned game configuration without executable remote forms. It defines supported capture components and validation/derivation resources, not empirical defaults or event schedules.

## Identity and terminology

```ts
interface SeasonPackageManifest {
  seasonKey: string;
  schemaVersion: number;
  contentVersion: number;
  state: "draft" | "published" | "superseded" | "retired" | "revoked";
  contentHash: string;
  compatibleClient: {
    min: string;
    maxExclusive?: string;
  };
  phases: ResourceRef;
  observations: ResourceRef;
  components: ResourceRef;
  field: ResourceRef;
  validation: ResourceRef;
  derivedMetrics: ResourceRef;
  postMatch: ResourceRef;
  pitQuestions: ResourceRef;
  analytics: ResourceRef;
  publishedAt?: string;
  publishedBy?: string;
  changeReason?: string;
  supersedesHash?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
}
```

## Data model

The `SeasonPackageManifest` above references independently hash-addressed bounded resources. `schemaVersion` governs envelope compatibility; `contentVersion` orders product revisions.

## Lifecycle and invariants

- `draft` is editable and unavailable to capture.
- `published` is active and immutable.
- `superseded` is replaced but valid for pinned work/history.
- `retired` is unavailable for new work but retained while referenced.
- `revoked` blocks new work and quarantines later pinned submissions for review.

An Administrator publishes without a second approver but must confirm and provide a non-empty reason. Changes create a new immutable version. Devices keep active and previous known-good compatible versions; active capture never switches package.

## Controlled component registry

MVP components are compiled action button, counter, segmented/tri-state selection, state machine, zone/coordinate action, anchored rating, note, measurement, and checklist. Packages contain no HTML, script, executable URLs, stylesheets, or arbitrary expressions. Derived metrics use an allow-listed declarative vocabulary evaluated by server and tested client utilities. Photo input is not MVP.

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Authorized draft labels, definitions, options, rules, mappings, resources |
| Server-authoritative | Lifecycle, hashes, publisher, compatibility, timestamps, reasons |
| Derived | Resource and whole-package hashes |
| Local-only | Download/active state, last use, known-good marker |
| Server-internal | Publication validation/audit job state |

## Validation rules

Validate registry types, schema/resource references, bounded expressions, accessibility requirements, client compatibility, sizes, and whole/resource hashes.

## Storage, indexes, and retention

Manifest max is 64 KiB, each resource 256 KiB, and package/assets five MiB. Large assets are content-hashed same-origin static/CDN resources; Firebase Storage is not required. Index by season/state/contentVersion. Retain immutable resources while any retained record references them. Draft cleanup requires policy and never affects published history.

## Capabilities and security

- Read active/package: authorized product user
- Manage drafts: `scouting.packages.season.manage_draft`
- Publish/revoke/rollback: `scouting.packages.season.publish`

Only Administrators receive publication capability. Lead Scouts cannot publish or change technical package configuration.

## API

| Method | Endpoint | Capability | Idempotent | Offline queued | Purpose |
|---|---|---|:---:|:---:|---|
| GET | `/api/scouting/v2/seasons/:seasonKey/active` | authenticated user | N/A | No | Read active manifest |
| GET | `/api/scouting/v2/seasons/:seasonKey/packages/:hash` | authenticated user | N/A | No | Read immutable version |
| POST | `/api/scouting/v2/admin/seasons/:seasonKey/drafts` | `scouting.packages.season.manage_draft` | Yes | No | Create/update draft version |
| POST | `/api/scouting/v2/admin/seasons/:seasonKey/publish` | `scouting.packages.season.publish` | Yes | No | Publish with confirmation/reason |
| POST | `/api/scouting/v2/admin/seasons/:seasonKey/packages/:hash/revoke` | `scouting.packages.season.publish` | Yes | No | Emergency revoke |

Publish request:

```json
{"draftId":"draft_3","expectedDraftVersion":7,"confirmed":true,"changeReason":"2026 game definition","idempotencyKey":"018f..."}
```

## Errors

| HTTP | Code | Retryable | Client action |
|---:|---|:---:|---|
| 401 | `AUTHENTICATION_REQUIRED` | Yes | Reauthenticate |
| 403 | `CAPABILITY_DENIED` or `SCOPE_DENIED` | No | Explain Administrator requirement |
| 409 | `DRAFT_VERSION_CONFLICT` | No | Refresh draft and resolve |
| 422 | `PACKAGE_INVALID` | No | Show resource/path validation |
| 503 | `PUBLICATION_UNAVAILABLE` | Yes | Retry unchanged publication intent |

## Offline and reconciliation

Clients activate only complete hash-verified compatible versions. Published/superseded content remains available while pinned.

## Audit, observability, performance, and accessibility

Audit actor, confirmation, reason, states, versions/hashes, compatibility, request ID, and time. Registry components require WCAG behavior and non-map alternatives. Resources are bounded and lazy-loaded where safe.

## Deferred decisions

Capture methods, spatial defaults, rating anchors, confidence, and staffing remain deferred to method validation. A new component requires reviewed application code and contract amendment.
