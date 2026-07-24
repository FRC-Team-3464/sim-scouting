# Identity and Session contract

| Metadata | Value |
|---|---|
| Status | Proposed |
| Approval scope | Slices 0–8 |
| Primary implementation slice | Slice 1; runtime schemas and fixtures begin in Slice 0 |
| Approved decisions | Public registration with zero privileges; mandatory Firebase-managed verification before membership activation; Firebase-managed password recovery; resource-oriented verification and reset request endpoints; current-browser logout only; separate Administrator/operations emergency revocation |
| Decision references | ADR 0013, ADR 0008 |
| Related contracts | [Authorization](authorization-contract.md), [Offline Synchronization](offline-sync.md), [Roles and Permissions](roles-permissions.md) |

## Purpose and scope

This contract governs Firebase identity, credential exchange, public session data, cookie and CSRF behavior, reauthentication, account switching, revocation, and authentication errors. Authorization capabilities and scopes are owned by the Authorization contract.

## Identity and terminology

- **Authentication:** proves who the user is and whether the session is valid.
- **Reauthentication:** verifies credentials again and replaces the session.
- **Recent authentication:** server-evaluated age since `authenticatedAt`; distinct from remaining session lifetime.
- **Account switch:** intentional transition to a different UID after resolving current local work.
- **Session renewal:** explicit successful reauthentication; no silent rolling extension.

## Data model

```ts
interface PublicSessionV2 {
  schemaVersion: 2;
  user: {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
  };
  roles: string[];
  globalCapabilityHints: string[];
  authorizationVersion: number;
  authenticatedAt: string;
  sessionExpiresAt: string;
  sessionExpirationWarningAt: string;
}
```

All fields are server-authoritative. `roles` and `globalCapabilityHints` are bounded UX hints only. Dynamic scoped grants are absent and are fetched through the Authorization contract. `debug` is not part of the normative v2 session; a transitional implementation may expose it as a separate feature flag that grants nothing.

Maximum encoded response size is 16 KiB. Responses use `Cache-Control: no-store`; the browser retains the current projection in memory and refreshes it after authentication, authorization-version change, visibility/reconnect signals, or authoritative denial.

## Lifecycle and invariants

- Registration creates a Firebase identity but no application authorization and requests one Firebase-managed verification email.
- Verified email is required before an Administrator activates membership. Verification never grants a role by itself.
- Login replaces the session cookie, clears CSRF bindings, and returns a complete session projection.
- Reauthentication for an active capture, retained work, or request replay must match the expected UID.
- A different UID requires account switch; it cannot satisfy same-user reauthentication.
- The session has absolute expiry. The proposed default is six hours with warning 30 minutes before expiry.
- Warning is non-blocking for active capture. Expiry pauses protected network operations and retains local work.
- Logout clears local browser authentication and CSRF cookies. Account-wide sign-out separately revokes Firebase refresh tokens.
- Disabled, deleted, expired, or revoked sessions fail verification and return `401`.

## Trust and ownership boundaries

| Category | Fields |
|---|---|
| Client-authored | Credentials entered directly into the authentication request; expected UID for same-user reauthentication |
| Server-authoritative | Firebase UID/profile claims, session timing, credential-auth time, session validity, authorization version |
| Derived | Warning timestamp and safe role/global-capability projection |
| Local-only | Authentication UI state, pending modal, intended return route |
| Server-internal | ID token, session cookie value, CSRF secret/binding, Firebase error details, policy lookup state |

Firebase ID tokens, passwords, cookies, CSRF secrets, service-account material, and raw Firebase errors are never returned or logged.

## Validation rules

Validate bounded email/password/name inputs, Firebase result shape, verified session claims, timestamp order, expected UID, schema version, and response size. Session-cookie creation must be followed by revocation-checked verification before returning success. Registration membership activation follows the Authorization contract.

## Storage, indexes, and retention

Firebase Authentication owns credentials and session validity. The application stores no password or ID token. Audit records use the common 14-day post-event policy where event-related; account-security events follow the configured governance retention. Browser auth projections are memory-only. UID-owned offline data follows the Offline Synchronization contract.

