# Sim-City Scouting v2 architecture overview

**Status:** Approved through Slice 5, with documented empirical and later-slice deferrals
**Repository commit analyzed:** `ee46a335cf2365376f00530027ff4c01dba651d4`
**Baseline:** `feat/firebase-session-auth` at `b5f62095c95b6a563fd5f1bcadfd5d6f226c8b5d`

## Current-state evidence

The repository already has React, TypeScript, Vite, React Router, Tailwind CSS v4, Node/Express, server-only Firebase Admin access, Firebase session cookies, signed session-bound CSRF protection, startup session restoration, in-place reauthentication, a centralized API client, and passing frontend/backend tests.

The current scouting layer remains form-centric and unsafe as a v2 foundation: context is largely manual, zero/false defaults blur unanswered values, `{team}/{match}` identity omits event and scout uniqueness, generic data routes accept caller-selected paths, LocalStorage is collision-prone, and there is no assignment, IndexedDB outbox, idempotency receipt, authorization evaluator, consensus layer, or PWA shell. Legacy authentication routes also remain mounted. Current authentication returns identity, `debug`, and timing only; it has no membership, capability, scope, authorization-version, recent-authentication, or same-UID reauthentication enforcement.

## Target boundaries

```text
React/Vite PWA
  ├─ IndexedDB: packages, assignments, captures, drafts, outbox, receipts
  ├─ Service worker: versioned shell/static assets only
  └─ same-origin purpose-specific API + CSRF
       ├─ Firebase session and signed CSRF enforcement
       ├─ Firestore-backed capability/scope policy evaluation
       ├─ validation, idempotency, attribution, audit
       └─ Firestore: authoritative v2 records and derived read models
```

The browser never reads or writes Firestore directly. Local lifecycle fields are not canonical server data. The server returns immutable acceptance receipts and canonical revisions; the client does not show synchronized state before receiving one.

## Locked decisions

