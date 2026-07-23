# ADR 0012 — Deployment and operational model

**Status:** Proposed

## Context

The application currently deploys a same-origin Vite SPA and Express Vercel Function.

## Decision

Retain same-origin Vercel for initial v2. Keep synchronous APIs bounded and move long imports, consensus, and cleanup to resumable jobs or external workflow execution if they exceed request lifetimes. Keep scouting JSON below a conservative 1 MiB envelope. Add structured request IDs, safe error categories, audit events, health/readiness checks, backup/export procedures, environment isolation, CI gates, and deployment smoke tests. Service-worker assets use content hashes and an explicit update lifecycle. Optional image processing and object-storage uploads remain outside MVP and require a later operational decision.

## Alternatives considered

A platform migration is premature. Running long jobs inside user requests risks timeouts. Cross-origin API hosting complicates cookies.

## Rationale and consequences

The current topology fits bounded APIs and reuses proven authentication. Operational maturity and job infrastructure are additional work.

## Implications

- **Security:** secrets remain server-side; staging/production isolation is mandatory.
- **Offline:** same-origin cookies and static shell simplify reconnection.
- **Migration:** cutover uses flags and coordinated deploys.
- **Performance:** region should be near Firestore; monitor cold starts and payloads.
- **Accessibility:** updates never discard active captures and operational errors remain actionable.

## Deferred work and validation

Verify actual Vercel plan, Fluid Compute settings, regions, quotas, WAF needs, and disaster recovery. Revisit if measured limits or costs threaten event reliability.
