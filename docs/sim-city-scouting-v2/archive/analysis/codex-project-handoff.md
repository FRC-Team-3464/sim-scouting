# Sim-City Scouting v2 — Codex Project Handoff

> Archived repository handoff. Its open questions and file map are historical, not current requirements.

> **Audience:** A fresh Codex session that has repository access but no access to
> the v0 conversation or prior reasoning. This document is the entry point.
>
> **Repository analyzed:** `FRC-Team-3464/sim-scouting`, branch
> `feat/firebase-session-auth`.
>
> **Status of this document:** Historical onboarding inventory, corrected by the
> Phase 1.6 ADRs and contracts. Grounded in the repository state on the recorded
> branch plus documents now under `docs/sim-city-scouting-v2/`. Where a
> statement is a *proposal* rather than a confirmed repository fact, it is marked
> **(PROPOSED)**. Codex must still independently verify before implementing.

---

## 1. Product overview

**What it is.** Sim-City Scouting is a FIRST Robotics Competition (FRC) scouting
web application built by FRC Team 3464. Scouts record how robots perform during
matches ("match scouting") and record robot capabilities in the pits ("pit
scouting"). The collected data supports alliance strategy and pick-list
decisions. The repo title in `frontend/index.html` is `3464 Scouting`.

**Who uses it.**
- **Scouts** — students recording match/pit observations, often on phones/tablets on
  a venue floor with unreliable connectivity.
- **Strategists / drive team** — consume aggregated scouting data (today this is
  minimal; a richer strategy surface is a v2 goal).
- **Administrators / leads** — manage accounts and data integrity.

**Why the existing application is being replaced.** The current match-scouting
experience is a long, single-column form with two stacked wrapping tab rows,
one input per screenful, zero-valued numeric defaults, ambiguous Yes/No
defaults, per-ball counters, and no live-match flow. Confirmed data-integrity
defects exist (weak validation, record-key collisions, no idempotency — see
§4). The credentialing path includes an insecure legacy SHA-256 flow (§4).

**Why a greenfield rewrite with controlled legacy transition.** The data
structures currently written to Firestore are not analytics-grade and cannot be
evolved in place without carrying forward invalid shapes. The team decision
(recorded in `docs/sim-city-scouting-v2/`) is to build a new v2 data model and API and
**not** maintain backward compatibility with the legacy record shape. The
transition is "controlled" in that the **existing Firebase session-cookie + CSRF
authentication layer is deliberately reused** (it is recent, tested work on this
branch), while the legacy generic data path and legacy credential path are
removed.

**Intended v2 workspaces (PROPOSED product structure).**
- **Scout** — assignment-driven match scouting and team/event-based pit scouting,
  offline-first.
- **Strategy** — aggregated team/match analytics, consensus views, pick-list
  support.
- **Event Management** — event packages, schedules, scouting assignments.
- **Administration** — accounts, roles, data integrity/oversight.

These four workspaces are an approved *direction*, not an implemented feature
set. None exist in the repository today.

---

## 2. Repository map

Monorepo. Root `package.json` orchestrates the backend; `frontend/` is a nested
package with its own `package.json`. Paths below are confirmed to exist on the
analyzed branch.

### Frontend (`frontend/`)
| Path | Responsibility (confirmed) |
|---|---|
| `index.html` | Vite HTML entry. Title `3464 Scouting`, favicon `/file.svg`, mounts `#root`. **No manifest link, no service-worker registration.** |
| `src/main.tsx` | React entry. `createRoot(...).render(<StrictMode><App/></StrictMode>)`. |
| `src/App.tsx` | Router root. `BrowserRouter` + `AuthenticationProvider` + `Routes`. Public: `/login`, `/signup`. Legacy redirects: `/stored`→`/local-data`, `/pitScouting`→`/pit`. Protected (via `ProtectedRoute`): `/`, `/local-data`. Protected + `FreshSessionRoute`: `/match`, `/pit`. Renders a sticky `Footer`. |
| `src/routes.ts` | `APP_ROUTES` (canonical lowercase browser paths) and `LEGACY_APP_ROUTES` (redirect sources). Comment explicitly notes API endpoints and Firestore paths are separate contracts. |
| `src/routes.test.ts` | Tests for the route map. |
| `src/pages/Home.tsx` | Post-login landing (Scout / View Local Data / Pit scouting / Sign out). |
| `src/pages/MatchForm.tsx` | Match scouting page — the tabbed Setup/Auto/Teleop/Endgame/Finale form (~669 lines). Primary legacy UX under replacement. |
| `src/pages/pitScoutingForm.tsx` | Pit scouting form. |
| `src/pages/LocalStored.tsx` | "View Local Data" page reading LocalStorage; includes a seed/debug path. |
| `src/pages/Login.tsx`, `src/pages/Signup.tsx` | Auth screens. |
| `src/pages/authentication-pages.test.tsx`, `src/pages/scouting-submission.test.tsx` | Page-level tests. |
| `src/api/client.ts` | **Central HTTP client.** `apiRequest<T>()`, `ApiError`, in-memory CSRF token cache (`getCsrfToken`), `credentials: "include"`, retry policy (safe methods retry transient/5xx twice; mutations never retried on network/5xx; 401 retried up to twice only after successful reauth). Never reads HttpOnly cookies. |
| `src/api/client.test.ts` | HTTP client tests. |
| `src/api/scouting.ts` | Scouting-specific API calls layered on `client.ts`. |
| `src/scripts/config.ts` | Reads `VITE_API_BASE_URL` (throws if missing), normalizes trailing slash → `API_BASE_URL`. |
| `src/scripts/seed.tsx` | Debug/seed helper. |
| `src/auth/AuthenticationProvider.tsx` | Session lifecycle provider: startup restoration via `GET /auth/session`, warning/expiration timers from server timestamps, in-place reauthentication modal coordination, `login`/`register`/`logout`/`refreshSession`. Validates session shape. |
| `src/auth/ProtectedRoute.tsx` | Gates authenticated routes. |
| `src/auth/FreshSessionRoute.tsx` | Requires a fresh (non-expiring) session before `/match` and `/pit`. |
| `src/auth/ReauthenticationModal.tsx`, `SessionExpirationWarning.tsx` | Reauth UI. |
| `src/auth/auth-context.ts`, `use-authentication.ts`, `types.ts` | Auth context, hook, and types. |
| `src/auth/AuthenticationProvider.test.tsx` | Provider tests. |
| `src/components/*` | Shared inputs: `BinaryChoice`, `CounterInput`, `MultiCounterInput`, `IntegerInput`, `Dropdown`, `CheckboxDropdown`, `AutoResizeTextArea`, `Footer`. |
| `src/index.css` | `@import 'tailwindcss';` + `html` background `#171717`, Inter font, custom scrollbar. |
| `src/test/setup.ts` | Vitest + Testing Library setup. |
| `vite.config.ts` | Vite + Vitest config: `@vitejs/plugin-react`, `@tailwindcss/vite`; test env `jsdom`, `setupFiles`, `restoreMocks`. |
| `tsconfig*.json`, `eslint.config.js` | TS project refs and ESLint flat config. |

**State management (confirmed):** React local state + React Context
(`AuthenticationContext`). No Redux/Zustand/RTK. No SWR/React Query. Data
fetching is direct `apiRequest` calls.

**PWA configuration (confirmed ABSENT):** No `manifest.webmanifest`, no service
worker, no `vite-plugin-pwa`, no `registerSW`, no Workbox. `public/` contains
only `file.svg`. **All PWA/offline capability described in product docs is
PROPOSED and unbuilt.**

### Backend (`backend/`) and API entry (`api/`)
| Path | Responsibility (confirmed) |
|---|---|
| `backend/app.js` | Builds the Express `app`: JSON + cookie-parser, CORS (credentialed, single origin from config), mounts `/api/auth` (auth router) and `/api` (legacy router). Contains legacy `read`, `/write`, `/login`, `/register` handlers inline, plus a local `sha256()` helper. Exports `app` (no `listen`). |
| `backend/server.js` | Local dev entry that imports `app` and calls `listen(PORT)`. |
| `api/index.js` | Vercel Function entry: `import app from "../backend/app.js"; export default app;`. |
| `backend/routes/auth.js` | Modern auth router: `GET /csrf`, `POST /register`, `POST /login`, `POST /logout`, `GET /session`. |
| `backend/middleware/require-authentication.js` | `createRequireAuthentication({ auth })`: verifies the session cookie (revocation-checked) and attaches `req.user`. |
| `backend/middleware/csrf.js` | `createCsrfProtection({ configuration })`: signed double-submit CSRF (`protectJsonRequest`), Origin match. |
| `backend/auth/session.js` | Session-cookie create/verify wrappers over Firebase Admin. |
| `backend/auth/firebase-auth-rest.js` | Server-side password → Firebase ID-token exchange (Firebase Auth REST). |
| `backend/firebase.js` | `initializeFirebase(serviceAccountKey)`: idempotent Firebase Admin init from a JSON service account; returns `{ auth, db }`. Firebase Admin 13.6 modular API (temporary Vercel compatibility pin). |
| `backend/config.js` | `loadConfiguration()` / `validateConfiguration()`: strict env validation (port, CORS origin, session durations, cookie security, `CSRF_SECRET` 64-hex, `FIREBASE_WEB_API_KEY`, `SERVICE_ACCOUNT_KEY`). |
| `backend/data/scouting-record.js` | `createAuthenticatedScoutingRecord(...)` (strips client identity, sets server uid/name/`submittedAt`) and `isSharedTeamIndexPath(...)`. |
| `backend/scripts/set-debug-claim.js` | Admin script to set a `debug` custom claim. |
| `backend/test/*.test.js` | Backend unit tests: auth routes, config, csrf, deployment-config, firebase-auth-rest, firebase, require-authentication, scouting-record, session, set-debug-claim. |

### Root / deployment
| Path | Responsibility (confirmed) |
|---|---|
| `package.json` (root) | Backend package + scripts. |
| `vercel.json` | `installCommand` installs root + `frontend`; `buildCommand` builds frontend; `outputDirectory` `frontend/dist`; rewrites `/api/:path*` → `/api/index` and everything else → `/index.html` (SPA). |
| `.env.development.example`, `.env.production.example` | Backend env templates. |
| `frontend/.env.*.example` | Frontend env templates (`VITE_API_BASE_URL`). |
| `TECHNICAL_DOCUMENTATION.md` | Large existing technical doc (background; not authoritative over current code). |
| `docs/platform/deployment/deployment-setup.md`, `docs/platform/proposals/firebase-session-authentication.md`, `docs/platform/technical-debt/frontend-lint-baseline.md` | Existing platform docs. |
| `notafrontend/index.html` | 16-byte placeholder; not part of the app. |

**Environment configuration (confirmed):** Backend requires `PORT`,
`CORS_ALLOWED_ORIGIN`, `SERVICE_ACCOUNT_KEY` (JSON), `FIREBASE_WEB_API_KEY`,
`SESSION_DURATION_MINUTES`, `SESSION_EXPIRATION_WARNING_MINUTES`,
`SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAME_SITE`, `CSRF_SECRET` (64 hex).
Frontend requires `VITE_API_BASE_URL`.

---

## 3. Existing architecture

### Confirmed (read from source)

**React + Vite.** React 19 + TypeScript, Vite 7, React Router 7 (`BrowserRouter`).
Entry `main.tsx` → `App.tsx`. Client-only SPA; **no SSR, no React Server
Components**. State is local + Context.

**Tailwind.** Tailwind CSS **v4**, integrated via the `@tailwindcss/vite` plugin
and `@import 'tailwindcss';` in `src/index.css`. **No `tailwind.config.js`** —
theme is CSS-first per Tailwind v4.

**Node/Express.** Express app in `backend/app.js`, exported without `listen`.
Two execution modes share the same app: `backend/server.js` (local `listen`) and
`api/index.js` (Vercel Function default export). CORS is credentialed and
restricted to one configured origin.

**Authentication flow.** Firebase Authentication is the credential store.
`POST /api/auth/login` exchanges email/password for a Firebase ID token
server-side (`firebase-auth-rest.js`), then mints a **Firebase session cookie**
(`session.js`) set as **HttpOnly**. `GET /api/auth/session` returns the public
user shape + `sessionExpiresAt` + `sessionExpirationWarningAt`. The React
`AuthenticationProvider` restores state on startup, schedules warning/expiry
timers, and drives in-place reauthentication so an active form is not unmounted.

**Session-cookie behavior.** Verified on each protected request via
`verifySessionCookie(cookie, true)` (revocation checking on), so
disabled/revoked users are rejected. Firebase ID tokens are never returned to
the browser; the browser only ever holds the HttpOnly cookie.

**CSRF behavior.** Signed double-submit: an HttpOnly binding cookie plus a
JS-readable token cookie; header `X-CSRF-Token` echoes the token; token is
HMAC-signed and bound to the session; exact `Origin` match required. All
state-changing routes require it. `client.ts` fetches the token lazily, caches
it in memory, and invalidates it on login/register/logout.

**Firestore collections (confirmed in legacy write paths).** Access is
server-only via Firebase Admin. Legacy paths observed:
- Match/pit scouting documents written through generic `POST /api/write` at a
  client-supplied `path` (e.g. `{teamNumber}/{matchNumber}`, `pitScouting/{teamNumber}`).
- A shared team-index document (`isSharedTeamIndexPath`) updated by read-modify-write.
- `auth/{displayName}` documents holding a SHA-256 password hash used only by the
  **legacy** `POST /api/login`.
> Exact collection names/structures are dynamic because the legacy API writes to
> a client-provided path. Codex must confirm live Firestore structure directly.

**Match scouting submission flow (confirmed).** `MatchForm.tsx` collects tabbed
form state → `src/api/scouting.ts` → `apiRequest` → legacy generic `POST
/api/write` with a `path` + `data`. Server wraps non-index writes with
`createAuthenticatedScoutingRecord` (strips client identity, stamps server uid/
name/`submittedAt`) and `set(..., { merge: true })`.

**Pit scouting submission flow (confirmed).** `pitScoutingForm.tsx` → same
generic write path. The UI contains a **Match Number** field (`matchNumber`
state + `IntegerInput`) and that value **is included in the submitted `data`
payload**, but the Firestore document path is keyed by team only
(`pitScouting/{teamNumber}`) — not by match. Codex must verify whether the
submitted `matchNumber` is read/queried anywhere or is effectively dead data.

**Local persistence behavior (confirmed).** Match data is mirrored to
LocalStorage keyed roughly as `scoutData-{teamNumber}-{matchNumber}`;
`LocalStored.tsx` reads and renders it. No IndexedDB, no outbox, no sync-status
tracking.

**Error handling (confirmed).** `ApiError` carries a safe public message + status;
`client.ts` centralizes retry and never attaches credentials to errors. Backend
handlers log categorized server errors and return generic messages.

**Deployment assumptions (confirmed).** Single Vercel project. React built to
`frontend/dist` and served statically; `/api/*` rewritten to the single
serverless function `api/index`. In production, React and the API share one
origin (so cross-origin cookie permission is unnecessary); credentialed CORS
exists for local dev where Vite and Express differ in origin.

### PROPOSED (in `docs/sim-city-scouting-v2/`, NOT in code)

v2 endpoints under `/api/scouting/*`, analytics-grade Firestore collections
(`seasons`, `events`, `matchScouting` + `observations` subcollection,
`matchConsensus`, `pitScouting`, `teams`), IndexedDB outbox, service-worker
caching, assignment-driven flow, timestamped observation events, versioned
season packages, cached event packages, multiple scouts per robot with derived
consensus. All are design targets requiring Codex validation before build.

---

## 4. Legacy weaknesses (confirmed, with file references)

1. **Manual event/match/team entry.** `MatchForm.tsx` / `pitScoutingForm.tsx`
   require typing event, match, and team numbers instead of selecting from a
   schedule/assignment.
2. **Zero-valued defaults.** Numeric fields default to `0` (visible in the
   screenshots and `MatchForm.tsx`), making "not entered" indistinguishable from
   a real zero.
3. **Weak validation.** Effective client check is only non-empty event;
   `teamNumber`/`matchNumber` initialize to `0` yet are checked against `null`,
   so `0` passes. (`MatchForm.tsx` submit logic.)
4. **Ambiguous Yes/No defaults.** Boolean questions default to a concrete value
   (`BinaryChoice` usage in `MatchForm.tsx`), so "unanswered" is silently
   recorded as a real answer.
5. **Form-driven match scouting.** `MatchForm.tsx` is a static multi-tab form,
   not a time-aware live-match capture flow.
6. **Teleop shift navigation.** A second wrapping sub-tab row (Tran/Shift 1–4)
   inside the Teleop tab (`MatchForm.tsx`) causes heavy nesting and scrolling.
7. **Legacy record-key collisions.** Generic writes to `{teamNumber}/{matchNumber}`
   (no event in the key) with `merge: true` (`backend/app.js` `/write`) let two
   scouts, or the same team+match at different events, overwrite each other.
8. **LocalStorage limitations.** `scoutData-{team}-{match}` keys collide across
   events; unguarded parsing; no capacity/lifecycle management (`LocalStored.tsx`).
9. **Missing idempotency.** No submission id / dedupe key anywhere in
   `scouting.ts` or `backend/app.js`; a retried upload can duplicate or clobber.
10. **Missing assignment model.** Nothing maps a scout to a specific robot/match;
    scouts self-select what to record.
11. **Missing offline lifecycle.** No queue/outbox/sync-status; a failed upload
    just leaves data in LocalStorage (`client.ts`, `LocalStored.tsx`).
12. **Pit Scouting limitations.** The current Pit Scouting UI
    (`pitScoutingForm.tsx`, screenshot) contains a Match Number field, and that
    value is included in the submitted payload, but the submission path appears
    to be primarily keyed by team (`pitScouting/{teamNumber}`). Codex must verify
    whether the field is submitted, ignored, or used elsewhere. Conceptually, pit
    scouting is team/event based, so a per-match number is likely inappropriate.
13. **Responsive design limitations.** Single-column, low-density layouts with
    excessive vertical scrolling (screenshots; `MatchForm.tsx`).
14. **Legacy authentication/data routes that must be removed.** In
    `backend/app.js`: generic `POST /api/read`, `POST /api/write`, and legacy
    `POST /api/login` (compares an unsalted SHA-256 hash from `auth/{displayName}`)
    and `POST /api/register`. The SHA-256 credential path is a security liability
    and is superseded by `/api/auth/*`.

---

## 5. Approved target architecture

- **React + TypeScript + Vite** SPA (no framework change).
- **Tailwind CSS v4** (CSS-first, `@tailwindcss/vite`; no `tailwind.config.js`).
- **Node/Express API** as the only path to data.
- **Firestore accessed through Node only** — the browser never talks to Firestore
  or Firebase directly.
- **Firebase Authentication with HttpOnly session cookies** — reuse the existing
  `/api/auth/*` layer, `session.js`, `require-authentication.js`.
- **Existing CSRF model** (`csrf.js`) reused for all mutations.
- **IndexedDB offline database** for local records/queue (replaces LocalStorage).
- **Outbox synchronization** with explicit per-record sync state.
- **Service-worker application-shell caching** for offline load.
- **Assignment-driven scouting** — match context derived from assignments/schedules.
- **Timestamped observation events** — append-only event log per record.
- **Server-authoritative validation and attribution** — server owns identity,
  timestamps, keys, and validation.
- **Versioned season packages** — season vocabulary as data (`schemaVersion`/`seasonKey`).
- **Event packages cached for offline use** — schedules/teams/alliances prefetched.
- **Multiple scouts per robot** with **derived consensus**.
- **Explicit non-goals:** no Next.js, no React Server Components, no Supabase, no
  direct browser-to-Firestore access.

---

## 6. Approved product decisions

1. Legacy UI (screens/screenshots) is **reference material, not the target**.
2. New writes use **v2 contracts only** — no backward compatibility with the
   legacy record shape; invalid legacy structures are not carried forward.
3. **Reuse existing authentication/session infrastructure when safe** (the
   `/api/auth/*` + session-cookie + CSRF layer).
4. **Match context is derived from assignments and schedules**, not typed.
5. **Manual entry is a fallback**, clearly marked, and validated.
6. **Unanswered must never default to `false` or `0`** — it is a distinct state.
7. **Zones are the default spatial input**; **coordinates are optional**.
8. **Scouting methods are season-configurable** via the season package.
9. **Exact vs batch/volley capture requires validation** before being locked
   (see the method-validation plan in `docs/`).
10. **Device-local sync status is not a server record field** — it lives only in
    the client IndexedDB/outbox.
11. **Pit Scouting is team/event based and does not require a match number.**
12. **v0 owns visual design exploration.**
13. **Codex owns implementation and architecture validation.**

---

## 7. Unresolved architecture decisions (NOT approved — open questions)

Codex must resolve these in an analysis pass (see §10) and record decisions as
ADRs. None of the following is settled:

- **Canonical record identity** — exact composite key / document id for a match
  record (candidate: eventKey + competitionLevel + set + match + replay + team +
  scout, but not finalized).
- **Idempotency** — where the dedupe key is generated, how long it is honored,
  and server enforcement semantics.
- **Revisions** — how corrections supersede prior observations/records (soft
  supersede vs void vs version counter).
- **Assignment model** — schema, who creates assignments, how a device claims one.
- **Event package structure** — fields, source (TBA/FIRST/manual), refresh policy.
- **Season package contract** — schema-as-data shape and how the server validates
  submissions against the exact version the client rendered.
- **Submission atomicity** — record + observations + team-index update as one
  transaction vs staged writes.
- **Consensus recomputation** — when/where derived consensus is computed
  (write-time vs read-time vs scheduled).
- **Legacy-data access — RESOLVED:** v2 does not preserve, read, adapt, import,
  or analyze historical legacy scouting data.
- **Pit photo storage** — whether pit scouting stores images and where.
- **QR transfer attribution** — how a relayed offline record is attributed (relay
  operator session vs signed hand-off token).
- **Role permissions** — the role model for Scout/Strategy/Event Mgmt/Admin and
  its enforcement.
- **Match timing** — source of the match clock / `elapsedMatchMs` and how phases
  (auto/teleop/endgame) are delimited.
- **Capture-method validation** — the empirical thresholds that decide exact vs
  volley fuel, zones vs coordinates, etc.

---

## 8. v0 design status

- **Phases completed by v0:** analysis and specification documentation only. No
  application code was written to the repository by v0.
- **Selected design direction:** **none yet.** Visual design directions
  (Phase 3) have not been produced or chosen.
- **Components/screens v0 generated:** none. v0 produced Markdown specs, not
  React components.
- **Branch/files containing v0 work:** documentation under `docs/sim-city-scouting-v2/`
  (this handoff) and related product, architecture, and validation documents
  in the v0 working project). No feature branch of implementation exists.
