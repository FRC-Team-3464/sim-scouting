# Sim-Scouting Technical Documentation

## 1. Purpose and scope

Sim-Scouting is a web application for FRC Team 3464 to collect match and pit scouting observations for the 2026 REBUILT game. It is optimized for tablet/phone data entry at competitions, where connectivity can be unreliable.

This document describes the system implemented in this repository as of July 17, 2026. It distinguishes current behavior from comments or intended behavior where they differ.

## 2. System overview

The solution has three logical tiers:

```text
Browser
  React 19 + TypeScript + React Router + Tailwind CSS
  UI state, cookies, localStorage fallback
       |
       | HTTPS/JSON under /api
       v
Express 5 API
  Request routing, Firebase Admin access, password comparison
       |
       +--------------------+
       v                    v
Firebase Authentication   Cloud Firestore
  user identities          scouting and password-hash documents
```

The frontend and backend are separate Node projects:

- The repository root contains the Express backend dependencies and start script.
- `frontend/` contains the Vite/React single-page application and its own dependencies.
- Firebase Admin is used only by the backend. The frontend declares the Firebase client dependency but does not configure or use a Firebase client application.
- The frontend reads its API base URL from Vite's `VITE_API_BASE_URL`; development and production values are selected through mode-specific environment files.

## 3. Technology stack

| Layer | Technology | Role |
|---|---|---|
| Client | React 19, React DOM | Component rendering and local state |
| Language/build | TypeScript 5.9, Vite 7 | Type checking, bundling, development server |
| Navigation | React Router DOM 7 | Browser-side routes |
| Styling | Tailwind CSS 4 | Utility-class styling |
| JSON display | `@microlink/react-json-view` | Local scouting record preview |
| API | Node.js, Express 5 | JSON endpoints under `/api` |
| Data/auth administration | Firebase Admin 12 | Firestore reads/writes and Authentication user management |
| Hosting configuration | Vercel | SPA rewrite and CORS headers |

The root project also declares `cors`, Firebase client SDK, and `nodemon`. The backend imports `cors` but does not use its middleware; CORS is implemented manually. The root Firebase client dependency is unused by the reviewed source.

## 4. Repository structure

```text
sim-scouting/
├── .env.development.example     Backend development configuration template
├── .env.production.example      Backend production configuration template
├── backend/server.js             Express API and Firebase Admin integration
├── frontend/
│   ├── .env.development.example Frontend development configuration template
│   ├── .env.production.example  Frontend production configuration template
│   ├── src/
│   │   ├── App.tsx               SPA route table and shared footer layout
│   │   ├── main.tsx              React entry point
│   │   ├── index.css             Tailwind import and global styles
│   │   ├── components/           Reusable form controls
│   │   ├── pages/                Screens and scouting workflows
│   │   └── scripts/              API, cookie, and seed helpers
│   ├── vite.config.ts            React and Tailwind Vite plugins
│   ├── tsconfig*.json            Browser and build TypeScript settings
│   └── vercel.json               SPA fallback rewrite
├── package.json                  Backend/runtime dependencies
├── vercel.json                   API CORS response headers
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
| `/stored` | `LocalStorageView` | Inspect, submit, and delete locally saved records |
| `/login` | `LoginPage` | Email/password login |
| `/signup` | `SignupPage` | Account creation |
| `/pitScouting` | `PitScoutingForm` | Pit scouting data entry |

Vercel rewrites every frontend URL to `index.html`, allowing client-side routes to load directly.

Route paths are case-insensitive by React Router's default matching behavior, which is relevant because `Home` navigates to `/pitscouting` while the declared route is `/pitScouting`.

### 5.2 Session representation and route protection

The client stores identity in JavaScript-readable cookies:

- `user`: the Firebase display name, used for greetings, route gating, and submission attribution.
- `uid`: the Firebase Authentication UID, used only for the debug whitelist check.

Cookies expire after seven days and use `path=/`. They do not set `Secure`, `HttpOnly`, or `SameSite`. `Home`, `MatchForm`, and `PitScoutingForm` consider a user signed in if the `user` cookie exists; they do not validate a Firebase session or token. The backend's login response includes a Firebase custom token, but the client does not consume it with `signInWithCustomToken` or send it on later requests.

Consequently, the cookies are display/client-navigation state, not an authenticated security session. Any browser user can create or alter them, and the API independently accepts unauthenticated data operations.

`Home.tsx` performs a top-level asynchronous request before the application module finishes loading. It obtains `/api/debug`, splits the returned comma-separated UID list, and exports a global `debug` boolean. Because the fetch is unguarded, a network or API failure can reject module initialization and prevent the UI from loading.

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
  -> navigate home after the request returns
```

