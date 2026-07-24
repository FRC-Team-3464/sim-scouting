# ADR 0001 — V2 migration and cutover

**Status:** Approved by product owner and principal architect

## Context

Legacy writes use caller-selected paths, ambiguous payloads, and collision-prone keys. The modern authentication layer is reusable, but legacy scouting data is not required.

## Decision

V2 uses clean-break APIs and collections. Do not preserve, transform, export, dual-write, shadow-write, or expose legacy scouting data. Do not build a read-only adapter. Reuse the modern Firebase session-cookie, CSRF, route-protection, API-client, and reauthentication mechanisms behind new `/api/scouting/v2/auth/*` endpoints; the existing `/api/auth/*` paths are implementation evidence, not the v2 public contract. After v2 acceptance, remove generic `/api/read` and `/api/write`, both legacy authentication surfaces (`/api/login` and `/api/register`) and superseded `/api/auth/*` routes, legacy UI routes, legacy LocalStorage data, and obsolete `auth/*` data through a separately approved destructive operation. Rollback redeploys code and disables v2 writes; it does not restore legacy-data compatibility.

## Alternatives considered

Read-only adapter, bulk transformation, and parallel writes were rejected because they preserve unreliable identity and semantics while expanding cutover risk.

## Rationale and consequences

This minimizes security and migration complexity and permits correct v2 contracts. Historical analytics are intentionally unavailable. Authentication removal must occur only after v2 login and submission acceptance passes.

## Implications

- **Security:** removes generic paths and password-equivalent hashes.
- **Offline:** old LocalStorage is isolated and cleared with explicit user notice.
- **Migration:** no data mapping; cutover is code/configuration sequencing only.
- **Performance:** no adapter or dual-write overhead.
- **Accessibility:** removal notices and recovery states must be understandable.

## Deferred work and validation

Confirm the exact destructive cleanup runbook, production acceptance window, and rollback feature flag. Revisit only if the product owner introduces a legal or operational retention obligation before deletion.