- **Conceptual vs implementation-ready:** everything from v0 is **conceptual**.
  The confirmed repository behavior in §2–§4 is the only implementation-ready
  ground truth.
- **Known design assumptions Codex must validate:** the four-workspace model, the
  assignment-driven flow, IndexedDB+outbox offline model, season/event package
  shapes, and the v2 Firestore layout are all proposals subject to §7.

---

## 9. Codex responsibilities

1. **Read the project documentation** in `docs/sim-city-scouting-v2/` and related planning
   docs before acting.
2. **Inspect the repository independently** — do not trust this document over the
   live code.
3. **Verify every repository-related claim** here against source on the analyzed
   branch.
4. **Report contradictions before implementation** — if code and docs disagree,
   surface it; do not silently pick one.
5. **Create architecture decision records (ADRs)** for each item in §7 before
   building the corresponding slice.
6. **Work in small vertical slices** — one thin end-to-end capability at a time.
7. **Preserve the approved stack** (§5) — no Next.js, RSC, Supabase, or
   browser-to-Firestore.
8. **Add tests with implementation** — match the existing Vitest (frontend) and
   Node test (backend) conventions.
9. **Do not blindly accept generated v0 code** — treat any v0 UI as a design
   reference to be re-implemented to spec and validated.
10. **Do not modify unrelated legacy code** beyond the approved removals.
11. **Never expose Firebase service credentials to the browser** —
    `SERVICE_ACCOUNT_KEY` and Admin SDK stay server-side only.
