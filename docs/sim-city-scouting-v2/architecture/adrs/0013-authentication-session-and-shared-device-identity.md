# ADR 0013 — Authentication, session, and shared-device identity

**Status:** Proposed for product-owner and principal-architect approval

**Approved decisions:** Public registration with zero application privileges; Firebase-managed mandatory email verification before membership activation; Firebase-managed password recovery with a thin application request/status surface; `email-verification-requests` and `password-reset-requests` resource naming; ordinary current-browser logout with no Scout self-service all-device logout; separate Administrator/operations emergency revocation

## Context

The `feat/firebase-session-auth` baseline already provides Firebase email/password authentication through Node, HttpOnly Firebase session cookies, revocation checking, signed session-bound CSRF, startup restoration, expiration warnings, and in-place reauthentication. V2 adds offline work, shared tablets, current-UID ownership, and sensitive administrative actions. The present reauthentication flow can establish a different UID, and warning-time freshness is not a credential-age guarantee.

## Decision

Reuse Firebase Authentication, the server-side password-to-ID-token exchange, Firebase session cookies, revocation-checked verification, signed double-submit CSRF, exact-Origin checks, and the Node-only API boundary. Expose those mechanisms to v2 clients only through `/api/scouting/v2/auth/*`; the current `/api/auth/*` routes are not part of the v2 public contract and are retired after coordinated cutover. Firebase ID tokens remain server-side and are never returned to application JavaScript.

The public session becomes the versioned Identity and Session contract. It distinguishes absolute session expiry from `authenticatedAt`, the last server-verified credential authentication time. Reauthentication for retained work, an active capture, or an automatic request replay must return the same UID. A different account requires an explicit account-switch workflow that first resolves the current UID's unsynchronized work.

The current six-hour absolute session and 30-minute warning remain the proposed default pending product-owner confirmation. There is no automatic idle timeout for live capture. Session renewal is explicit reauthentication; a warning never interrupts an active capture. Recent authentication is operation-specific and proposed as at most 15 minutes old for privileged mutations. Server policy, not `FreshSessionRoute`, decides freshness.

Explicit logout clears the current browser's session and CSRF cookies but does not claim account-wide Firebase revocation. This is the only scout-facing logout operation in the approved product scope. The product does not provide a self-service “sign out all devices” endpoint or UX. Adding one later requires a new product and architecture decision based on demonstrated need; it is not an implicit backlog item. Administrator/operations account suspension and emergency Firebase session revocation remain required incident-response controls for a lost device or compromised account and are not presented as ordinary Scout logout. Shared-device retain/discard/cancel and automatic-expiry retention remain governed by ADR 0008; session cleanup must invoke that local ownership workflow before changing accounts.

Public registration creates a Firebase identity with zero application capability, role, team membership, or event scope. Firebase-managed email verification is mandatory before an Administrator activates membership and normally assigns Scout. Elevated roles remain explicit and audited. Firebase owns password-reset email delivery and its hosted action flow; the application exposes only versioned, non-enumerating request boundaries and does not add SMTP, custom password storage, or an application-managed reset form. The approved creation endpoints are `POST /api/scouting/v2/auth/email-verification-requests` and `POST /api/scouting/v2/auth/password-reset-requests`; these operational resources do not imply persistent Firestore request records. Registration uses its short-lived Firebase ID token for the initial verification email. A later verification resend reacquires a short-lived ID token through same-UID credential verification because the HttpOnly session cookie cannot be converted back into an ID token. Verification resend and recovery initiation require abuse throttling and quota monitoring.

## Alternatives considered

Browser Firebase SDK tokens would expand credential exposure and bypass the Node boundary. Treating any login as reauthentication risks replaying one Scout's work as another. An idle timeout during live capture risks avoidable interruption and data loss. Using the expiration-warning timestamp as proof of recent authentication does not establish credential age.

## Rationale and consequences

The established security mechanisms remain testable and appropriate, while explicit UID continuity closes a shared-device confused-deputy risk. Sensitive workflows need a separate recent-authentication check. Omitting self-service all-device logout avoids a low-value product workflow while retaining operational revocation for security incidents. The frontend session schema and API client require compatible extensions during implementation.

## Implications

- **Security:** HttpOnly cookies, revocation checking, CSRF, same-UID replay, and server freshness checks remain mandatory.
- **Offline:** session expiry pauses synchronization but never deletes owner-partitioned work.
- **Privacy:** account switching clears session/capability remnants and cannot expose another UID's local data.
- **Operations:** ordinary logout remains browser-local; lost devices use the documented Administrator/operations suspension and revocation procedure rather than a Scout self-service MVP feature.
- **Accessibility:** warnings are non-blocking, and reauthentication preserves active context and focus recovery.

## Deferred work and validation

Product owner must still decide session duration, warning/idle policy, and the recent-authentication window. Engineering must test browser cookie behavior, clock skew, Firebase email-action authorized domains and no-cost quotas, administrator/operations revocation propagation, PWA restart, same-UID enforcement, account switching, and session expiry with unsynchronized work. Self-service all-device logout is out of scope; reconsideration requires a new approved product and architecture decision.
