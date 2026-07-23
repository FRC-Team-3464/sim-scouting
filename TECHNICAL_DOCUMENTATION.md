# Sim-Scouting Technical Documentation

## 1. Purpose and scope

Sim-Scouting is a web application for FRC Team 3464 to collect match and pit scouting observations for the 2026 REBUILT game. It is optimized for tablet/phone data entry at competitions, where connectivity can be unreliable.

This document describes the system implemented in this repository as of July 18, 2026. It distinguishes current behavior from comments or intended behavior where they differ.

## 2. System overview

The solution has three logical tiers:

```text
Browser
  React 19 + TypeScript + React Router + Tailwind CSS
  Verified session state, CSRF-aware API client, localStorage fallback
       |
       | HTTPS/JSON under /api
       v
Express 5 API
  Request routing, Firebase session authentication, CSRF protection
       |
       +-------------------------+
       v                         v
Firebase Authentication        Cloud Firestore
  user identities and sessions  scouting and legacy password-hash documents
```

The frontend and backend are separate Node projects:

- The repository root contains the Express backend dependencies and start script.
- `frontend/` contains the Vite/React single-page application and its own dependencies.
- Firebase Admin is used only by the backend. The frontend does not contain or use the Firebase client SDK.
- The frontend reads its API base URL from Vite's `VITE_API_BASE_URL`; development and production values are selected through mode-specific environment files.
- React uses the backend-managed Firebase session-cookie API and never reads the `HttpOnly` authentication cookie. The legacy backend authentication endpoints remain temporarily available for rollback but have no frontend callers.

### 2.1 Authentication implementation status

The completed authentication work is traceable to the implementation chunks in [`docs/platform/proposals/firebase-session-authentication.md`](docs/platform/proposals/firebase-session-authentication.md):

| Chunk | Completed result | Technical documentation coverage |
|---|---|---|
| 0 | Approved and committed the Firebase session-authentication design before changing runtime behavior | The proposal remains the authoritative design and decision record; this document describes implemented behavior rather than duplicating every proposal decision |
| 1 | Extracted environment validation and single Firebase Admin initialization into `backend/config.js` and `backend/firebase.js`, with initial backend tests | Repository structure, backend initialization, configuration, and testing sections |
| 2 | Added Firebase password REST authentication, session-cookie services, revocation checking, cookie configuration, expiration/warning calculation, and their tests | Backend-managed API, required environment, session response, security status, and testing sections |
| 3 | Added the parallel `/api/auth` router, cookie parsing, registration, login, logout, session inspection, safe structured logs, and HTTP integration tests while retaining the legacy flow | Backend API contract, initialization, frontend migration status, security assessment, and testing sections |
| 4 | Removed unused dependencies, adopted the modular Firebase Admin API, updated compatible packages, recorded the frontend lint baseline, and documented unavoidable moderate transitive findings; deployment testing later required a temporary Firebase Admin 13.6 compatibility pin | Technology stack, testing/quality status, and source index |
| 5 | Added signed, session-bound CSRF tokens, exact Origin and JSON checks, credentialed CORS, CSRF cookie rotation, safe rejection logs, configuration validation, and security tests | CORS, session API, CSRF model, required environment, operational checklist, and testing sections |
| 6 | Migrated React to a centralized credentialed API client, verified authentication context, protected routes, configurable expiration warning, in-place reauthentication, bounded retry policy, and frontend tests | Frontend session model, API behavior, routing, draft preservation, security status, testing, and source index |
| 7 | Protected generic data routes with verified sessions, added CSRF to writes, derived scouting attribution on the server, added restricted debug-claim administration, removed the public debug list, and retained the legacy seed tool for later redesign | Data API contract, attribution model, security assessment, testing, operations, and source index |
| 8 (repository preparation) | Added shared root Vercel configuration for separate staging and production projects, an import-safe Express application, a concrete API function with explicit routing, same-origin examples, deployment configuration tests, and a deployment guide; staging smoke testing remains in progress | Repository structure, initialization, CORS, production deployment, testing, operations, and source index |

Chunk 9 legacy-removal work and Chunk 10 development-environment documentation are not described as current behavior. Chunk 8 is not complete until the external Vercel project is created and its production smoke checklist passes.

## 3. Technology stack

| Layer | Technology | Role |
|---|---|---|
| Client | React 19, React DOM | Component rendering and local state |
| Language/build | TypeScript 5.9, Vite 7 | Type checking, bundling, development server |
| Navigation | React Router DOM 7 | Browser-side routes |
| Styling | Tailwind CSS 4 | Utility-class styling |
| JSON display | `@microlink/react-json-view` | Local scouting record preview |
| API | Node.js, Express 5 | JSON endpoints under `/api` |
| HTTP support | `cookie-parser`, Supertest | Request-cookie parsing and backend HTTP integration testing |
| Data/auth administration | Firebase Admin 13.6 (temporary Vercel compatibility pin) | Firestore reads/writes, Authentication user management, and session-cookie verification through the modular API |
| Hosting configuration | Vercel | Static Vite build, SPA fallback, and one explicitly routed Express Function |

The root project also declares `nodemon` for local backend reloads. CORS is implemented manually by Express; the unused `cors` package has been removed.

## 4. Repository structure

