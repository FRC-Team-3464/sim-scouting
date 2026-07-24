# ADR 0014 — Capability, scope, and policy enforcement

**Status:** Proposed for product-owner and principal-architect approval

## Context

Authentication currently supplies verified Firebase claims but v2 requires event-, assignment-, ownership-, season-, and global authorization. Dynamic event grants do not fit safely in custom claims, frontend route guards are not enforcement, and cached offline authority may be stale when queued data reaches the server.

## Decision

Use default-deny, backend-enforced capabilities with typed scopes. Firestore membership and grant records are the canonical source of roles, capabilities, denies, and event/season/team scopes. Roles are predefined UX and governance bundles: Scout, Lead Scout, Strategist, and Administrator. Pit capture, manual capture, exports, and other variants remain capabilities rather than additional roles.

Firebase custom claims may contain only compact, slowly changing hints such as `authorizationVersion` and `debug`. They never contain dynamic event grants and never independently authorize an operation. Every protected endpoint evaluates current server authority. Bounded caches may be used only with versioned entries and default denial on load failure; sensitive mutations, synchronization acceptance, and version mismatch force authoritative resolution.

Capability names use the `scouting.<resource>.<action>` convention. A grant combines one capability with one typed scope: `global`, `season`, `event`, `team`, `assignment`, or `own`. Deny overrides allow. Scope never comes from a client-provided UID, role, assignment owner, or hidden UI state.

The base session exposes identity, role labels, global UX hints, and authorization version. Dynamic scoped grants use a separately fetched authorization projection. Browser projections are non-authoritative. Backend evaluation order is authentication, CSRF for mutation, current authorization, capability, scope, ownership/assignment, resource state, recent authentication, then audit.

Offline permission is separated into local capture, local queue, attempted submission, and server acceptance. Cached authority may permit clearly marked local capture against a downloaded assignment, but synchronization always reauthorizes. Permission removal, disablement, or stale grants never delete queued evidence: same-UID work moves to an authorization-required/rejected state for later retry, Lead Scout review, or audited recovery. Another UID cannot upload or read it.

## Alternatives considered

Role-name checks are inflexible and encourage privilege coupling. Custom-claim-only authorization has propagation, size, and event-scope problems. Frontend-only checks and assignment state supplied by the browser are insecure. Deleting rejected offline work sacrifices valuable evidence and weakens auditability.

## Rationale and consequences

Central policy evaluation provides least privilege, explicit scope, and testable denial behavior. Server lookups and cache invalidation add latency and operational requirements. Separate session and scoped-grant projections keep the session bounded while supporting events.

## Implications

- **Security:** all unlisted operations deny; `debug`, roles, routes, and cached grants are insufficient authority.
- **Offline:** capture may continue as authorization-pending, but only current server policy accepts it.
- **Audit:** policy changes and privileged decisions record actor, target, scope, reason, versions, request ID, and time.
- **Performance:** grants are bounded and indexed; caches require version and TTL metrics.
- **Accessibility:** denials distinguish sign-in, permission, scope, assignment, freshness, and recovery without exposing protected data.

## Deferred work and validation

Product owner must approve the normalized vocabulary, separate scoped-grant projection, and authorization-pending offline behavior. Engineering must establish cache duration from measured load, implement version invalidation, and test every endpoint policy row, role change, stale version, outage, and recovery path before production writes.