- Retain the current frontend/backend stack and modern authentication flow.
- Use a clean v2 namespace and contracts with no legacy adapter, migration, or dual write.
- Model logical match records, local captures, observations, revisions, and idempotency keys separately.
- Use one explicit Start Match action, a device-local monotonic elapsed timer, automatic season-package phase progression, and a simple post-match timing/incompleteness flag; advanced timer controls and per-observation confidence prompts are not MVP behavior.
- Preserve the v1 multi-delta running-total concept for high-throughput numeric capture while requiring a new responsive, accessible visual implementation with package-configured deltas and append-oriented corrections; v1 styling and layout are not a design template.
- Define a versioned compiled controlled component registry in the Season Package contract; each observation independently selects an allow-listed kind, method validation owns season-specific selection/configuration, and packages never define layout, code, or new kinds. Registry schema version 1 includes the approved CCR-001 categorical append action, CCR-002 categorized spatial action, and CCR-003 timestamp-derived timer/cycle behavior from the [historical coverage review](../validation/controlled-component-registry-evidence.md#gap-resolutions-and-recommendations).
- Keep observations append-oriented; corrections supersede or void rather than mutate history silently.
- Publish bounded, versioned season/event packages rather than executable remote forms.
- Use IndexedDB and a foreground outbox coordinator; service-worker background sync is optional assistance only.
- Keep contributor pit records distinct and derive team/event profiles.
- Enforce backend capabilities independently of frontend routes or `debug` state.
- Keep Firestore memberships and scoped grants authoritative; custom claims carry at most compact version hints.
- Treat offline capture authority as provisional and reauthorize every synchronization attempt without deleting rejected evidence.
- Keep the same-origin Vercel topology initially, subject to measured operational validation.
- Apply the normative [REST design policy](contracts/README.md#normative-rest-design-policy) to every new or changed endpoint; exceptions require an approved ADR with rationale.

## Pit photos

Remote photos are not part of the MVP architecture. Structured pit records contain no photo and remain fully operational without blob storage. MVP has no dedicated external photo/album link or external-media workflow. Contracts may declare optional `photoIds` as a future compatibility point, but the field must be absent from MVP requests and canonical revisions and creates no current identifier namespace. Upload APIs, local photo queues, image processing, provider selection, Firebase Blaze billing, quotas, and retention are deferred until product value and event-scale usage justify them. Firestore and scouting JSON must never store image bytes.

## Authentication and authorization boundary

[ADR 0013](adrs/0013-authentication-session-and-shared-device-identity.md) records the approved reuse of Firebase identity, Node credential exchange, HttpOnly session cookies, revocation checking, signed CSRF, and exact-Origin enforcement through versioned v2 endpoints. It also records the approved versioned public session, same-UID reauthentication, explicit account switching, and credential-age policy. Ordinary logout clears only the current browser. Scout self-service all-device logout is outside the approved product scope and backlog; Administrator/operations emergency revocation remains a separate incident-response control. The [Identity and Session contract](contracts/identity-session-contract.md) defines the versioned public session and authentication endpoints.

Approved session policy is a six-hour absolute lifetime, a warning 30 minutes before expiry, explicit renewal, and no live-capture inactivity timeout. Approved recent authentication is backend-evaluated from `authenticatedAt` with a maximum age of 15 minutes for contracted privileged operations; it never interrupts ordinary active capture.

[ADR 0014](adrs/0014-capability-scope-and-policy-enforcement.md) records the approved allow-listed `scouting.<resource>.<action>` capability vocabulary; typed global, season, event, team, assignment, and ownership scopes; Firestore membership/grant authority; limited custom-claim hints; authorization-version propagation; separate bounded scoped projection; reusable ordered default-deny evaluator; refined role/revocation behavior; authorization-pending offline capture; bounded redacted audit; and staged security gates. The [Authorization contract](contracts/authorization-contract.md) owns policy evaluation, endpoint enforcement, offline rejection recovery, audit, threats, and tests. The scoped projection composes UX only; browser projections, route guards, custom claims, device identity, role labels, and `debug` never authorize server operations.

### Account lifecycle and recovery boundary

```text
Public registration
  → Firebase identity with zero application privileges
  → Firebase-managed verification email and hosted action
  → Administrator activates verified membership and normally grants Scout
  → backend membership/grant resolution authorizes v2 work

Forgot password
  → thin non-enumerating v2 request endpoint
  → Firebase-managed reset email and hosted action
  → normal login/reauthentication after completion
```

Node initiates Firebase-managed verification and recovery without exposing Firebase ID tokens to React. Registration sends the initial verification message during its credential exchange; a later `POST /api/scouting/v2/auth/email-verification-requests` reacquires a short-lived token through same-UID credential verification. `POST /api/scouting/v2/auth/password-reset-requests` initiates recovery with a generic, non-enumerating response. These operational request resources are not Firestore collections. Firebase owns outbound authentication email and password-reset handling; the application owns CSRF, abuse throttling, generic status, quota monitoring, authorized return-domain configuration, membership verification gates, and audit where required. MVP adds no SMTP service, custom password store, or application-managed reset form.

## Decision hierarchy

[Product requirements](../product/product-requirements.md) define scope. [ADRs](adrs/README.md) record consequential decisions. [Contracts](contracts/README.md) define implementable boundaries. [Method validation](../validation/scouting-method-validation.md) owns empirical capture choices. [Delivery planning](../delivery/delivery-plan.md) sequences implementation without changing those sources of truth.

## Validation still required

Authentication and authorization product/architecture decisions are closed in ADRs 0013–0014 and their contracts. Controlled Component Registry architecture closure is complete: CCR-001 through CCR-003 are approved and incorporated into schema version 1. The remaining [decision-review register](../delivery/delivery-plan.md#decision-review-register) contains only scouting-method and staffing validation. Optional photos remain a later extension governed by approved ADR 0009, not a current approval item. Lead Scouts must complete [scouting-method validation](../validation/scouting-method-validation.md) for season-specific capture methods and staffing. Engineering-owned verification remains open for browser storage and migrations, representative-device performance, Firebase revocation propagation, authorization-cache and audit-volume behavior, Vercel/Firestore limits, environment isolation, indexes, cache/update behavior, observability, and tested backup/export procedures. The [Slice 0 entry criteria](../delivery/delivery-plan.md#slice-0-entry-criteria) distinguish approved product policy from implementation evidence still required before production writes.