```text
sim-scouting/
├── .env.development.example     Backend development configuration template
├── .env.production.example      Backend production configuration template
├── api/index.js                 Concrete Vercel Function exporting Express
├── backend/
│   ├── auth/                     Firebase REST sign-in and session helpers
│   ├── data/scouting-record.js   Server-owned scouting attribution
│   ├── middleware/               Session authentication and CSRF protection
│   ├── routes/auth.js            Firebase session-authentication API
│   ├── scripts/                  Restricted debug-claim administration
│   ├── test/                     Backend unit and HTTP integration tests
│   ├── app.js                    Express composition and API routes
│   ├── config.js                 Environment loading and validation
│   ├── firebase.js               Firebase Admin initialization
│   └── server.js                 Local/traditional Node HTTP listener
├── frontend/
│   ├── .env.development.example Frontend development configuration template
│   ├── .env.production.example  Frontend production configuration template
│   ├── src/
│   │   ├── App.tsx               SPA route table and shared footer layout
│   │   ├── main.tsx              React entry point
│   │   ├── index.css             Tailwind import and global styles
│   │   ├── api/                  Credentialed client and scouting API calls
│   │   ├── auth/                 Session context, route guards, warning/modal
│   │   ├── components/           Reusable form controls
│   │   ├── pages/                Screens and scouting workflows
│   │   ├── scripts/              API configuration and synthetic generator
│   │   └── test/                 Shared frontend test setup
│   ├── vite.config.ts            React and Tailwind Vite plugins
│   └── tsconfig*.json            Browser and build TypeScript settings
├── package.json                  Backend/runtime dependencies
├── docs/platform/proposals/      Platform architecture proposals
├── docs/platform/technical-debt/ Recorded out-of-scope quality baselines
├── vercel.json                   Root build and SPA fallback configuration
└── README.md                     Original project introduction
```

`notafrontend/index.html`, `frontend/react.md`, and `frontend/tochange.txt` are not referenced by the runtime application.

## 5. Frontend architecture

### 5.1 Bootstrap and routing

`frontend/src/main.tsx` mounts `<App />` into `#root` inside React `StrictMode`. `App.tsx` uses `BrowserRouter` and defines these routes:

| URL | Component | Function |
|---|---|---|
| `/` | `Home` | Main navigation and debug indicator |
| `/match` | `MatchForm` | Match scouting data entry |
| `/local-data` | `LocalStorageView` | Inspect, submit, and delete locally saved records |
| `/login` | `LoginPage` | Email/password login |
| `/signup` | `SignupPage` | Account creation |
| `/pit` | `PitScoutingForm` | Pit scouting data entry |

Vercel serves existing static assets and `/api/*` Functions first, then rewrites remaining application URLs to `index.html`. This allows direct navigation to React Router pages without hiding API routes.

`frontend/src/routes.ts` is the single source for lowercase canonical browser paths. `/stored` redirects to `/local-data`, and `/pitScouting` redirects to `/pit`, preserving existing bookmarks while preventing new navigation code from repeating path strings. API endpoints and Firestore paths are intentionally separate contracts.

### 5.2 Session representation and route protection

`AuthenticationProvider` calls `GET /api/auth/session` during startup and stores only the verified public response in React state. The state contains the Firebase UID, email, display name, verified `debug` claim, expiration timestamp, and configurable warning timestamp. React never reads the `HttpOnly` Firebase session cookie and no longer creates readable `user` or `uid` cookies.

`ProtectedRoute` blocks `/`, `/match`, `/local-data`, and `/pit` while the startup request is pending. It redirects only after a confirmed `401`; network and server failures display a retryable session-check error rather than misclassifying the user as anonymous. `/login` and `/signup` remain public. A requested protected path is retained through login.

The top-level debug whitelist request and public UID-list endpoint have been removed. Home, the scouting forms, and the retained seed control use only the current user's `debug` boolean from Node's verified session response for display and client-side behavior. The seed tool still writes through generic `/api/write`; it is known-buggy legacy convenience code rather than a separate server-authorized operation. Any future privileged debug endpoint must enforce the custom claim on the server.

The six-hour session remains absolute. React schedules a non-blocking warning from `sessionExpirationWarningAt`. A warned user must reauthenticate before starting a new Match or Pit form, including through a direct URL. At expiration or after an authenticated request receives `401`, a non-dismissible modal replaces the session without unmounting the active page.

The centralized client keeps CSRF tokens only in memory, includes credentials on every API request, refreshes the token when authentication changes its cookie binding, and parses JSON/text errors consistently. A `401` request may be replayed at most twice and only after successful reauthentication. Transient network and `5xx` failures may retry at most twice only for safe GET requests; mutations are not retried because the server may have committed them before the response was lost.

### 5.3 Match scouting workflow

`MatchForm.tsx` is a single component whose `useState` values form an in-memory draft. Five top-level tabs expose sections of the draft:

1. **Setup**: event, scouting team, match number, observed team.
2. **Auto**: fuel, climb success, fuel hoarding.
3. **Teleop**: transition and four game shifts.
4. **Endgame**: fuel and climb level.
5. **Finale**: field traversal, robot errors, notes, and submission.

Hub activity is initialized as alternating inactive/active values for shifts 1–4. Selecting a hub activity value calls `switchShifts`, which inverts all four shifts together. This enforces an alternating pattern but also couples every shift control to the same state transition.

On submit:

```text
Validate selected fields
  -> serialize all match state
  -> save localStorage[scoutData-{team}-{match}]
  -> read Firestore datas/data
  -> append team number to its team array if absent
  -> merge-write Firestore document {team}/{match}
  -> navigate home only after the backend confirms the write
```

The implementation comment describes an event/team/match/timestamp hierarchy, but the actual document path is only `{teamNumber}/{matchNumber}`. A second scout submitting the same team and match merges into and overwrites fields in the existing document rather than creating an independent observation.