12. **Never use the `debug` flag as authorization** — `debug` is a frontend
    feature flag only and must never bypass auth, attribution, or server
    validation.

---

## 10. Recommended first Codex task (Phase 1.6 — analysis only)

Produce an **analysis-and-decision document plus ADRs** (no production code) that
resolves the following, grounded in live repository inspection and the approved
docs:

- **Migration policy** — implement the approved clean break: no legacy-data
  preservation, adapter, import, or analytics inclusion.
- **Record identity** — finalize the canonical match/pit document key.
- **Assignment model** — define the assignment schema and lifecycle.
- **Event package model** — define structure, source, and refresh.
- **Season package contract** — define the schema-as-data format and
  server-side validation binding.
- **Local vs server state** — confirm sync status is client-only; define the
  IndexedDB/outbox schema boundary.
- **Submission transactions** — decide atomicity for record + observations +
  indexes.
- **Pit Scouting model** — finalize team/event key (no match number) and photo
  handling.
- **Roles and permissions** — define the role model and enforcement points.

**Constraint:** Codex must **not** implement production code during this task.
Deliverables are decision records and a slice-by-slice implementation plan for
review. A tiny throwaway spike is acceptable only if clearly isolated and not
merged as product code.

---

## 11. Terminology

- **Match scouting** — recording one robot's performance during one match.
- **Pit scouting** — recording a team's robot capabilities in the pits; keyed by
  team + event, **no match number**.
