# Season package contract

**Status:** Proposed

## Model

A package is an immutable published manifest:

```ts
interface SeasonPackageManifest {
  seasonKey: string; schemaVersion: number; contentVersion: number;
  status: "draft" | "published" | "retired"; contentHash: string;
  compatibleClient: {min: string; maxExclusive?: string};
  phases: ResourceRef; observations: ResourceRef; components: ResourceRef;
  field: ResourceRef; validation: ResourceRef; derivedMetrics: ResourceRef;
  postMatch: ResourceRef; pitQuestions: ResourceRef; analytics: ResourceRef;
  publishedAt?: string; publishedBy?: string;
}
```

Allowed MVP components are compiled identifiers: action button, counter, segmented/tri-state selection, state machine, zone/coordinate action, anchored rating, note, measurement, and checklist. Packages contain no HTML, script, URL-executed code, stylesheets, or arbitrary expressions. Derived metrics use an allow-listed declarative expression vocabulary evaluated by server and tested client utilities. A photo input is not part of the MVP registry and requires the separately approved extension described by ADR 0009.

## Ownership, limits, and storage

- **Authoritative/server-only:** lifecycle, hashes, publisher, compatibility, publication timestamps.
- **Client-authored during draft:** labels, definitions, options, rules, mappings, resource contents.
- **Derived:** resource hashes and whole-package hash.
- **Local-only:** downloaded/active state, last-used time, known-good rollback marker.
- Index by season/status/contentVersion. Published resources are immutable and retained while referenced by any retained record. Drafts may be pruned after 90 days. Manifest maximum 64 KiB; each resource 256 KiB; package including assets 5 MiB. Large field assets are content-hashed and served as same-origin static/CDN resources. MVP does not require Firebase Storage; selecting external object storage would require a separate operational decision.

## API

- `GET /api/scouting/v2/seasons/:seasonKey/active`
- `GET /api/scouting/v2/seasons/:seasonKey/packages/:hash`
- `POST /api/scouting/v2/admin/seasons/:seasonKey/drafts`
- `POST /api/scouting/v2/admin/seasons/:seasonKey/publish`

```json
{"contentHash":"sha256:...","schemaVersion":1,"contentVersion":3,"resources":[{"name":"phases","url":"/api/scouting/v2/seasons/2026/resources/sha256:...","hash":"sha256:..."}]}
```

Publish request: `{"draftId":"draft_3","expectedDraftVersion":7}`. Success: `201 {"contentHash":"sha256:...","status":"published"}`.

Validation: `422 {"error":{"code":"PACKAGE_INVALID","message":"Season package is invalid","retryable":false,"details":[{"path":"components[2].type","code":"unsupported_component"}]}}`
Authentication: `401 {"error":{"code":"AUTHENTICATION_REQUIRED","message":"Log in to continue","retryable":true}}`
Conflict: `409 {"error":{"code":"DRAFT_VERSION_CONFLICT","message":"The draft changed","retryable":false}}`
Retry: `503 {"error":{"code":"PUBLICATION_UNAVAILABLE","message":"Publication was not confirmed","retryable":true,"retryAfterSeconds":10}}`

Clients activate only a completely downloaded, hash-verified compatible package and never replace the package of an active capture.