Validation requires a non-empty event, but the numeric inputs initialize to `0` and are checked against `null`; therefore team and match number `0` pass the submit check. In debug mode, validation is bypassed entirely.

The local record remains after a successful upload. A rejected or thrown upload keeps the form mounted and displays a retry message that directs the scout to Local Data. The submit button is disabled while the request is pending. Local records still have no durable status flag distinguishing uploaded records from pending ones.

### 5.4 Pit scouting workflow

`PitScoutingForm.tsx` captures:

- scouting team;
- event, match number, and observed team;
- chassis length and width;
- starting and maximum height;
- motor types;
- outpost use.

The local key uses the same `scoutData-{team}-{match}` pattern as match scouting, so pit and match records for the same team/match can overwrite one another locally. The Firestore path is `pitScouting/{teamNumber}`; repeat submissions merge and overwrite that team's existing pit document.

The same numeric validation issue exists here. Submission uses the same explicit pending/failure behavior as match scouting and navigates to the canonical home route only after the backend confirms the write.

### 5.5 Offline/local-storage workflow

Both scouting forms save the record to `localStorage` before attempting a network write. This protects the entered record from a failed API call, subject to browser storage availability.

`LocalStorageView`:

- loads all local-storage keys, not only keys owned by this application;
- allows selection and JSON preview of a record;
- retries the selected record via `writeToDb`;
- deletes the selected item;
- attempts to clear all local storage;
- exposes the retained synthetic match generator when the verified session reports `debug: true`.

Important behavior:

- Retry always uses `{teamNumber}/{matchNumber}`, so it does not preserve the pit-scanning Firestore path.
- Retry does not await success, display the result, or remove/mark a successfully uploaded item.
- `JSON.parse(value)` is not guarded in `submitItem`; invalid or empty data throws.
- `clear` removes items while iterating a changing `localStorage` collection and a stale `keys` array, so it can skip entries.
- The JSON viewer is read-only in the current implementation despite the “view/edit” label.

This is an offline fallback, not a complete synchronization engine: there is no service worker, background synchronization, conflict resolution, retry scheduling, or durable upload status.

### 5.6 Shared components

| Component | Responsibility | Notable behavior |
|---|---|---|
| `IntegerInput` | Digits-only numeric input | Empty input maps to `0`; min is not applied to zero |
| `CounterInput` | ±1 control | Honors configured min/max |
| `MultiCounterInput` | ±1/5/10 plus direct input | Decrement fallbacks use `0`; `value || 0` normalizes falsy values |
| `BinaryChoice` | Two-button boolean | First option maps to `true`, second to `false` |
| `Dropdown` | String selection | Empty string represents the placeholder |
| `CheckboxDropdown` | Multi-select boolean record | Mutates the state object in place and emits the same reference |
| `AutoResizeTextarea` | Expanding text input | Resizes during input; maximum height is CSS-limited |
| `Footer` | Shared attribution | Rendered below every route |

The checkbox component's in-place mutation can prevent React from recognizing a state change. The form still reads the mutated object during submission, but render behavior is less predictable than an immutable update.

## 6. Backend architecture

### 6.1 Initialization

`backend/app.js`:

1. selects an environment using `NODE_ENV`, defaulting to `development`;
2. loads `.env.{environment}` using `dotenv`, with `.env` as an optional fallback;
3. validates all backend and session environment variables in `backend/config.js`;
4. parses `SERVICE_ACCOUNT_KEY` as JSON;
5. initializes the modular Firebase Admin services once in `backend/firebase.js`;
6. obtains Firebase Authentication and Firestore service instances;
7. mounts the backend-managed session router at `/api/auth` and the legacy router at `/api`;
8. exports the configured Express application without opening a network listener.

`backend/server.js` imports that application and starts the configured local or traditional Node listener. Vercel imports the same application through `api/index.js`, so serverless initialization does not call `app.listen()`. The first root rewrite sends `/api/:path*` to that concrete Function; the SPA fallback explicitly excludes `/api` so React never shadows backend responses.

`SERVICE_ACCOUNT_KEY` must contain the complete Firebase service-account JSON encoded as one environment-variable value. Startup also requires a valid port, exact HTTP(S) frontend origin, Firebase Web API key, session duration, warning duration, cookie settings, and CSRF signing secret. Missing or invalid configuration causes startup to fail before the server listens.

The server accepts JSON bodies using Express defaults (approximately 100 KB maximum). Credential-bearing request bodies, password hashes, Firebase tokens, session cookies, CSRF values, and Firestore write bodies are not logged. The new authentication routes emit structured events containing only safe categories and operational fields. The legacy routes still log some raw operational error messages, and there is no centralized error middleware, request ID, health endpoint, application-level rate limiter, or graceful shutdown handler.

### 6.2 CORS

The application manually emits:

- `Access-Control-Allow-Origin: {CORS_ALLOWED_ORIGIN}`
- allowed methods `GET,POST,PUT,DELETE,OPTIONS`
- allowed headers `Content-Type, Authorization, X-CSRF-Token`
- `Access-Control-Allow-Credentials: true`

`CORS_ALLOWED_ORIGIN` must contain the exact browser origin, including scheme, host, and optional non-default port, without a path, query string, or trailing slash. Development uses `http://localhost:5173`; production uses the deployed frontend origin. OPTIONS requests return 200 immediately. Credentialed CORS is needed locally because Vite and Express run on different origins and the browser must include authentication and CSRF cookies. The selected production design routes the web application and `/api` through one browser origin.