- **Scout** — the person recording observations.
- **Assignment** — a server-defined mapping of a scout/device to a specific robot
  in a specific match (PROPOSED; not in repo).
- **Observation event** — a timestamped, append-only record of a single in-match
  action (PROPOSED).
- **Season package** — versioned, data-driven definition of a season's scouting
  vocabulary/fields (PROPOSED).
- **Event package** — cached schedule/teams/alliances/results for an event
  (PROPOSED).
- **Consensus** — a derived reconciliation across multiple scouts of the same
  robot/match (PROPOSED).
- **Outbox** — client-side queue of records awaiting upload, with sync status
  (PROPOSED; client-only).
- **Zone** — a coarse named field region; the **default** spatial input.
- **Coordinate** — an optional normalized `(x, y)` point on the field.
- **Session cookie** — HttpOnly Firebase session cookie set by the Node API
  (confirmed).
- **CSRF token** — signed double-submit token required on mutations (confirmed).
- **`debug` claim/flag** — a feature flag surfaced in the session; **not**
  authorization (confirmed).
- **v2** — the new, analytics-grade data model and API being designed.
- **Legacy** — the current implementation on the analyzed branch, including the
  generic `/api/read` + `/api/write` and SHA-256 `/api/login` paths.

---

## 12. Source-of-truth hierarchy

