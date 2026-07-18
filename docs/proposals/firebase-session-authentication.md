# Proposal: Backend-Managed Firebase Session Authentication

## Status

- **State:** Proposed
- **Target branch:** `feat/firebase-session-auth`
- **Scope:** Authentication and session management only
- **Primary constraint:** The React application communicates only with the Node/Express API. The Node API owns all Firebase interactions.

## 1. Summary

Replace the application's custom SHA-256 password-verification flow and forgeable identity cookies with Firebase Authentication and Firebase-backed HTTP session cookies.

The proposed system uses this trust boundary:

```text
React application
    |
    | HTTPS requests to the application API
    | No Firebase SDK, credentials, or tokens
    v
Node/Express API
    |
    | Firebase Authentication REST API
    | Firebase Admin SDK
    v
Firebase Authentication and Cloud Firestore
```

During login, Node sends the submitted credentials to Firebase Authentication. Firebase returns an ID token after successful password verification. Node exchanges that ID token for a Firebase session cookie and sends it to the browser as an `HttpOnly` cookie. Subsequent API calls carry the cookie automatically, and Node verifies it with Firebase Admin before executing protected operations.

This proposal does not introduce a second authentication database. Firebase remains the source of truth for users, passwords, tokens, session validity, and revocation.

## 2. Goals

- Make Firebase Authentication the only password-verification system.
- Keep all Firebase communication in the Node backend.
- Prevent React code from reading authentication credentials or Firebase tokens.
- Authenticate and identify every protected API request on the server.
- Derive scouting attribution from verified identity instead of browser-controlled values.
- Support a clean seasonal reset in which the small development user base may be recreated.
- Remove obsolete password-derived hashes from Firestore as part of the migration.
- Provide explicit login, registration, logout, current-session, and CSRF API contracts.
- Support local development and the production deployment model.
- Keep authentication code understandable to high-school student maintainers through small modules, descriptive names, and comprehensive function/class documentation.

## 3. Non-goals

The following changes are valuable but are not part of this authentication proposal:

- Converting the backend from JavaScript to TypeScript.
- Redesigning the complete Firestore scouting schema.
- Solving match-document collisions or offline synchronization.
- Replacing the generic `/read` and `/write` Firestore endpoints with domain-specific endpoints.
- Adding Google, Microsoft, or other federated login providers.
- Moving the frontend and backend into separate repositories.

The generic `/read` and `/write` endpoints will be protected by session authentication but retained during this change. Replacing them with purpose-specific scouting routes is a separate follow-up because authentication alone does not provide complete authorization.

## 4. Current implementation

### 4.1 Registration

The React application sends name, email, and password to `POST /api/register`. Node uses Firebase Admin to create a Firebase Authentication user.

After Node responds, React independently computes unsalted SHA-256 of the password and sends the result through the generic `/api/write` endpoint:

```text
auth/{displayName}
    hashed: SHA-256(password)
```

React then creates a JavaScript-readable `user` cookie.

### 4.2 Login

The React application sends email and password to `POST /api/login`. Node:

1. looks up the Firebase user by email;
2. reads `auth/{displayName}` from Firestore;
3. calculates SHA-256 of the submitted password;
4. compares the two hash strings;
5. creates a Firebase custom token;
6. returns the token and user data to React.

React does not exchange or use the custom token. Instead, it creates JavaScript-readable `user` and `uid` cookies.

### 4.3 Protected behavior

Pages consider a user authenticated when the `user` cookie exists. API `/read` and `/write` operations do not verify Firebase identity. The debug capability is determined in the browser using a publicly returned UID list.

## 5. Problems with the current design

### 5.1 Password handling

- SHA-256 is fast and unsalted and is not suitable for password storage.
- The application duplicates password verification already provided by Firebase.
- Password-derived hashes are stored in a collection accessible through generic API operations.
- Registration is not atomic: Firebase user creation can succeed while the Firestore hash write fails.

### 5.2 Session handling

- The `user` and `uid` cookies can be created or modified by browser users.
- Cookies do not prove that Firebase authenticated the browser.
- The Firebase custom token returned by login is unused.
- API calls do not contain a verified user identity.
- Submitted scout names can be forged because the server trusts request data.

### 5.3 Authorization

- The debug UID list is public and evaluated only by frontend code.
- Generic Firestore paths are accepted from callers.
- Firestore Admin operations bypass Firestore Security Rules.
- CORS limits cooperative browsers but does not authenticate API requests.

## 6. Proposed architecture

### 6.1 Authentication mechanism

Node will use two Firebase interfaces:

1. **Firebase Authentication REST API** to verify email/password credentials and obtain a Firebase ID token.
2. **Firebase Admin SDK** to create and verify Firebase session cookies and manage user profiles.

The Admin SDK cannot verify a user's email/password combination. The REST API is therefore required while maintaining the constraint that React must not communicate with Firebase.

### 6.2 Session mechanism

After successful authentication:

```js
const sessionCookie = await admin.auth().createSessionCookie(idToken, {
    expiresIn: config.sessionDurationMinutes * 60 * 1000,
});
```