The root Vercel configuration does not define CORS headers. Express is the single CORS-header owner, which prevents conflicting platform and application values. Same-origin production requests do not need CORS permission, but retaining the exact policy supports the different-port local development environment and rejects unexpected browser origins consistently.

### 6.3 API contract

All endpoints are under `/api`.

#### `POST /write`

Request:

```json
{
  "path": "collection/document",
  "data": { "any": "JSON-compatible object" }
}
```

The route requires a valid, non-revoked Firebase session plus the exact allowed Origin, JSON content type, and a session-bound CSRF token. It still accepts a caller-selected path and performs a merge write without a purpose-specific schema; replacing that generic design is deferred.

For every document except the shared `datas/data` team index, Node removes caller-provided identity, timestamp, debug, and role fields and adds:

```json
{
  "scoutUid": "verified-firebase-uid",
  "scoutName": "Verified Scout Name",
  "submittedAt": "Firestore server timestamp"
}
```

The values come from the verified session and Firebase server time. The browser cannot choose another scout or grant itself a role through the request body. `datas/data` retains its existing `{team: [...]}` shape.

Responses:

- `200` text: `Data written successfully`
- `400` text: missing fields
- `401` JSON: missing, invalid, expired, revoked, disabled, or deleted-user session
- `403` JSON: invalid Origin or CSRF token
- `415` JSON: non-JSON content type
- `500` text: generic write failure without Firebase details

#### `POST /read`

Request:

```json
{ "path": "collection/document" }
```

The server retrieves the document and returns its data object.

The route requires a valid, non-revoked Firebase session. It does not require a CSRF token because it does not change state, even though the retained legacy contract uses POST.

Responses:

- `200` JSON: document fields
- `400` text: missing path
- `404` text: document does not exist
- `401` JSON: missing, invalid, expired, revoked, disabled, or deleted-user session
- `500` text: generic read failure without Firebase details

#### `POST /register`

Request:

```json
{
  "email": "scout@example.com",
  "password": "plaintext transport value",
  "name": "Scout Name"
}
```

Creates a Firebase Authentication user and returns UID, email, and display name. Firebase stores its own password representation securely. The removed legacy frontend previously followed this response by computing unsalted SHA-256 of the password and calling `/write` to store it at `auth/{name}`; the current frontend has no caller for this endpoint.

This is not atomic: the Authentication user can be created while the Firestore hash write fails. Display names are also unsuitable document identifiers because duplicate names collide and names containing `/` change the path shape.

#### `POST /login`

Request:

```json
{
  "email": "scout@example.com",
  "password": "plaintext transport value"
}
```

The endpoint:

1. looks up the Firebase user by email;
2. creates a Firebase custom token before checking the password;
3. chooses `displayName`, falling back to UID, as the Firestore auth-document ID;
4. reads `auth/{identifier}.hashed`;
5. hashes the supplied password with SHA-256 and compares strings;
6. returns the custom token and user details on equality.

The current frontend does not call this endpoint or consume its custom token. The retained backend flow duplicates Firebase Authentication password handling using a fast, unsalted hash and stores password-equivalent material in a broadly writable/readable collection. If the hash document is missing, `hashedData.hashed` throws and produces a 500 response.

The preceding `/register` and `/login` endpoints are legacy behavior retained temporarily as a coordinated-deployment rollback point. They are separate from the backend-managed routes below and have no current React callers.

### 6.4 Backend-managed session authentication API

The current React application uses the API mounted under `/api/auth`.

#### `GET /auth/csrf`

Issues the CSRF values required before calling a state-changing authentication route:

```json
{ "csrfToken": "<HMAC signature>.<random nonce>" }
```

The response uses `Cache-Control: no-store` and sets:

- `csrf_binding`: random, `HttpOnly` pre-authentication browser binding when no Firebase session exists;
- `csrf_token`: readable signed token that React will copy into `X-CSRF-Token`.

If a Firebase session cookie exists, the token is bound to that cookie instead and the pre-authentication binding is cleared. A supplied `Origin` must match `CORS_ALLOWED_ORIGIN`; same-origin GET requests may omit it.

#### `POST /auth/register`

Requires the exact configured `Origin`, `Content-Type: application/json`, matching CSRF header/cookie values, and a valid HMAC signature.

Request:

```json
{
  "name": "Scout Name",
  "email": "scout@example.com",
  "password": "plaintext transport value"
}
```

The backend preserves the existing input normalization: name and email are trimmed, while the password is not modified. It creates the Firebase Authentication user, signs in through Firebase's supported password REST API, exchanges the returned ID token for an `HttpOnly` Firebase session cookie, immediately verifies that cookie with revocation checking, and returns the verified public session representation. The ID token and session-cookie value are never returned in JSON.

If user creation succeeds but automatic sign-in or session creation fails, the account is deliberately preserved and the response instructs the user to log in. Successful registration clears pre-authentication CSRF cookies because the new Firebase session becomes the signing binding.

#### `POST /auth/login`

Uses the same Origin, JSON, and CSRF controls as registration. Firebase's password REST API validates the supplied credentials; Node exchanges the resulting ID token for a verified session cookie.

Successful registration and login return:

```json
{
  "user": {
    "uid": "firebase-uid",
    "email": "scout@example.com",
    "name": "Scout Name",
    "debug": false
  },
  "sessionExpiresAt": "2026-07-18T02:00:00.000Z",
  "sessionExpirationWarningAt": "2026-07-18T01:30:00.000Z"
}
```

The `debug` value is derived only from a verified Firebase custom claim and defaults to `false`. It is display information, not a substitute for server-side authorization.