When sources conflict, Codex must **report the conflict** rather than silently
choosing. Priority order (highest first):

1. **Confirmed current repository behavior** (source code on the analyzed branch).
2. **Approved architecture-decision documents** (ADRs in `docs/sim-city-scouting-v2/architecture/adrs/`).
3. **Approved product-analysis documents** (e.g. Phase 1.5 analysis).
4. **Approved v0 design specifications** (once produced/approved).
5. **Legacy screenshots and legacy requirements** (lowest — reference only).

---

## Appendix — Repository details that could NOT be confirmed

The following require live verification by Codex (repository access + Firestore
console); they are **not** confirmable from the analyzed branch alone:

1. **Live Firestore collection names/shapes.** The legacy API writes to a
   client-supplied `path`, so actual production collection structure is dynamic
   and must be read from the live database, not inferred from code.
2. **The shared team-index document path/shape.** Gated by
   `isSharedTeamIndexPath` (in `backend/data/scouting-record.js`) — the exact
   matching rule and document contents were not fully read; verify in source.
3. **Exact `MatchForm.tsx` field-by-field submission mapping.** ~669 lines; the
   full field list and every conditional were not exhaustively transcribed here.
   Verify against source before modeling v2 fields.
4. **`src/api/scouting.ts` exact endpoints/payloads.** Confirmed to layer on
   `client.ts`; the precise call signatures were not fully quoted — verify.
5. **Whether any environment already has production data** and its volume — not
   determinable from the repository.
6. **CI / GitHub Actions / deployment protections** — no workflow files were
   inspected; confirm before assuming test gates exist.
7. **TBA/FIRST API access** (keys, rate limits) for event packages — no
   integration exists in the repo; entirely PROPOSED.
8. **Any existing role/claims beyond `debug`** — only the `debug` custom claim
   (`backend/scripts/set-debug-claim.js`) was confirmed; a broader role model is
   not present.