## Capabilities and security

Authentication endpoints do not accept client roles or capabilities. `POST /reauthenticate` requires the same CSRF protection as login and validates `expectedUid` when supplied. Account-wide revocation requires `scouting.identity.sessions_revoke` or self-service ownership plus recent authentication. Server authorization remains mandatory after authentication.

Cookie requirements are HttpOnly, host-only, path `/`, environment-validated `Secure`, and approved `SameSite`. CSRF uses the signed double-submit token bound to the private session/pre-auth cookie plus exact configured Origin checks. Authentication transitions invalidate the readable CSRF token.

## API

| Method | Endpoint | Authentication | CSRF | Recent authentication | Purpose |
|---|---|:---:|:---:|:---:|---|
| GET | `/api/scouting/v2/auth/csrf` | Optional | No | No | Issue session/pre-auth bound token |
| POST | `/api/scouting/v2/auth/register` | No | Yes | No | Create identity; no automatic application grant |
| POST | `/api/scouting/v2/auth/email-verification-requests` | Yes | Yes | No | Create a Firebase-managed verification-email resend request |
| POST | `/api/scouting/v2/auth/login` | No | Yes | No | Create verified session |
| POST | `/api/scouting/v2/auth/reauthenticate` | Current session preferred | Yes | No | Replace session and enforce expected UID |
| GET | `/api/scouting/v2/auth/session` | Yes | No | No | Return `PublicSessionV2` |
| POST | `/api/scouting/v2/auth/logout` | Optional | Yes | No | Clear this browser session idempotently |
| POST | `/api/scouting/v2/auth/password-reset-requests` | No | Yes | No | Create a Firebase-managed password-reset request with a non-enumerating response |

Both request endpoints model creation of an operational request; they do not require a corresponding Firestore collection or persistent request resource. Firebase owns verification/password-reset email delivery and the hosted action that applies the code. The application does not send mail, store passwords, or implement a custom reset form. Verification resend and reset initiation use per-IP/account throttles and safe quota errors. V2 clients use only the versioned paths above. `/api/auth/*` is not a compatibility alias; it remains temporarily available only to the current application until coordinated v2 cutover and retirement.

### Email-verification request

Registration sends the initial verification email while Node still holds the short-lived Firebase ID token returned by the successful credential exchange. A later resend uses:

```http
POST /api/scouting/v2/auth/email-verification-requests
```

```json
{
  "password": "current-password",
  "locale": "en-US"
}
```

`password` is required because Firebase's `VERIFY_EMAIL` operation requires a current ID token, while the browser has only an HttpOnly session cookie. `locale` is optional and must be selected from an allow-list. The request must not accept a UID, email address, role, capability, verification status, Firebase token, or arbitrary return URL from the client.

The backend verifies the session and CSRF binding, confirms that the account is not already verified, applies per-account and per-IP throttles, exchanges the current email and supplied password for a short-lived Firebase ID token, verifies that the returned UID equals the session UID, asks Firebase to send the verification email, and discards all exchange credentials and tokens. It must never replace the active session as a side effect of this resend.

An accepted request returns `202`:

```json
{
  "data": {
    "status": "accepted",
    "emailVerificationStatus": "pending",
    "nextRequestAt": "2026-07-23T18:30:00.000Z"
  }
}
```

An already-verified account returns `200` with `status: "already_verified"`. Authentication, UID-mismatch, rate-limit, quota, and service failures use the common error envelope without exposing raw Firebase errors.

### Password-reset request

```http
POST /api/scouting/v2/auth/password-reset-requests
```

```json
{
  "email": "scout@example.org",
  "locale": "en-US"
}
```

The backend validates the bounded input, applies per-IP and normalized-account throttles, and asks Firebase to send and host the password-reset action. To prevent account enumeration, syntactically valid requests return the same generic `202` response whether or not the account exists:

```json
{
  "data": {
    "status": "accepted"
  }
}
```