#### `GET /auth/session`

Reads the `HttpOnly` `session` cookie and verifies it through Firebase Admin with revocation checking enabled. A valid cookie returns the same public session representation shown above. Missing, expired, revoked, invalid, or disabled-user sessions return `401` without exposing Firebase error details.

#### `POST /auth/logout`

Requires the exact configured Origin and a valid signed CSRF token but no request body or content type. It idempotently clears the Firebase session, CSRF binding, and CSRF token cookies and returns `204 No Content`.

### 6.5 CSRF security model

Cookie authentication needs CSRF protection because browsers attach cookies automatically. The middleware in `backend/middleware/csrf.js` implements a signed double-submit design:

1. a 32-byte `CSRF_SECRET` signs a random token nonce with HMAC-SHA-256;
2. the signature is bound to either the private Firebase session cookie or a private pre-authentication binding cookie;
3. state-changing routes require the exact configured Origin;
4. the readable token cookie must exactly match `X-CSRF-Token` using a timing-safe comparison;
5. Node independently recalculates and verifies the HMAC for the current private binding.

A copied or injected token cannot validate without the matching private cookie and server secret. Authentication changes rotate the binding: successful registration/login clear the pre-authentication token, and React must obtain a new session-bound token before another mutation. Rejections use generic public messages and safe log categories without recording origins, request bodies, credentials, cookies, or token values.

CSRF protection applies to `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and `/api/write`. `/api/read` requires authentication but not CSRF because it does not change server state.

### 6.6 Debug-claim administration

Debug status is a Firebase custom claim, not a browser-controlled allow list.
Only a trusted developer with the backend service account can change it. From
the repository root, use the development-only command:

```bash
npm run debug:claim -- <firebase-uid> true
npm run debug:claim -- <firebase-uid> false
```

`backend/scripts/set-debug-claim.js` validates the UID and explicit boolean,
preserves every unrelated custom claim, updates `debug`, and revokes the user's
existing sessions. The user must log in again before React receives the changed
claim. The command logs only the UID, new boolean state, and safe Firebase error
category; it never prints credentials, tokens, cookies, or service-account data.

The obsolete public `/api/debug` UID-list endpoint has been removed. The
existing synthetic seed control is intentionally retained for local
experimentation even though its generated team/path behavior is inconsistent.
It uses authenticated, CSRF-protected `/api/write`, but there is no distinct
server-side seed operation or claim check beyond the verified claim that React
uses to display the control. Its redesign is deferred to the future
purpose-specific data API proposal.

## 7. Data model

Firestore collection/document paths alternate segments. The application currently uses these effective structures:

```text
datas/data                       team-number index
{teamNumber}/{matchNumber}      match scouting document
pitScouting/{teamNumber}        pit scouting document
auth/{displayName}              custom password hash document
```

### 7.1 Team index document

`datas/data` is expected to exist and contain:

```ts
interface TeamIndexDocument {
  team: number[];
}
```

`writeToDb` assumes `readDoc("/datas/data")` succeeds and returns a `team` property. A missing document or unavailable network prevents the subsequent scouting write from being attempted, even though the form has already saved locally. Concurrent scouts perform a read-modify-write on the array without a transaction, so updates can be lost.

### 7.2 Match scouting document

```ts
interface MatchScoutingDocument {
  scoutingTeam: number;
  scoutUid: string;
  scoutName: string;
  submittedAt: FirebaseFirestore.Timestamp;
  eventName: string;
  teamNumber: number;
  matchNumber: number;

  autoFuel: number;
  autoClimbed: boolean;
  autoHoardedFuel: boolean;

  shift1HubActive: boolean;
  shift2HubActive: boolean;
  shift3HubActive: boolean;
  shift4HubActive: boolean;

  transitionCollected: boolean;
  shift1Collected: boolean;
  shift2Collected: boolean;
  shift3Collected: boolean;
  shift4Collected: boolean;

  transitionFuel: number;
  shift1Fuel: number;
  shift2Fuel: number;
  shift3Fuel: number;
  shift4Fuel: number;

  shift1Defense: boolean;
  shift2Defense: boolean;
  shift3Defense: boolean;
  shift4Defense: boolean;

  shift1HoardedFuel: boolean;
  shift2HoardedFuel: boolean;
  shift3HoardedFuel: boolean;
  shift4HoardedFuel: boolean;

