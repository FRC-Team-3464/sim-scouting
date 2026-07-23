# Sim-City Scouting v2 architecture overview

**Status:** Proposed canonical architecture summary
**Repository commit analyzed:** `c7ed1c9abba7a82c0b7da6366a0308099222c9ba`
**Baseline:** `feat/firebase-session-auth` at `b5f62095c95b6a563fd5f1bcadfd5d6f226c8b5d`

## Current-state evidence

The repository already has React, TypeScript, Vite, React Router, Tailwind CSS v4, Node/Express, server-only Firebase Admin access, Firebase session cookies, signed session-bound CSRF protection, startup session restoration, in-place reauthentication, a centralized API client, and passing frontend/backend tests.

The current scouting layer remains form-centric and unsafe as a v2 foundation: context is largely manual, zero/false defaults blur unanswered values, `{team}/{match}` identity omits event and scout uniqueness, generic data routes accept caller-selected paths, LocalStorage is collision-prone, and there is no assignment, IndexedDB outbox, idempotency receipt, role/capability model, consensus layer, or PWA shell. Legacy authentication routes also remain mounted.

## Target boundaries

```text
React/Vite PWA
  ├─ IndexedDB: packages, assignments, captures, drafts, outbox, receipts
  ├─ Service worker: versioned shell/static assets only
  └─ same-origin purpose-specific API + CSRF
       ├─ Firebase session/capability enforcement
       ├─ validation, idempotency, attribution, audit
       └─ Firestore: authoritative v2 records and derived read models
```

The browser never reads or writes Firestore directly. Local lifecycle fields are not canonical server data. The server returns immutable acceptance receipts and canonical revisions; the client does not show synchronized state before receiving one.

## Locked decisions

- Retain the current frontend/backend stack and modern authentication flow.
- Use a clean v2 namespace and contracts with no legacy adapter, migration, or dual write.
- Model logical match records, local captures, observations, revisions, and idempotency keys separately.
- Keep observations append-oriented; corrections supersede or void rather than mutate history silently.
- Publish bounded, versioned season/event packages rather than executable remote forms.
- Use IndexedDB and a foreground outbox coordinator; service-worker background sync is optional assistance only.
- Keep contributor pit records distinct and derive team/event profiles.
- Enforce backend capabilities independently of frontend routes or `debug` state.
- Keep the same-origin Vercel topology initially, subject to measured operational validation.

## Pit photos

Remote photos are not part of the MVP architecture. Structured pit records contain no required photo and remain fully operational without blob storage. Optional photo references may be reserved, but upload APIs, local photo queues, image processing, provider selection, Firebase Blaze billing, quotas, and retention are deferred until product value and event-scale usage justify them. Firestore and scouting JSON must never store image bytes.

## Decision hierarchy

[Product requirements](../product/product-requirements.md) define scope. [ADRs](adrs/README.md) record consequential decisions. [Contracts](contracts/README.md) define implementable boundaries. [Method validation](../validation/scouting-method-validation.md) owns empirical capture choices. [Delivery planning](../delivery/delivery-plan.md) sequences implementation without changing those sources of truth.

## Validation still required

The product owner must approve capabilities, shared-device retention, package governance, source precedence, supported devices, and operational recovery requirements. Scouting leads must validate capture methods and staffing. Engineering must verify actual browser storage behavior, device performance, Vercel/Firestore limits, environment isolation, indexes, observability, and backup/export procedures before enabling production writes.