Node returns the value using a cookie similar to:

```http
Set-Cookie: session=<firebase-session>; HttpOnly; Secure; SameSite=Lax; Path=/
```

In local development, `Secure` is disabled. The selected same-origin production architecture permits `SameSite=Lax`; production enables `Secure`.

Sessions have a six-hour absolute lifetime. Activity does not extend the Firebase session cookie. Six hours balances competition usability with limiting how long a stolen or unattended session remains useful.

### 6.3 Request authentication

Protected routes use shared Express middleware:

```js
async function requireAuthentication(req, res, next) {
    const sessionCookie = readSessionCookie(req);

    if (!sessionCookie) {
        return res.status(401).json({
            message: "Authentication required",
        });
    }

    try {
        req.user = await admin
            .auth()
            .verifySessionCookie(sessionCookie, true);
        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired session",
        });
    }
}
```

Passing `true` requests revocation checking so disabled users and revoked sessions are rejected. Revocation will be checked on every protected API request initially. The expected user volume is small, so consistent enforcement is preferred over route-specific optimization. Latency and Firebase request volume must be measured during competition testing before considering a less frequent strategy.

## 7. Authentication flows

### 7.1 Registration

```text
React                 Node API                  Firebase
  |                       |                         |
  | POST /auth/register   |                         |
  | name,email,password   |                         |
  |---------------------->| validate input          |
  |                       | create Firebase user    |
  |                       |------------------------>|
  |                       | obtain ID token         |
  |                       |------------------------>|
  |                       | create session cookie   |
  |                       |------------------------>|
  | 201 + Set-Cookie      |                         |
  |<----------------------|                         |
```

Proposed behavior:

1. Validate that name, email, and password are present and within accepted limits.
2. Create the Firebase Authentication user through Node.
3. Authenticate the new account through Firebase to obtain a recent ID token.
4. Exchange the ID token for a session cookie.
5. Return safe user metadata without returning Firebase tokens.
6. If session creation fails after user creation, return a clear error and allow the user to log in normally; do not create a Firestore password document.

### 7.2 Login

```text
React                 Node API                  Firebase
  |                       |                         |
  | POST /auth/login      |                         |
  | email,password        |                         |
  |---------------------->| signInWithPassword     |
  |                       |------------------------>|
  |                       | Firebase ID token       |
  |                       |<------------------------|
  |                       | createSessionCookie     |
  |                       |------------------------>|
  | 200 + Set-Cookie      |                         |
  |<----------------------|                         |
```

Node calls:

```text
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword
```

with the backend-configured Firebase Web API key. Invalid email and password cases must return the same public message to reduce account enumeration:

```json
{
  "message": "Invalid email or password"
}
```

### 7.3 Current session

React calls `GET /api/auth/session` during application initialization.

Authenticated response:

```json
{
  "user": {
    "uid": "firebase-uid",
    "email": "scout@example.com",
    "name": "Scout Name",
    "debug": false
  },
  "sessionExpiresAt": "2026-07-17T20:30:00.000Z",
  "sessionExpirationWarningAt": "2026-07-17T20:00:00.000Z"
}
```

Unauthenticated response:

```http
HTTP/1.1 401 Unauthorized
```

React uses this response for route protection, navigation, display name, and feature visibility. It must not infer authentication from application-created cookies.

### 7.4 Authenticated API call

React includes browser credentials on API requests:

```ts
await fetch(`${API_BASE_URL}/write`, {
    method: "POST",
    credentials: "include",
    headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(request),
});
```

The browser sends the session cookie automatically. React never reads the session cookie.

### 7.5 Logout

React calls `POST /api/auth/logout`. Node clears the cookie using the same name, path, `Secure`, and `SameSite` attributes used when setting it.

The initial implementation clears the current browser session. A “sign out everywhere” operation would additionally call Firebase token revocation and is outside the first implementation.

### 7.6 Session-expiration experience

The six-hour session is absolute and is not silently extended by activity. Node calculates `sessionExpiresAt` from the verified session and calculates `sessionExpirationWarningAt` using the configured warning interval. React uses these timestamps to protect the scouting workflow:

1. Show a non-blocking warning when `sessionExpirationWarningAt` is reached.
2. Prompt for reauthentication before starting a new match after the warning threshold is reached.
3. Perform reauthentication in a modal or inline flow so current React form state is not discarded.
4. A successful login replaces the existing session cookie and closes the prompt.
5. If an API submission receives `401`, save the scouting payload locally, request login, and retry only after authentication succeeds.
6. Never clear or navigate away from a scouting draft solely because authentication expired.

Session expiration may interrupt an API operation, but it must never destroy collected scouting data.

## 8. Proposed API contract

### `POST /api/auth/register`

Request:

```json
{
  "name": "Scout Name",
  "email": "scout@example.com",
  "password": "password supplied over HTTPS"
}
```

Responses:

- `201`: user created and session cookie set;
- `400`: invalid input;
- `409`: email already exists;
- `429`: registration rate limit exceeded;
- `500`: unexpected Firebase or server failure.

