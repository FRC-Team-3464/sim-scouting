# Architecture contracts

**Status:** Approved for Slices 0–3; later-slice and empirical deferrals remain

## Contract map

| Contract | Kind | Governs |
|---|---|---|
| [Match Scouting](match-scouting.md) | Domain | Match records, observations, revisions, and APIs |
| [Pit Scouting](pit-scouting.md) | Domain | Pit contributions, claims, profiles, and APIs |
| [Assignment Model](assignment-model.md) | Domain | Coverage authority, lifecycle, and conflicts |
| [Season Package](season-package.md) | Domain | Versioned game configuration and publication |
| [Event Package](event-package.md) | Domain | TBA event projection, overrides, and offline versions |
| [Roles and Permissions](roles-permissions.md) | Domain | Memberships, capabilities, and enforcement |
| [Identity and Session](identity-session-contract.md) | Protocol | Firebase identity, sessions, CSRF, reauthentication, and account switching |
| [Authorization](authorization-contract.md) | Protocol | Capability vocabulary, scopes, policy evaluation, endpoint enforcement, and audit |
| [Submission Integrity](submission-integrity.md) | Protocol | Canonical hashing, chunks, idempotency, and receipts |
| [Offline Synchronization](offline-sync.md) | Protocol | IndexedDB, outbox, shared devices, PWA, and reconciliation |

## Required contract structure

Contracts use: metadata; purpose/scope; identity; data model; lifecycle/invariants; trust boundaries; validation; storage/indexes/retention; capabilities/security; API table; examples where useful; error table; offline behavior; audit/observability/performance/accessibility; and deferred decisions. A section may state `Not applicable`, but approved rules may not be omitted silently.

## Status vocabulary

- **Proposed:** requires the named approver.
- **Approved:** normative for its approval scope.
- **Approved with amendments:** normative with recorded deviations from the initial recommendation.
- **Deferred:** intentionally owned by validation or a later slice.

Approval does not authorize implementation. ADRs control consequential decisions; a contract may add implementable detail but cannot contradict an accepted ADR.

## Common terminology and trust categories

Use `state` for a domain lifecycle and `status` for health/result descriptions. Use these ownership categories consistently:

| Category | Meaning |
|---|---|
| Client-authored | Supplied by client and accepted only after validation |
| Server-authoritative | Determined or confirmed by backend authority |
| Derived | Recalculable from accepted/authoritative inputs |
| Local-only | Device state that is never canonical server data |
| Server-internal | Operational state not exposed as domain data |

`Lead Scout` and `Administrator` are distinct. `debug`, route visibility, cached roles, and device identity never authorize an operation.

## Common API conventions

### Normative REST design policy

Every new or changed HTTP endpoint **must** follow established REST and HTTP best practices unless an approved ADR records a specific exception and its rationale. The API contract review is mandatory before implementation. Consistency with an existing endpoint does not justify carrying a legacy violation into v2.

- **Resources and paths:** Model domain resources rather than remote procedure calls. Use lowercase, plural nouns and stable hierarchical relationships; use hyphens within multiword path segments. Do not put actions or transport details in resource names when creation, retrieval, replacement, partial update, or deletion can express the operation. Avoid deeply nested paths. Put identifiers in path parameters, filters in query parameters, and never place credentials, tokens, secrets, or sensitive scouting content in URLs.
- **Methods and safety:** Use HTTP methods according to their semantics: `GET` and `HEAD` are safe reads; `POST` creates a subordinate resource or starts an explicitly modeled operation; `PUT` replaces a known resource and is idempotent; `PATCH` applies a bounded partial change; and `DELETE` removes or retires a resource idempotently. A `GET` must never mutate server state. Unsupported methods return `405` with `Allow`.
- **Status codes:** Return the most specific standard status code and keep it consistent across contracts. Typical creation returns `201` with `Location`; asynchronous acceptance returns `202`; successful no-body operations return `204`; validation returns `400` or `422` as contractually chosen; authentication returns `401`; authorization returns `403`; absence returns `404`; state/version/idempotency conflict returns `409`; precondition failure returns `412`; payload excess returns `413`; media mismatch returns `415`; throttling returns `429`; and dependency/unavailability failures use appropriate `5xx`. Do not return `200` for a failed operation.
- **Representations:** Requests and responses use documented, versioned schemas with one stable JSON naming convention, explicit required/optional/null behavior, bounded strings/arrays/nesting, and rejection of unexpected security-sensitive fields. Successful responses use a consistent `data` representation, with documented `meta` and `links` only where needed. Errors use the common error envelope below. Contracts include representative request, success, and error examples when behavior is not obvious.
- **Headers and content negotiation:** JSON requests send `Content-Type: application/json`; clients advertise supported responses with `Accept: application/json`. APIs return the correct `Content-Type` and `X-Content-Type-Options: nosniff`. Responses carry the safe request/correlation ID. Authentication cookies and CSRF headers follow the Identity and Session contract. Cache behavior is explicit: identity, authorization, private scouting, audit, and mutation responses use `Cache-Control: no-store`; cacheable public/package resources define validators and bounded freshness. `Retry-After`, `Location`, `ETag`, and conditional-request headers are used when their HTTP semantics apply. CORS is not enabled by default for the same-origin API.
- **Security and authority:** TLS is mandatory outside local development. The server authenticates, authorizes, validates scope/ownership/state, and applies CSRF/Origin protection independently of frontend behavior. Input is allow-listed, size-limited, and parsed only for supported media types. Output and logs are minimized and redacted. Endpoints prevent enumeration where required, apply bounded rate limits and abuse controls, and never expose Firebase errors, stack traces, internal paths, secrets, cookies, tokens, or authorization internals.
- **Concurrency, retries, and idempotency:** Contracts state whether an operation is safe and/or idempotent. Retried mutations follow Submission Integrity, preserve immutable request content, and distinguish replay from conflict. Mutable versioned resources use explicit expected versions or HTTP preconditions. Clients retry only approved transient failures with bounded backoff and server guidance.
- **Collections:** Collection reads are bounded, filterable only through allow-listed parameters, deterministically ordered, and cursor-paginated. Responses do not leak records outside the caller's authorized scope. Bulk endpoints define per-item outcomes, atomicity, size limits, and retry behavior.
- **Evolution and documentation:** Breaking behavior requires a new approved contract/version or coordinated cutover; silent semantic changes are prohibited. Each endpoint documents method, full path, purpose, authentication, CSRF, capability/scope, freshness, request and response schemas, relevant headers, status/error cases, idempotency, caching, offline behavior, rate limits, audit/observability, and retirement policy where applicable.
- **Verification:** Contract tests must verify method/path semantics, schema limits, media types, headers, status and error mapping, authentication, CSRF, authorization, rate limiting, idempotency/preconditions, caching, redaction, and direct-API denial. Security review includes common API threats and does not treat REST-shaped naming as a security control.

