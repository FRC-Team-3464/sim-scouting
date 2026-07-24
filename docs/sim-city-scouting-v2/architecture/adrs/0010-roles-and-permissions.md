# ADR 0010 — Roles and permissions

**Status:** Approved with amendments by product owner

## Context

Authentication exists, but `debug` and frontend visibility are not authorization.

## Decision

Use backend-enforced capabilities sourced from server-controlled user/team membership records. User-facing roles are Scout, Lead Scout, Strategist, and Administrator; match and pit capture are capabilities rather than separate security roles. A Scout writes only through an active assignment and cannot read peer records, live cross-scout analytics, leaderboards, or derived team summaries during qualification collection. A Lead Scout manages event assignments, overrides, conflicts, and audited corrections but cannot publish packages or change technical configuration. A Strategist reads finalized cross-scout evidence and analytics but cannot mutate scouting data. An Administrator is technical: it manages memberships, package governance, retention, exports, audit, and recovery; it may routinely read scouting records but cannot operate assignments or modify scouting records by default. Middleware checks capabilities per purpose-specific endpoint. Firestore remains inaccessible to browsers and `debug` grants nothing. ADR 0014 records the approved capability vocabulary, typed scopes, Firestore authority, limited claims, propagation, separate projection, ordered evaluator, refined role/revocation behavior, authorization-pending offline capture, bounded audit, and staged test gates.

## Alternatives considered

Scattered role-name checks are brittle. `debug` is unsafe. Frontend-only gating is not enforcement.

## Rationale and consequences

Capabilities allow role evolution and least privilege. Claim changes require session refresh/revocation and membership lookups may add latency.

## Implications

- **Security:** deny by default and audit privileged mutations.
- **Offline:** cached permissions are hints; server reauthorizes sync.
- **Migration:** existing users receive explicit baseline membership.
- **Performance:** cache bounded permission summaries.
- **Accessibility:** denied actions provide clear, non-secret explanations.

## Deferred work and validation

No product-owner or principal-architect approval remains open for ADR 0014. Engineering must implement the approved qualification-collection release state and pass the staged Authorization-contract gates. Revisit if multi-team tenancy is introduced.