`name`, `email`, and `password` must be non-empty strings. Node trims the name and email but never trims or otherwise changes the password. Firebase remains responsible for email-format and password-strength validation.

If user creation succeeds but automatic sign-in or session creation fails, retain the new Firebase user and return a safe `500` response instructing the user to log in. Do not delete the account as compensation for the partial failure.

### `POST /api/auth/login`

Request:

```json
{
  "email": "scout@example.com",
  "password": "password supplied over HTTPS"
}
```

Responses:

- `200`: authenticated and session cookie set;
- `400`: malformed input;
- `401`: invalid credentials or disabled user;
- `429`: login rate limit exceeded;
- `500`: unexpected Firebase or server failure.

`email` and `password` must be non-empty strings. Node trims the email but never trims or otherwise changes the password.

Successful registration and login responses use the same complete session representation documented for `GET /api/auth/session`. This gives React one stable user, debug-claim, expiration, and warning model across authentication operations.

### `POST /api/auth/logout`

- Clears the session cookie.
- Returns `204 No Content`.
- Should be idempotent even if no session exists.

### `GET /api/auth/session`

- `200`: safe verified user metadata;
- `401`: missing, invalid, expired, or revoked session.

### `GET /api/auth/csrf`

- Issues or returns the CSRF token required by state-changing requests.
- Does not require React to access the authentication cookie.

## 9. Backend changes

### 9.1 Configuration

Add:

```dotenv
FIREBASE_WEB_API_KEY=your-firebase-project-web-api-key
SESSION_DURATION_MINUTES=360
SESSION_EXPIRATION_WARNING_MINUTES=30
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAME_SITE=lax
```

Retain:

```dotenv
SERVICE_ACCOUNT_KEY={...}
CORS_ALLOWED_ORIGIN=http://localhost:5173
PORT=3000
```

Production configuration must use:

```dotenv
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=lax
```

`FIREBASE_WEB_API_KEY` identifies the Firebase project for Authentication REST requests. It is not a service-account credential, but it remains backend configuration under this architecture.

Startup validation must require session duration and warning values to be positive integers, require the warning interval to be shorter than the session duration, and reject invalid boolean and SameSite values with clear messages.

When `NODE_ENV=production`, startup validation must also require `SESSION_COOKIE_SECURE=true`. This fail-fast rule prevents a production deployment from silently sending authentication cookies without HTTPS-only protection.

`360` minutes is six hours, and `30` minutes is the selected warning interval for development and production. Configuration uses minutes for operator readability. The backend converts the duration to milliseconds only at the Firebase API boundary because `createSessionCookie()` expects milliseconds.

### 9.2 Code organization

The current backend is a single file. Adding REST authentication, cookie handling, CSRF protection, and session middleware directly to it would make the existing coupling worse. This change will extract only code that is introduced by, or directly required by, the authentication redesign.

Proposed structure:

```text
backend/
├── server.js                         Express bootstrap and existing routes
├── config.js                         Environment parsing and validation
├── firebase.js                       Firebase Admin initialization
├── auth/
│   ├── firebase-auth-rest.js         Email/password verification via Firebase
│   └── session.js                    Session creation and cookie options
├── middleware/
│   ├── require-authentication.js     Session-cookie verification
│   └── csrf.js                       CSRF issue/verification logic
├── routes/
│   └── auth.js                       Register, login, logout, session, and CSRF routes
└── scripts/
    └── set-debug-claim.js            Restricted debug-role administration
```

Responsibilities:

| File | Responsibility |
|---|---|
| `server.js` | Create Express, apply JSON/CORS middleware, mount the auth router, retain existing scouting/debug routes, and listen on the configured port |
| `config.js` | Load the selected environment and export validated, typed configuration values without exposing secrets in logs |
| `firebase.js` | Initialize Firebase Admin once and export the Admin Auth and Firestore clients |
| `auth/firebase-auth-rest.js` | Call Firebase Authentication REST endpoints and normalize Firebase errors into application error categories |
| `auth/session.js` | Create Firebase session cookies and define consistent set/clear cookie options |
| `middleware/require-authentication.js` | Read and verify the session cookie and attach the decoded Firebase user to the request |
| `middleware/csrf.js` | Create CSRF tokens and reject invalid state-changing requests |
| `routes/auth.js` | Define the `/api/auth/*` HTTP contracts and coordinate the authentication services |
| `scripts/set-debug-claim.js` | Grant or remove the Firebase `debug` custom claim by UID; never exposed as an HTTP route |

Dependency direction should remain one-way:

```text
server.js
  ├── config.js
  ├── firebase.js
  ├── routes/auth.js
  │     ├── auth/firebase-auth-rest.js
  │     └── auth/session.js
  └── middleware/*
```

The extraction should not move or redesign unrelated code merely to make the directory structure look complete. Specifically, the following logic remains in `server.js` during this change unless a small adjustment is necessary to apply authentication middleware:

- Firestore `/read` implementation;
- Firestore `/write` implementation;
- team-index behavior;
- debug response behavior beyond protecting it and no longer exposing the UID list;
- application startup and port listening;
- existing error handling for non-authentication routes.