  endgameFuel: number;
  endgameClimbLevel: string;
  crossedBump: boolean;
  underTrench: boolean;
  notes: string;
  robotError: Record<string, boolean>;
}
```

There is no stored submission ID, schema version, or upload status. The backend now adds an authenticated UID/name and server submission timestamp.

### 7.3 Pit scouting document

```ts
interface PitScoutingDocument {
  scoutUid: string;
  scoutName: string;
  submittedAt: FirebaseFirestore.Timestamp;
  teamNumber: number;
  scoutingTeam: number;
  eventName: string;
  matchNumber: number;
  chassisSizel: number;
  chassisSizew: number;
  startingHeight: string;
  maxHeight: string;
  motorTypes: string;
  outpost: boolean;
}
```

Property names are persisted exactly as shown, including `chassisSizel` and `chassisSizew`.

## 8. Configuration and deployment

### 8.1 Required environment

Backend:

```dotenv
SERVICE_ACCOUNT_KEY={"type":"service_account",...}
CORS_ALLOWED_ORIGIN=http://localhost:5173
PORT=3000
FIREBASE_WEB_API_KEY=your-development-firebase-web-api-key
SESSION_DURATION_MINUTES=360
SESSION_EXPIRATION_WARNING_MINUTES=30
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAME_SITE=lax
CSRF_SECRET=64-hexadecimal-characters
```

`SERVICE_ACCOUNT_KEY` grants administrative access to the Firebase project and must never be committed. `FIREBASE_WEB_API_KEY` identifies the Firebase project for password sign-in; unlike the service account, it is not an administrative credential, but it still belongs in backend configuration for this architecture. `CSRF_SECRET` is a private HMAC key and must also be stored only in protected backend or hosting-platform configuration.

Generate separate development and production CSRF secrets with:

```bash
openssl rand -hex 32
```

The backend validates `CORS_ALLOWED_ORIGIN` as one exact HTTP(S) origin and requires the warning duration to be shorter than the session duration. Production startup also requires `SESSION_COOKIE_SECURE=true`. `SESSION_COOKIE_SAME_SITE` accepts only `lax`, `strict`, or `none`.

Frontend:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

Production uses the relative value `VITE_API_BASE_URL=/api`, keeping browser requests on the web application's origin.

Vite automatically loads `frontend/.env.development` for the development server and `frontend/.env.production` for production builds. `frontend/src/scripts/config.ts` requires `VITE_API_BASE_URL` and normalizes a trailing slash before API callers append endpoint paths. Vite exposes `VITE_` variables to browser code, so they must never contain secrets.

Real `.env`, `.env.*`, and frontend environment files are ignored by Git. Sanitized `.example` files are explicitly tracked as setup templates.

### 8.2 Local development

Install the two projects separately:

```bash
# Backend dependencies
npm install

# Frontend dependencies
npm --prefix frontend install
```

Copy the sanitized templates and supply the real Firebase service account, Firebase Web API key, and generated CSRF secret:

```bash
cp .env.development.example .env.development
cp frontend/.env.development.example frontend/.env.development
```

Start the backend in development mode:

```bash
npm run dev
```

This sets `NODE_ENV=development`, runs `nodemon ./backend/server.js`, loads `.env.development`, and restarts the server after backend source changes. Start the frontend separately:

```bash
npm --prefix frontend run dev
```

The default development configuration uses frontend origin `http://localhost:5173`, backend port `3000`, API base `http://localhost:3000/api`, a six-hour session, and a warning 30 minutes before expiration. Local HTTP requires `SESSION_COOKIE_SECURE=false`; production must use secure cookies over HTTPS.

### 8.3 Production notes

The repository is prepared for two Vercel projects, each rooted at the repository root and using the same tracked configuration. `sim-city-scouting` deploys `main` to production; `sim-city-scouting-staging` ultimately deploys the dedicated `staging` branch. The root `vercel.json` installs the root and frontend lockfiles independently, builds the Vite application, publishes `frontend/dist`, rewrites `/api/:path*` to `api/index.js`, and applies the React SPA fallback only to non-API paths. The concrete Function exports `backend/app.js`, so existing `/api/*` Express paths remain unchanged. The former `frontend/vercel.json` was removed because each deployment reads the root project configuration.

Production configuration uses `.env.production` locally or hosting-platform environment variables. `npm start` sets `NODE_ENV=production` and runs Node directly; `npm --prefix frontend run build` causes Vite to select `frontend/.env.production`.

The selected production design exposes both surfaces through one browser origin:

```text
Web application: https://sim-city-scouting.vercel.app
API base:        https://sim-city-scouting.vercel.app/api
```

The tracked production examples now use `CORS_ALLOWED_ORIGIN=https://sim-city-scouting.vercel.app` and `VITE_API_BASE_URL=/api`. Production session and CSRF cookies remain host-only, `Secure`, `SameSite=Lax`, and scoped to `/`, so they do not require cross-site-cookie exceptions.

The staging Vercel project has been created and temporarily deploys `feat/firebase-session-auth` while its configuration is validated. It must be switched to the protected `staging` branch after the feature is merged. Production setup and the deployment work are not complete until both environments pass their manual registration, login, session restoration, protected write, direct SPA navigation, and logout checks. Generated Vercel Preview origins are intentionally not trusted for authenticated mutations; the stable staging project is the pre-production authentication environment.

Hosted staging uses `https://sim-city-scouting-staging.vercel.app` and the existing development Firebase project, so it intentionally shares local-development users and Firestore data. It uses a separate service-account key within that Firebase project and a staging-only CSRF secret. Production uses its separate Firebase project and credentials. The complete project-creation, variable, branch, and smoke-test procedure is in [`docs/platform/deployment/deployment-setup.md`](docs/platform/deployment/deployment-setup.md).

A possible future frontend/backend repository split is outside this proposal chunk. It should preserve the same public web origin and `/api` contract, for example by proxying `/api/*` through the web deployment, rather than changing browsers to cross-origin session cookies.

## 9. Security assessment

The most important current risk is that authenticated Firebase Admin operations still accept caller-selected Firestore paths without purpose-specific authorization.

### Critical

1. **Generic Firestore authorization:** any authenticated user can submit a document path to `/read` or `/write`. Because the server uses Admin SDK credentials, Firestore security rules do not constrain these operations by path or role.
2. **Password-hash disclosure and modification:** an authenticated user can still target retained `auth/*` documents through the generic endpoints. Unsalted SHA-256 hashes are fast to crack and act as password verifiers until Chunk 9 removes them.

### High