`locale` is optional and allow-listed. The endpoint does not accept an arbitrary return URL and does not establish, replace, or revoke a session.

## Errors

| HTTP | Code | Retryable | Client action |
|---:|---|:---:|---|
| 400 | `AUTHENTICATION_INPUT_INVALID` | No | Correct safe input fields |
| 401 | `AUTHENTICATION_REQUIRED` | Yes | Start login/reauthentication |
| 401 | `AUTHENTICATION_FAILED` | No | Show generic credential failure |
| 409 | `REAUTHENTICATION_UID_MISMATCH` | No | Return to explicit account-switch workflow |
| 403 | `RECENT_AUTHENTICATION_REQUIRED` | Yes | Reauthenticate same UID, then retry once |
| 429 | `AUTHENTICATION_RATE_LIMITED` | Yes | Wait for server guidance |
| 503 | `AUTHENTICATION_EMAIL_QUOTA_UNAVAILABLE` | Yes | Keep account/work intact; retry after bounded guidance |
| 503 | `AUTHENTICATION_UNAVAILABLE` | Yes | Preserve local work and retry later |

Authentication endpoints migrate to the common error envelope. Compatibility parsing may temporarily accept legacy `{ "message": string }` during the coordinated client/server rollout.

## Offline and reconciliation

No server authentication succeeds offline. Previously opened capture may continue locally against its UID partition and cached assignment, labeled authorization pending. Expiry moves upload intents to `auth_required`. Reauthentication resumes only the same UID. Account switching clears in-memory session/capability state and cannot reveal or upload another UID's work. Disablement/revocation discovered on reconnect preserves but quarantines unsynchronized evidence.

## Shared-device behavior

Before logout or account switch, application code inventories current-UID unsynchronized work and applies retain/discard/cancel rules. Automatic expiry always retains. A successful different-UID login is not allowed through a same-user modal. Lost-device response uses account-wide revocation; local origin data may remain until browser/site data is cleared and the UI must disclose that limitation.

Ordinary logout affects only the current browser. Self-service all-device logout is not part of this API contract or the planned product backlog. Adding it requires a new approved contract change rather than being inferred from the emergency control. Administrator/operations suspension and emergency Firebase refresh-token revocation remain required through the operational security procedure; revocation cannot erase IndexedDB data already present on a lost device.

## Audit, observability, performance, and accessibility

Audit successful login/logout, failed-login category/count, reauthentication, UID mismatch, session revocation, account disablement, and sensitive freshness challenge with actor/target, outcome, request ID, server time, and safe reason. Never log credentials or session/CSRF material. Measure verification latency, failures by safe category, revocation propagation, and session-contract size. Reauthentication traps/restores focus, announces errors, preserves active work, and avoids countdown noise.

## Testable acceptance criteria

1. Browser JavaScript never receives an ID token or reads the session cookie.
2. Missing, expired, revoked, disabled, and deleted sessions deny protected APIs.
3. Auth transitions rotate CSRF binding and wrong origins/tokens fail.
4. Session schema validation rejects missing, oversized, or invalid fields.
5. Same-user reauthentication cannot complete with a different UID.
6. Expiry and API outage remain distinguishable and preserve work.
7. Warning does not interrupt an active capture.
8. `debug`, roles, and session hints do not authorize backend operations.
9. Registration grants no role, capability, team membership, or event scope.
10. Unverified users cannot receive active membership, and resend requires same-UID credential verification and throttling.
11. Password-reset responses do not reveal whether an account exists; Firebase sends and handles the reset action.
12. Creating either email-action request does not require or imply a persistent Firestore request record.

## Deferred decisions

Product owner must still approve six-hour duration/30-minute warning, the proposed 15-minute recent-authentication window, and idle-timeout policy. Engineering must validate Firebase authorized domains, templates, action return URLs, resend/reset throttles, no-cost quota monitoring, and the administrator/operations emergency-revocation procedure before Slice 1 acceptance. Self-service all-device logout is explicitly out of scope.