Moving `config.js` and `firebase.js` is in scope because every new authentication module depends on the same validated configuration and single Firebase Admin instance. Moving the existing scouting routes into new route or service modules is explicitly deferred.

Each extracted authentication module should expose a small public interface and be independently testable. Circular imports and module-level network requests are not permitted.

### 9.2.1 Expected `server.js` outcome

After the change, `server.js` should read primarily as application composition:

```js
import { config } from "./config.js";
import { db } from "./firebase.js";
import { authRouter } from "./routes/auth.js";
import { requireAuthentication } from "./middleware/require-authentication.js";

const app = express();

app.use(express.json());
app.use(corsMiddleware);
app.use("/api/auth", authRouter);

// Existing Firestore route implementations remain here for now.
router.post("/read", requireAuthentication, read);
router.post("/write", requireAuthentication, write);

app.listen(config.port);
```

This is an illustrative target rather than exact implementation code. The goal is to remove authentication mechanics from `server.js`, not to refactor every existing responsibility.

### 9.3 Protected operations

At minimum, require a verified session for:

- `/api/read`;
- `/api/write`;
- debug/seeding operations;
- any new scouting read or write route.

Authentication answers “who is calling.” It does not answer “which documents may they access.” By decision, generic caller-provided Firestore paths remain in place for this change and are protected only by authentication. Their authorization risk is accepted temporarily and must be handled in a separate purpose-specific API change.

### 9.4 Server-derived identity

For scouting submissions, Node must derive identity from the verified session:

```js
const authenticatedRecord = {
    ...validatedRecord,
    scoutUid: req.user.uid,
    scoutName: req.user.name || req.user.email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
};
```

Node must ignore or overwrite `name`, `uid`, or role information supplied by React.

### 9.5 Logging

Never log:

- passwords;
- request bodies containing passwords;
- Firebase ID tokens;
- refresh tokens;
- session-cookie values;
- `Cookie` or `Authorization` headers;
- password-derived Firestore data.

Safe logs may include request IDs, route names, status codes, Firebase error categories, and authenticated UID when operationally necessary. Public error responses should not expose Firebase internals.

### 9.6 Maintainability and commenting standard

The primary maintainers are expected to include high-school students with different levels of JavaScript, Express, Firebase, and security experience. Authentication code must favor clarity over compactness or clever abstraction.

Requirements:

- Every authentication-related function and class must have a JSDoc comment.
- Exported functions must document purpose, parameters, return value, asynchronous behavior, and expected errors.
- Security-sensitive code must explain **why** a check or cookie option exists, not merely restate the syntax.
- Module-level comments must summarize responsibility and identify which Firebase interface the module uses.
- Complex flows must include short step-by-step comments at decision boundaries.
- Functions should remain small and use descriptive names rather than abbreviations.
- Authentication constants must include units in their names, such as `sessionDurationMinutes`.
- Comments must not include secrets, real tokens, passwords, or service-account values.
- Comments that become inaccurate must be updated in the same change as the code.

Example:

```js
/**
 * Verifies the Firebase session cookie attached to an API request.
 *
 * Revocation checking is enabled so a disabled user or explicitly revoked
 * session cannot continue writing scouting data until the cookie expires.
 * On success, the decoded Firebase identity is assigned to `req.user`.
 *
 * @param {import("express").Request} req Express request containing cookies.
 * @param {import("express").Response} res Express response used for 401 errors.
 * @param {import("express").NextFunction} next Continues to the protected route.
 * @returns {Promise<void>} Resolves after verification or after sending a 401.
 */
export async function requireAuthentication(req, res, next) {
    // Implementation...
}
```

Avoid comments that only translate a line into English:

```js
// Bad: Set maxAge to the session duration.
maxAge: sessionDurationMs,
```

Code review must treat missing or misleading authentication documentation as a correctness issue, not optional style feedback.

## 10. Frontend changes

### 10.1 Central API client

Create a single fetch wrapper that:

- prefixes `VITE_API_BASE_URL`;
- sets `credentials: "include"`;
- sets JSON headers when needed;
- attaches the CSRF token to state-changing requests;
- parses JSON and text errors consistently;
- maps `401` responses to signed-out application state.

### 10.2 Authentication state

Introduce an authentication context or hook that exposes:

```ts
interface AuthState {
    status: "loading" | "authenticated" | "anonymous";
    sessionExpiresAt: string | null;
    sessionExpirationWarningAt: string | null;
    user: {
        uid: string;
        email: string;
        name: string;
        debug: boolean;
    } | null;
}
```

At application startup, call `/api/auth/session`. Protected routes should render a loading state while this request is pending, redirect only after an anonymous response, and never depend on `document.cookie`.

The authentication context also schedules the expiration warning and supports reauthentication without unmounting or clearing an active scouting form.

### 10.3 Remove custom authentication code

Remove:

- frontend `sha256()`;
- `generateCookie`, `readCookie`, and `deleteCookie` authentication usage;
- the Firestore write to `auth/{name}`;
- custom-token response handling;
- top-level asynchronous debug-module initialization.