The implementation comment describes an event/team/match/timestamp hierarchy, but the actual document path is only `{teamNumber}/{matchNumber}`. A second scout submitting the same team and match merges into and overwrites fields in the existing document rather than creating an independent observation.

Validation requires a non-empty event, but the numeric inputs initialize to `0` and are checked against `null`; therefore team and match number `0` pass the submit check. In debug mode, validation is bypassed entirely.

The local record remains after a successful upload. It is therefore a local history/queue, but there is no status flag distinguishing uploaded records from pending ones.

### 5.4 Pit scouting workflow

`PitScoutingForm.tsx` captures:

- scout name and scouting team;
- event, match number, and observed team;
- chassis length and width;
- starting and maximum height;
- motor types;
- outpost use.

The local key uses the same `scoutData-{team}-{match}` pattern as match scouting, so pit and match records for the same team/match can overwrite one another locally. The Firestore path is `pitScouting/{teamNumber}`; repeat submissions merge and overwrite that team's existing pit document.

The same numeric validation issue exists here. In addition, the page checks `window.location.pathname === "/pitscouting"` before navigating home; this differs in case from the declared route and can behave differently depending on the browser URL casing.

### 5.5 Offline/local-storage workflow

Both scouting forms save the record to `localStorage` before attempting a network write. This protects the entered record from a failed API call, subject to browser storage availability.

`LocalStorageView`:

- loads all local-storage keys, not only keys owned by this application;
- allows selection and JSON preview of a record;
- retries the selected record via `writeToDb`;
- deletes the selected item;
- attempts to clear all local storage;
- exposes synthetic database seeding when debug mode is enabled.

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

`backend/server.js`:

1. selects an environment using `NODE_ENV`, defaulting to `development`;
2. loads `.env.{environment}` using `dotenv`, with `.env` as an optional fallback;
3. parses `SERVICE_ACCOUNT_KEY` as JSON;
4. initializes Firebase Admin with the service-account credential;
5. obtains a Firestore client;
6. validates `PORT` and `CORS_ALLOWED_ORIGIN`;
7. creates an Express application and `/api` router;
8. starts an HTTP listener on the configured port.

`SERVICE_ACCOUNT_KEY` must contain the complete Firebase service-account JSON encoded as one environment-variable value. `PORT` must be an integer from 1 through 65535, and `CORS_ALLOWED_ORIGIN` must be present. Missing or invalid configuration causes startup to fail before the server listens.

The server accepts JSON bodies using Express defaults (approximately 100 KB maximum). Credential-bearing request bodies, password hashes, authentication responses, and Firestore write bodies are not logged. Operational errors remain logged, but there is no centralized error middleware, request ID, structured logging, health endpoint, rate limiter, or graceful shutdown handler.

### 6.2 CORS

The application manually emits:

- `Access-Control-Allow-Origin: {CORS_ALLOWED_ORIGIN}`
- allowed methods `GET,POST,PUT,DELETE,OPTIONS`
- allowed headers `Content-Type, Authorization`

`CORS_ALLOWED_ORIGIN` must contain the exact browser origin, including scheme, host, and non-default port, without a path or trailing slash. Development uses `http://localhost:5173`; production uses the deployed frontend origin. OPTIONS requests return 200 immediately. The repository-level Vercel configuration separately defines CORS headers for `/api/(.*)`, including credentials and a broader header/method list. These two policies should be consolidated to avoid platform/runtime discrepancies. The imported `cors` package is currently unused.

