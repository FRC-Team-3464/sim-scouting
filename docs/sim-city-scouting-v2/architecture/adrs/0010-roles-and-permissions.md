# ADR 0010 — Roles and permissions

**Status:** Proposed

## Context

Authentication exists, but `debug` and frontend visibility are not authorization.

## Decision

Use backend-enforced capabilities sourced from server-controlled user/team membership records and optionally summarized in verified custom claims. Initial capabilities cover own assignments/submissions, pit contributions, cross-scout reads, strategy reads, assignment management, event import/override, season publication, correction/void, conflict resolution, user/role management, export, and audit. Middleware checks capabilities per purpose-specific endpoint. Firestore remains inaccessible to browsers.

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

Product owner must approve role-to-capability mapping and personal-record visibility. Revisit if multi-team tenancy is introduced.