The `user.tsx` cookie helper may be deleted if no non-authentication use remains.

### 10.4 Debug access

Do not return the complete debug UID list to the browser. Debug authorization uses a Firebase custom claim assigned through the restricted backend administration script:

```js
await admin.auth().setCustomUserClaims(uid, {
    debug: true,
});
```

Node reads the claim from the verified session and exposes only the current user's result through `/api/auth/session`:

```json
{
  "debug": true
}
```

Server-side checks are still required for debug operations; hiding UI controls is not authorization.

Changing a custom claim does not rewrite an existing session cookie. The affected user must log out and log back in to receive the updated claim. For immediate removal, revoke that user's sessions as part of the administrative operation.

## 11. CORS and credentials

The backend must return:

```http
Access-Control-Allow-Origin: <exact configured frontend origin>
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type, X-CSRF-Token
```

The allowed origin cannot be `*` when credentialed requests are enabled.

All relevant frontend requests must set:

```ts
credentials: "include"
```

The existing runtime CORS policy and `vercel.json` headers must be reconciled so the hosting platform and Express do not produce conflicting values.

## 12. Production-domain and cookie decision

Production will expose the web application and API through one browser origin:

```text
Web application: https://sim-city-scouting.vercel.app
API base:        https://sim-city-scouting.vercel.app/api
```

Although these are two application surfaces, they are not two domains. The scheme, hostname, and port are identical; `/api` is only a path. This same-origin architecture is the selected design because it avoids third-party-cookie restrictions and simplifies session handling.

The frontend production configuration should use a relative API base:

```dotenv
VITE_API_BASE_URL=/api
```

Vercel must route `/api/*` to the Node API while routing other requests to the React application. The precise Vercel function/rewrite configuration will be defined and tested during implementation.

Production session cookies use:

```text
HttpOnly; Secure; SameSite=Lax; Path=/
```

Local development still uses different ports, so CORS remains necessary locally. The local ports are same-site, and the development cookie can use `SameSite=Lax` without `Secure`.

## 13. CSRF protection

Because browsers attach cookies automatically, state-changing routes require CSRF protection.

Minimum controls:

- exact `CORS_ALLOWED_ORIGIN` validation;
- reject unexpected `Origin` headers on state-changing requests;
- accept JSON content types rather than form submissions;
- appropriate `SameSite` cookie policy;
- require an unpredictable CSRF token in `X-CSRF-Token`.

A double-submit design is suitable for this stateless Firebase session:

1. Node generates a cryptographically random CSRF token.
2. Node returns it in a readable CSRF cookie and/or `/api/auth/csrf` response.
3. React sends the token in `X-CSRF-Token` on mutations.
4. Node compares the header with the CSRF cookie using a timing-safe comparison.
5. The authentication session cookie remains `HttpOnly` and is never exposed to React.

CSRF controls do not replace input validation, authentication, or authorization.

## 14. Rate limiting and abuse controls

Vercel Hobby includes one WAF rate-limit rule per project with fixed-window counting. Hobby counting keys are limited to IP and JA4 digest, with windows from 10 seconds through 10 minutes. Use this rule for initial IP-based protection of state-changing authentication endpoints before traffic reaches Node.

Initial rule:

```text
Path:      /api/auth/*
Method:    POST
Key:       IP
Algorithm: Fixed window
Limit:     20 requests per minute per IP
```

The exact threshold should be monitored and adjusted during competition testing. Rate-limited requests return `429 Too Many Requests` before invoking the Node function.

No external persistent rate-limit store or application-level rate-limit package will be added in this change. In-memory Node counters must not be used as a security boundary because Vercel can execute requests across multiple function instances.

The Hobby WAF rule cannot maintain separate counters for normalized email addresses, Firebase UIDs, login versus registration, or other application identifiers. A serverless persistent store such as Upstash Redis may be reconsidered later if monitoring demonstrates a need for those controls.

Node must still return generic credential failures, validate inputs, avoid account enumeration, and avoid logging credentials or tokens. WAF rate limiting supplements rather than replaces Firebase Authentication protections.

Firebase App Check may be evaluated later, but it does not replace user authentication or server authorization.

## 15. Seasonal user reset and migration

This is a new season, and the existing user base may be recreated. Preserving current development accounts and password-hash documents is not a requirement.

Migration sequence:

1. Implement and test session authentication in the development Firebase project.
2. Verify registration, login, current-session, protected-write, and logout flows with a newly created test user.
3. Verify rejection of missing, altered, expired, disabled, and revoked sessions.
4. Confirm that no code reads or writes Firestore `auth/*` documents.
5. Delete the obsolete Firestore `auth` collection after explicit confirmation.
6. Delete and recreate Firebase Authentication users if a clean user reset is desired.
7. Deploy the backend and frontend changes as a coordinated release.
8. Have scouts create new season accounts through the redesigned registration flow.

There is no rollback retention window for obsolete authentication documents. Deletion is still an explicit destructive operation and must not occur automatically during deployment.

## 16. Rollback strategy