### 6.3 API contract

All endpoints are under `/api`.

#### `GET /debug`

Returns a hard-coded comma-separated UID whitelist:

```json
{ "value": "uid1,uid2" }
```

No authentication is required, so the list is public. Authorization is enforced only by frontend display/validation logic and therefore is not a security boundary.

#### `POST /write`

Request:

```json
{
  "path": "collection/document",
  "data": { "any": "JSON-compatible object" }
}
```

The server passes `path` directly to `db.doc()` and performs `set(data, { merge: true })`. It requires truthy `path` and `data`, but does not authenticate the caller, authorize the target path, validate the path shape, or validate the data schema.

Responses:

- `200` text: `Data written successfully`
- `400` text: missing fields
- `500` text: Firebase or runtime error

#### `POST /read`

Request:

```json
{ "path": "collection/document" }
```

The server retrieves the document and returns its data object.

Responses:

- `200` JSON: document fields
- `400` text: missing path
- `404` text: document does not exist
- `500` text: Firebase or runtime error

Like `/write`, this is an unauthenticated arbitrary-document primitive backed by Admin SDK privileges.

#### `POST /register`

Request:

```json
{
  "email": "scout@example.com",
  "password": "plaintext transport value",
  "name": "Scout Name"
}
```

Creates a Firebase Authentication user and returns UID, email, and display name. Firebase stores its own password representation securely. After this response, the frontend independently computes unsalted SHA-256 of the password and calls `/write` to store it at `auth/{name}`.

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

The custom token is unused by the client. The flow duplicates Firebase Authentication password handling using a fast, unsalted hash and stores password-equivalent material in a broadly writable/readable collection. If the hash document is missing, `hashedData.hashed` throws and produces a 500 response.

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
  name?: string;
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

There is no stored submission ID, timestamp, authenticated UID, schema version, upload status, or server-generated audit metadata.

### 7.3 Pit scouting document

```ts
interface PitScoutingDocument {
  name?: string;
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
```

Do not commit this credential. It grants administrative access to the Firebase project and should be stored in the hosting platform's secret manager/environment configuration.

Frontend:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

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

Copy the sanitized templates and supply the real Firebase service account:

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

The default development configuration uses frontend origin `http://localhost:5173`, backend port `3000`, and API base `http://localhost:3000/api`.

### 8.3 Production notes

The frontend is a conventional Vite static deployment. The backend file directly calls `app.listen()` and does not export an application or serverless handler. Whether it deploys successfully depends on the host's Node process support or framework detection; the current root `vercel.json` does not define a function/build mapping. This should be verified in the deployed project configuration and made explicit in source.

Production configuration uses `.env.production` locally or hosting-platform environment variables. `npm start` sets `NODE_ENV=production` and runs Node directly; `npm --prefix frontend run build` causes Vite to select `frontend/.env.production`. The intended production hostnames in the example configuration differ:

- frontend/API calls: `scout4364i.vercel.app`
- allowed frontend origin: `3464scouting.vercel.app`

That is consistent with separate API and UI deployments. Both values are configuration rather than source constants and must also be configured in the deployment environment.

## 9. Security assessment

The most important current risk is that Firebase Admin operations are exposed without server-side authentication or authorization.

### Critical

1. **Arbitrary Firestore access:** any caller can submit a document path to `/read` or `/write`. Because the server uses Admin SDK credentials, Firestore security rules do not constrain these operations.
2. **Password-hash disclosure and modification:** the same generic endpoints can access `auth/*`. Unsalted SHA-256 hashes are fast to crack and act as password verifiers.
3. **Client-only identity:** the `user` and `uid` cookies are forgeable; neither submission attribution nor debug authorization is trustworthy.

### High