Where these rules admit more than one valid REST design, use the design that best matches domain meaning, standard HTTP semantics, existing approved v2 conventions, client usability, and security. Record consequential or irreversible exceptions in an ADR.

- All v2 contract paths are full same-origin paths beneath `/api/scouting/v2`, including `/api/scouting/v2/auth/*`. Existing `/api/auth/*` routes are transitional implementation evidence and are not aliases in the v2 contract.
- Every protected mutation requires the Firebase session, signed CSRF protection, current membership, and endpoint capability. An explicitly public authentication mutation may omit session, membership, and capability only where the Identity and Session contract says so; it still requires the documented pre-auth CSRF/Origin controls, validation, throttling, and enumeration resistance.
- JSON uses UTF-8. Domain timestamps use UTC RFC 3339; canonical timestamps follow Submission Integrity.
- Error envelopes are `{ "error": { "code", "message", "retryable", "details?" } }` and never expose secrets, tokens, internal paths, or stack traces.
- Cursor pagination returns bounded pages and opaque cursors. Request bodies, pages, and resources have explicit limits.
- Client retry requires `retryable: true`, stable immutable content, and the same idempotency key.
- Only a server receipt permits synchronized state.

## Common operational contract

Every API request receives a safe request ID propagated through logs, jobs, receipts, and audit events. Logs record route template, result category, latency, bounded identifiers, and a UID hash only where necessary. They exclude cookies, tokens, CSRF material, notes, observations, package contents, and full payload hashes.

Health checks distinguish liveness from dependency readiness. Metrics cover authentication/authorization failures, latency/error categories, chunk/finalization results, receipt replay/conflict, package freshness/import failure, job backlog, backup age, and restore-test status. Alerts have owners and event/non-event severity.

Audit events for privileged changes include actor, capability, action, target, reason, prior/new version or state, request ID, and server time. Engineering/operations owns backups and restore tests. During events, RPO is at most 30 minutes and RTO at most one hour. Event records, receipts, and audit history retain through 14 days after the configured event end; legal hold or active incident may suspend deletion.

Exports are asynchronous, encrypted in transit, short-lived, requester-bound, and audited. Lead Scouts, Strategists, and Administrators may request identifiable scout-level exports; Scouts may not. Authorization is rechecked at request and download. Restore/export operations require explicit environment and target confirmation.

## Cross-contract invariants

1. Browser code never accesses Firestore directly.
2. Every accepted record remains attributable.
3. Package hashes pin the exact rules used for capture.
4. Assignment conflicts preserve evidence and never silently reattribute it.
5. Submission Integrity owns hashes, idempotency, chunks, and receipts.
6. Offline Synchronization owns local lifecycle; local state is not canonical.
7. Pit MVP works with zero photos.
8. Empirical capture choices remain configurable until validation.
9. Identity and Session owns authentication; Authorization owns permission decisions.
10. Offline capture authority is provisional until the server reauthorizes synchronization.
11. The bounded identity/session response excludes dynamic scoped grants; the separately fetched authorization projection composes UX but never authorizes an API.
12. Every protected endpoint has one runtime-validated policy declaration and passes through the reusable ordered default-deny evaluator; missing or invalid declarations fail closed.