Keep the previous deployable commit available and avoid unrelated scouting-schema changes. If code rollback is necessary before obsolete authentication data is deleted, redeploy the previous frontend and backend together.

After the old Firestore authentication documents and user base are deleted, rollback does not restore those accounts. This is accepted because the new-season user base can be recreated. Scouting data must not be deleted as part of the authentication reset. After deployment, explicitly expire obsolete `user` and `uid` cookies.

## 17. Testing strategy

### 17.1 Backend unit tests

- environment validation;
- Firebase REST error mapping;
- cookie option selection by environment;
- cookie extraction;
- missing and invalid session responses;
- verified-user attachment to requests;
- CSRF token comparison;
- safe error serialization.

### 17.2 Backend integration tests

- registration creates a Firebase user and session;
- login accepts valid and rejects invalid credentials;
- `/auth/session` returns verified identity and session timing;
- logout clears the cookie;
- protected routes reject anonymous requests;
- protected routes accept valid sessions;
- disabled and revoked users are rejected;
- server-derived scout identity overwrites browser values.

Firebase Authentication and Firestore emulators should be used where practical to isolate automated tests from live projects.

### 17.3 Frontend tests

- initial authentication loading state;
- authenticated and anonymous routing;
- login, registration, and logout status handling;
- credentialed API requests;
- CSRF token attachment;
- `401` transition to anonymous state;
- no dependency on `user` or `uid` cookies;
- no password, token, or cookie logging.

### 17.4 Manual browser tests

- Chrome, Safari, Firefox, and the competition tablets;
- local frontend/API ports;
- production domains and cookie policy;
- page reload preserves session;
- session-expiration warning appears 30 minutes before expiration;
- changing the configured warning interval changes the warning timestamp returned by `/api/auth/session`;
- reauthentication replaces the session without clearing an active form;
- session expiration returns to login;
- an expired submission remains in local storage and can be retried after login;
- logout invalidates the local browser session;
- offline scouting records remain available after authentication changes.

## 18. Implementation chunks

The work should be delivered as small, reviewable chunks rather than as one large authentication rewrite. Each chunk must leave the application in a runnable state, include tests or repeatable verification appropriate to its risk, and contain the comments and JSDoc required by this proposal.

The legacy authentication endpoints remain available only until the replacement frontend has been proven. This temporary overlap provides a practical code rollback point; it does not change the decision to delete obsolete authentication data without a retention window after explicit approval.

### Chunk 0: approve and commit the design

**Goal:** Establish this proposal as the agreed implementation contract before application code changes.

**Scope:**

- Review the recorded decisions, API contract, security controls, and chunk boundaries.
- Commit this proposal independently from application changes.

**Exit criteria:**

- No unresolved authentication-policy decision remains.
- The proposal is committed and the application behaves exactly as before.

**Suggested commit:** `docs(auth): add Firebase session authentication proposal`

### Chunk 1: behavior-preserving backend extraction

**Goal:** Create the auth-related module boundaries without changing authentication behavior.

**Scope:**

- Move environment loading and validation to `backend/config.js`.
- Move the single Firebase Admin initialization to `backend/firebase.js`.
- Update `server.js` to import those modules.
- Add a minimal backend test structure for configuration and module initialization.
- Document every extracted function and non-obvious configuration rule with clear JSDoc and comments.

**Out of scope:** New endpoints, session cookies, CSRF behavior, and frontend changes.

**Exit criteria:**

- The existing registration, login, read, and write behavior is unchanged.
- Firebase Admin is initialized exactly once.
- Development startup and the existing API smoke checks pass.

**Suggested commit:** `refactor(backend): extract configuration and Firebase initialization`

### Chunk 2: Firebase authentication and session services

**Goal:** Build independently testable primitives for Firebase password verification and session-cookie management.

**Scope:**

- Add and validate `FIREBASE_WEB_API_KEY`.
- Add and validate `SESSION_DURATION_MINUTES`, initially `360`.
- Add and validate `SESSION_EXPIRATION_WARNING_MINUTES`, initially `30` and less than the session duration.
- Add and validate `SESSION_COOKIE_SECURE` and `SESSION_COOKIE_SAME_SITE`; require secure cookies in production.
- Document the new values in the development and production environment examples and add the agreed development values to the ignored local environment file.
- Add `backend/auth/firebase-auth-rest.js` for Firebase Authentication REST calls and safe error mapping. Return only the ID token and safe user metadata needed by later routes; do not retain or return Firebase refresh tokens.
- Add `backend/auth/session.js` for session creation, verification with revocation checking, timing calculation, and consistent set/clear cookie options using the cookie name `session`.
- Do not add a cookie-parsing dependency in this chunk. Reconsider `cookie-parser` or another small dependency when Chunk 3 introduces request-cookie handling.
- Add unit tests for configuration validation, safe Firebase error mapping, malformed and unavailable upstream responses, refresh-token exclusion, session creation, revocation checking, cookie settings, expiration timestamps, and warning timestamps.
- Add JSDoc that explains parameters, return values, asynchronous failures, and why each security-sensitive operation exists.