1. No rate limiting exists on login, registration, reads, or writes.
2. Registration is public and the custom hash write is non-atomic.
3. API input has no schema, size, path, or ownership validation beyond basic truthiness.
4. Debug UID data and privileged UI capability are exposed publicly and enforced only in the client.

### Recommended target authentication design

Use Firebase Authentication end to end:

1. Sign up and sign in with the Firebase client SDK over Firebase's supported APIs.
2. Obtain a Firebase ID token in the browser.
3. Send `Authorization: Bearer <ID token>` to the Express API.
4. Verify it with `admin.auth().verifyIdToken()` in middleware.
5. Derive `uid`/display identity server-side and authorize explicit operations.
6. Remove the `auth/{name}` collection and all custom SHA-256 handling.
7. Replace generic path-based endpoints with purpose-specific, schema-validated routes.

Privileged roles should use Firebase custom claims or a protected roles collection evaluated by the server.

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
9. **Error-state inversion:** in the scouting forms, `sent` naming/rendering is inconsistent; the warning can be set or cleared contrary to the explanatory text.

A safer record layout would be:

```text
events/{eventId}/matches/{matchId}/observations/{submissionId}
events/{eventId}/pitObservations/{teamNumber}
```

Each observation should include `createdAt: FieldValue.serverTimestamp()`, authenticated `scoutUid`, `schemaVersion`, team/match identifiers, and a client-generated idempotency key. Team discovery should use queries or transactional/atomic data structures rather than a shared array index.

## 11. Testing and quality status

No automated unit, component, API integration, end-to-end, or security tests are present in the repository. The frontend defines development, build, lint, and preview scripts. The backend defines `npm run dev` using nodemon and `npm start` using Node in production mode.

Recommended minimum coverage:

- component tests for numeric bounds, binary mapping, and checkbox updates;
- form tests for required fields and serialized schemas;
- offline tests for save, retry, success marking, deletion, and pit/match routing;
- API tests for authentication, authorization, schema rejection, and Firebase failures;
- concurrency/idempotency tests for repeated submissions;
- end-to-end login and scouting workflows;
- deployment smoke tests for `/`, direct SPA routes, API health, and CORS.

After dependencies were installed, the production frontend build completed successfully. ESLint still reports existing source-quality errors and warnings unrelated to the environment configuration. Verify the current state with:

```bash
npm --prefix frontend run build
npm --prefix frontend run lint
```

## 12. Recommended improvement roadmap

### Phase 1: secure the boundary

- Replace custom password verification with Firebase Authentication and backend-verified sessions.
- Remove password hashes from Firestore.
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
- verify direct navigation to every SPA route;
- test login, match scouting, pit scouting, offline save, and retry on representative mobile devices;
- confirm Firestore paths and data are isolated to the intended event;
- test duplicate team/match submissions and decide the desired conflict behavior;
- verify debug/seeding capability is unavailable to ordinary users;
- export or back up existing scouting data;
- monitor API errors, authentication failures, and rejected submissions during the event.

## 14. Source-to-responsibility index

| Source | Primary responsibility |
|---|---|
| `backend/server.js` | API, Firebase Admin initialization, Firestore access, account operations |
| `frontend/src/App.tsx` | Route composition |
| `frontend/src/pages/Home.tsx` | Authentication redirect, navigation, debug flag |
| `frontend/src/pages/MatchForm.tsx` | Match state, game rules, serialization, local/API submit |
| `frontend/src/pages/pitScoutingForm.tsx` | Pit state, serialization, local/API submit |
| `frontend/src/pages/LocalStored.tsx` | Local record inspection and retry |
| `frontend/src/pages/Login.tsx` | Login UI |
| `frontend/src/pages/Signup.tsx` | Registration UI and client validation |
| `frontend/src/scripts/firebase.tsx` | API client, team-index update, custom password hash |
| `frontend/src/scripts/user.tsx` | Cookie creation/read/delete |
| `frontend/src/scripts/seed.tsx` | Synthetic match-record generator |
| `frontend/src/components/*` | Reusable scouting inputs and footer |