1. No application-level or Vercel WAF rate limiting exists on login, registration, reads, or writes. Firebase applies its own authentication abuse controls and Node maps those throttling responses to `429`.
2. Registration is public and the custom hash write is non-atomic.
3. API input has no schema, size, path, or ownership validation beyond basic truthiness.
4. Debug-mode form validation is a client-side convenience rather than a data-authorization boundary; purpose-specific server schemas remain future work.

### Authentication migration status

The replacement design keeps all Firebase interaction behind Node rather than adding the Firebase client SDK to React. The completed backend foundation now:

1. validates passwords through Firebase's supported REST API;
2. exchanges Firebase ID tokens for `HttpOnly` session cookies;
3. verifies sessions and revocation through Firebase Admin;
4. derives identity and the `debug` claim from verified Firebase data;
5. protects authentication mutations with signed, session-bound CSRF tokens;
6. avoids returning Firebase tokens or session-cookie values to React;
7. requires verified, non-revoked sessions for generic reads and writes;
8. requires signed CSRF protection for writes;
9. derives `scoutUid`, `scoutName`, and `submittedAt` on the server.

React now uses `/api/auth/*`, restores verified sessions during startup, and no longer hashes passwords, writes `auth/{name}`, handles Firebase custom tokens, or derives authentication from readable cookies. The legacy backend authentication routes and existing password-hash documents remain until the replacement is proven through the protected-data and deployment chunks.

The security migration is not complete. Generic `/read` and `/write` still accept authenticated caller-selected paths without path authorization or runtime schemas. The obsolete public debug UID-list endpoint is gone, but the known-buggy synthetic seed UI remains over the same generic write route. Purpose-specific endpoints, seed redesign, and removal of the legacy password-hash routes/documents remain later work.

## 10. Reliability and data-integrity assessment

Prioritized issues are:

1. **Document collisions:** `{team}/{match}` permits only one effective observation and silently merges repeats.
2. **Index race:** `datas/data.team` uses a non-transactional read-modify-write array.
3. **Index dependency:** an index read failure blocks the primary record upload.
4. **Ambiguous local state:** successful and failed uploads remain indistinguishable.
5. **Pit retry misrouting:** locally retried pit data is written as match data.
6. **Weak validation:** numeric zero passes required checks; the backend accepts arbitrary field types.
7. **No timestamps/schema versions:** records cannot be reliably ordered, migrated, or audited.
8. **Top-level debug fetch:** an auxiliary request can block application startup.

A safer record layout would be:

```text
events/{eventId}/matches/{matchId}/observations/{submissionId}
events/{eventId}/pitObservations/{teamNumber}
```

Each observation should include `createdAt: FieldValue.serverTimestamp()`, authenticated `scoutUid`, `schemaVersion`, team/match identifiers, and a client-generated idempotency key. Team discovery should use queries or transactional/atomic data structures rather than a shared array index.

## 11. Testing and quality status

The backend uses Node's built-in test runner and Supertest. Run all backend tests with:

```bash
npm run test:backend
```

The current suite contains 123 passing tests covering configuration validation, Firebase initialization, Firebase password REST handling, session creation and verification, authentication HTTP behavior, safe error mapping, signed CSRF token construction, origin/content-type rejection, cookie attributes, token rotation, logout cleanup, protected-route session rejection, identity-spoof prevention, safe debug-claim administration, and checked-in deployment configuration. Firebase services are replaced with test doubles, so the suite does not require a live Firebase project. Supertest HTTP integration tests bind a temporary localhost port.

The frontend uses Vitest, jsdom, and React Testing Library. Its 25 tests cover the centralized client, credential and CSRF behavior, retry limits, unchanged scouting-mutation replay after reauthentication, startup session restoration, protected routing, canonical and legacy browser paths, verified identity/debug state, login failures, registration validation and success, logout, warning/expiration behavior, direct form-route gating, successful and failed pit/match submissions, and in-place reauthentication that preserves active React form state. Playwright is intentionally not added during this proposal; repeatable manual browser checks complement the backend and frontend automated suites and browser automation can be reconsidered after the planned React rewrite.

Recommended minimum coverage:

- component tests for numeric bounds, binary mapping, and checkbox updates;
- form tests for required fields and serialized schemas;
- offline tests for save, retry, success marking, deletion, and pit/match routing;
- API tests for authentication, authorization, schema rejection, and Firebase failures;
- concurrency/idempotency tests for repeated submissions;
- end-to-end login and scouting workflows;
- deployment smoke tests for `/`, direct SPA routes, API health, and CORS.

The production frontend build completes successfully. Removing obsolete authentication code and correcting the scouting submission state reduced the separately documented lint debt from 40 errors and 3 warnings to 17 errors and no warnings. The retained seed generator accounts for four of those existing errors. The remaining findings are pre-existing issues outside this authentication chunk. Verify the current state with:

```bash
npm --prefix frontend run build
npm --prefix frontend run lint
npm --prefix frontend run test
```

The frontend dependency audit currently reports zero vulnerabilities. The root full and production audits report eight affected dependency paths for one moderate `uuid@9.0.1` buffer-bounds advisory, reached transitively through Firebase Admin's Google Cloud Firestore and Storage dependencies. The application does not directly call the affected UUID v3, v5, or v6 APIs or provide their optional buffer argument. npm offers only forced breaking Firebase Admin changes: the production-only audit suggests 14.2, which is incompatible with the current Vercel Function loader, while the full audit suggests the obsolete 10.3 release. No transitive override or forced fix is applied. There are no unresolved critical or high-severity audit findings.