**Out of scope:** Routing, browser integration, and protection of existing data endpoints.

**Exit criteria:**

- The new services are covered by tests but are not yet used by production request paths.
- The existing `server.js` routes do not import or invoke the new authentication services.
- Development configuration uses a replaceable Firebase Web API key placeholder until the project key is supplied; no live Firebase REST request is required by this chunk.
- No new runtime dependency is introduced.
- Secrets, credentials, ID tokens, session cookies, and Firebase error payloads are not logged.
- Existing application behavior remains unchanged.

**Suggested commit:** `feat(auth): add Firebase authentication and session services`

### Chunk 3: parallel backend session API

**Goal:** Expose the replacement authentication API while keeping the current frontend operational.

**Scope:**

- Add `backend/routes/auth.js`.
- Implement `POST /api/auth/register`.
- Implement `POST /api/auth/login`.
- Implement `POST /api/auth/logout`.
- Implement `GET /api/auth/session` with verified identity, debug status, expiration, and warning timestamps.
- Require non-empty name, email, and password values for registration and non-empty email and password values for login. Trim names and emails, but preserve passwords exactly.
- Return the same verified session representation from successful registration, login, and current-session requests.
- Retain a newly created Firebase user if automatic sign-in or session creation fails, and return a safe instruction to log in.
- Add `cookie-parser` for standard request-cookie handling and `supertest` as a development-only HTTP integration-test dependency.
- Add minimal structured authentication logs containing only route, status, safe category, and UID when available. Do not add custom request IDs in this chunk.
- Mount the auth router from `server.js`.
- Add integration tests for successful and failed registration, login, session inspection, logout, expiration, disabled users, and revoked sessions.

**Out of scope:** Removing `/api/register` or `/api/login`, changing the React application, protecting `/read` or `/write`, CSRF protection, and password reset. Password reset requires a separately reviewed implementation chunk.

**Exit criteria:**

- The new endpoints work through direct API tests.
- The session cookie is `HttpOnly` and uses the environment-appropriate `Secure` and `SameSite` settings.
- Revocation is checked on every authenticated request.
- The existing frontend continues to work through the legacy flow.

**Suggested commit:** `feat(auth): add backend-managed session routes`

### Chunk 4: CSRF protection

**Goal:** Protect cookie-authenticated state changes before the frontend begins using the session API.

**Scope:**

- Add `GET /api/auth/csrf`.
- Add the double-submit token implementation under `backend/middleware/csrf.js`.
- Validate the exact allowed origin, JSON content type, CSRF cookie, and `X-CSRF-Token` header where required.
- Apply CSRF protection to the new state-changing auth routes.
- Add tests for missing, mismatched, malformed, and valid tokens and unexpected origins.
- Explain in comments why cookie authentication requires CSRF protection and why timing-safe comparison is used.

**Out of scope:** Applying the middleware to the legacy write endpoint; that occurs when data routes move to session authentication.

**Exit criteria:**

- Valid browser-style requests succeed.
- Forged or incomplete state-changing requests fail without revealing sensitive details.
- Existing frontend behavior remains unchanged.

**Suggested commit:** `feat(security): add CSRF protection for session authentication`

### Chunk 5: migrate the React authentication flow

**Goal:** Make React use only the new Node authentication API.

**Scope:**

- Add a centralized API client with `credentials: "include"` and CSRF-token handling.
- Add the authentication context and protected-route loading behavior.
- Switch registration, login, logout, and startup session restoration to the new endpoints.
- Stop deriving identity from readable `user` and `uid` cookies.
- Add the configurable expiration warning and in-place reauthentication flow.
- Preserve active scouting drafts during warning, expiration, login, and retry flows.
- Add frontend tests and repeatable browser checks.

**Out of scope:** Removing the legacy backend routes and old Firestore authentication documents.

**Exit criteria:**

- React contains no password hashing, Firebase token handling, or writes to `auth/*`.
- Reloading the page restores a valid session through `GET /api/auth/session`.
- A scout can reauthenticate without losing an active form.
- Authentication failures and expiration preserve retryable offline data.

**Suggested commit:** `feat(auth): migrate frontend to backend sessions`

### Chunk 6: protect data and debug operations

**Goal:** Make the verified backend session the authorization boundary for application data.

**Scope:**

- Add `backend/middleware/require-authentication.js`.
- Require a valid session for `/read`, `/write`, and debug or seeding operations.
- Apply CSRF protection to state-changing application endpoints.
- Derive UID and scout identity from the verified session instead of request data.
- Add the restricted `backend/scripts/set-debug-claim.js` administration script.
- Enforce the Firebase `debug: true` custom claim on the server.
- Verify offline submission retry after session expiration and reauthentication.
- Add authorization and identity-spoofing tests.

**Out of scope:** Replacing the generic `/read` and `/write` API design.

**Exit criteria:**

- Anonymous, expired, disabled, revoked, and CSRF-invalid requests are rejected.
- A client cannot choose another user's identity or grant itself debug access.
- Valid authenticated scouting and offline-retry workflows continue to work.

**Suggested commit:** `feat(security): protect scouting and debug operations`

### Chunk 7: production routing and abuse protection

**Goal:** Validate the selected same-origin design on Vercel Hobby.

**Scope:**

- Route `/api/*` to Node and all other application paths to React.
- Set the production frontend API base to `/api`.
- Reconcile Express CORS behavior with `vercel.json` so headers do not conflict.
- Verify production cookie attributes and credentialed requests.
- Configure the Vercel Hobby WAF rule for `POST /api/auth/*`, keyed by IP, at the initial limit of 20 requests per minute.
- Run deployment smoke tests for registration, login, session restoration, protected writes, logout, and rate limiting.

**Out of scope:** Upstash Redis or another application-level persistent rate-limit store.

**Exit criteria:**

- Web and API traffic operate under `https://sim-city-scouting.vercel.app`.
- Session cookies work without cross-site-cookie exceptions.
- The WAF rule is active and expected authentication traffic is not blocked.

**Suggested commit:** `chore(deploy): configure same-origin session deployment`

### Chunk 8: remove the legacy authentication design

**Goal:** Remove the obsolete password-hash implementation only after the replacement is proven end to end.

**Scope:**

- Remove the legacy registration and login endpoints.
- Remove SHA-256 helpers, custom-token handling, readable authentication cookies, and obsolete debug allow-list code.
- Remove unused dependencies and configuration.
- Confirm through code search and tests that nothing reads or writes Firestore `auth/*`.
- Update `README.md` and `TECHNICAL_DOCUMENTATION.md` to describe the final system.
- After separate explicit approval, delete the obsolete Firestore `auth` collection and optionally recreate Firebase Authentication users for the new season.

**Out of scope:** Deleting scouting data or automatically deleting any Firebase data during deployment.

**Exit criteria:**

- All acceptance criteria in the next section pass.
- No legacy authentication code or data dependency remains.
- Any approved user reset affects authentication users only, never scouting records.

**Suggested commit:** `refactor(auth): remove legacy password-hash authentication`

## 19. Acceptance criteria

The change is complete when:

- Firebase is the only component that verifies passwords.
- No password hash is calculated or stored by application code.
- React contains no Firebase SDK initialization or Firebase token logic.
- React cannot read the authentication session cookie.
- Login and registration return an `HttpOnly` session cookie.
- `/api/auth/session` returns verified user identity and session timing.
- Protected API calls reject missing, invalid, expired, and revoked sessions.
- Scouting attribution is derived from the verified server identity.
- Debug operations are authorized by Node, not only hidden by React.
- Debug access is derived from a Firebase custom claim and enforced by Node.
- Session duration and expiration-warning intervals are configured in minutes and validated at startup.
- Sessions expire after the configured duration and expose expiration and warning timestamps through `/api/auth/session`.
- Users are warned at the configured threshold and can reauthenticate without losing an active scouting draft.
- Revocation is checked on every protected API request.
- State-changing cookie-authenticated requests have CSRF protection.
- CORS explicitly supports credentials only for the configured origin.
- Newly created season users can register, log in, reload, and log out successfully.
- Authentication request bodies, tokens, and cookie values are not logged.
- Automated tests cover core session and authorization behavior.
- No application code reads or writes the old Firestore `auth` collection.

## 20. Recorded decisions

1. **Production origin:** Use one origin, `https://sim-city-scouting.vercel.app`, with the API under `/api`.
2. **Rate limiting:** Use the single Vercel Hobby WAF rule for initial IP-based protection of `POST /api/auth/*`. Do not add an external persistent store in this change; reconsider one only if monitoring shows a need for per-email, per-user, or endpoint-specific limits.
3. **Generic data endpoints:** Retain `/read` and `/write` during this change, protect them with authentication, and defer their replacement.
4. **User migration:** Recreate the new-season user base as needed; no rollback retention window is required for obsolete `auth/*` documents.
5. **Session duration:** Configure session duration and warning intervals in minutes. Start with a six-hour (`360` minute) absolute Firebase session and a `30` minute warning, and support in-place reauthentication so active scouting data is preserved.
6. **Revocation checking:** Call `verifySessionCookie(sessionCookie, true)` on every protected request initially and measure the operational cost before optimizing.
7. **Debug authorization:** Use a Firebase `debug` custom claim, assigned through a restricted backend script and enforced by Node.
8. **Password reset:** Add password reset in a separately reviewed implementation chunk rather than expanding the parallel session API work.

## 21. Open decisions

- **Password-reset experience:** Decide whether reset links use Firebase's hosted reset page or a custom React page, then define the backend endpoint, generic anti-enumeration response, email template, authorized domains, rate limiting, and frontend behavior before implementation.

Other implementation details discovered during development must be added here if they require a product, security, or deployment choice rather than being resolved silently in code.

## 22. References

- [Firebase password authentication](https://firebase.google.com/docs/auth/web/password-auth)
- [Firebase Authentication REST API](https://firebase.google.com/docs/reference/rest/auth)
- [Firebase session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies)
- [Firebase ID-token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firebase custom claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