Firebase Admin is temporarily pinned to 13.6.0 for Vercel compatibility. Firebase Admin 14.2 selects CommonJS `jwks-rsa` 4, which synchronously requires ESM-only `jose` 6. Local Node.js 22 supports that bridge, but the Vercel Function loader failed at startup with `ERR_REQUIRE_ESM`. Firebase Admin 13.6 selects `jwks-rsa` 3 and `jose` 4, a CommonJS-compatible combination, while retaining the modular Admin APIs used by this application. Re-test and restore a supported current Firebase Admin release when Vercel or the upstream dependency chain resolves this loader incompatibility.

## 12. Recommended improvement roadmap

### Phase 1: secure the boundary

- Remove the legacy password-verification routes and password hashes from Firestore after the frontend migration.
- Disable generic `/read` and `/write` endpoints; introduce scoped endpoints and runtime schemas.
- Enforce roles server-side and add rate limiting.
- Rotate credentials if the database has ever been publicly accessible through these endpoints.

### Phase 2: protect scouting data

- Define canonical TypeScript/runtime schemas shared by client and API.
- Introduce unique submission IDs, server timestamps, scout UIDs, and schema versions.
- Make writes idempotent and eliminate the shared team-array race.
- Separate match and pit local keys and retry routing.

### Phase 3: harden offline operation

- Model local records with `pending`, `uploading`, `uploaded`, and `failed` states.
- Await retries and surface actionable results.
- Retain records until confirmed by the API, then archive or remove them explicitly.
- Consider IndexedDB and a service worker if true offline-first operation is required.

### Phase 4: improve maintainability

- Split `MatchForm` into section components and a typed reducer/form model.
- Move events, API URLs, origins, and debug roles into managed configuration.
- Replace window redirects/alerts with router navigation and in-page status handling.
- Add centralized API error handling and structured logs.
- Add CI for install, type-check, lint, tests, and production build.

## 13. Operational checklist

Before a competition deployment:

- confirm the frontend API URL and backend allowed origin;
- verify `SERVICE_ACCOUNT_KEY` is present only in protected backend configuration;
- verify development and production use different private `CSRF_SECRET` values;
- verify production uses `SESSION_COOKIE_SECURE=true` and a relative `/api` frontend base;
- verify the Vercel project uses the repository root, the `Other` framework preset, and the tracked install/build/output settings;
- verify `main` deploys only to the production project and `staging` deploys to the stable staging project;
- verify staging uses the development Firebase project with a separate cloud service-account key and CSRF secret;
- verify direct navigation to every SPA route;
- test CSRF initialization, registration, login, session restoration, logout, match scouting, pit scouting, offline save, and retry on representative mobile devices;
- confirm Firestore paths and data are isolated to the intended event;
- test duplicate team/match submissions and decide the desired conflict behavior;
- verify debug status changes require the restricted administration script and a new login, and treat the retained seed control as an unsupported development convenience;
- export or back up existing scouting data;
- monitor API errors, authentication failures, and rejected submissions during the event;
- observe shared-IP login and registration traffic before deciding whether to enable a Vercel WAF threshold; do not count logout as a credential attempt.

## 14. Source-to-responsibility index

| Source | Primary responsibility |
|---|---|
| `backend/config.js` | Environment loading, normalization, and startup validation |
| `backend/firebase.js` | Modular Firebase Admin initialization |
| `backend/app.js` | Express composition, CORS, Firestore access, authentication router, and retained legacy routes |
| `backend/server.js` | Start the local or traditional long-running Node listener |
| `api/index.js` | Export Express as the concrete Vercel Function targeted by the `/api/:path*` rewrite |
| `backend/auth/firebase-auth-rest.js` | Firebase password authentication over the REST API |
| `backend/auth/session.js` | Firebase session creation, verification, timing, and cookie options |
| `backend/data/scouting-record.js` | Remove spoofed fields and add verified scout attribution and server time |
| `backend/middleware/csrf.js` | Signed, binding-aware CSRF token issuance and validation |
| `backend/middleware/require-authentication.js` | Verify non-revoked session cookies and attach trusted claims |
| `backend/routes/auth.js` | Backend-managed registration, login, session, logout, and CSRF endpoints |
| `backend/scripts/set-debug-claim.js` | Restricted debug-claim grant/removal with session revocation |
| `backend/test/*` | Backend unit and HTTP integration tests |
| `frontend/src/App.tsx` | Route composition |
| `frontend/src/routes.ts` | Canonical browser paths and retained legacy redirect paths |
| `frontend/src/pages/Home.tsx` | Authentication redirect, navigation, debug flag |
| `frontend/src/pages/MatchForm.tsx` | Match state, game rules, serialization, local/API submit |
| `frontend/src/pages/pitScoutingForm.tsx` | Pit state, serialization, local/API submit |
| `frontend/src/pages/LocalStored.tsx` | Local record inspection and retry |
| `frontend/src/pages/Login.tsx` | Login UI |
| `frontend/src/pages/Signup.tsx` | Registration UI and client validation |
| `frontend/src/api/client.ts` | Credentialed HTTP requests, CSRF lifecycle, safe errors, and bounded retries |
| `frontend/src/api/scouting.ts` | Existing team-index and generic Firestore request behavior through the central client |
| `frontend/src/auth/*` | Verified session context, protected routes, warnings, and in-place reauthentication |
| `frontend/src/scripts/seed.tsx` | Retained legacy synthetic match generator with known inconsistencies |
| `frontend/src/components/*` | Reusable scouting inputs and footer |
| `vercel.json` | Install both projects, build `frontend/dist`, and provide the React SPA fallback |
| `docs/platform/deployment/deployment-setup.md` | Create and verify the separate staging and production Vercel projects |
