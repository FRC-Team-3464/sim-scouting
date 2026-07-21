# Sim City Scouting — Data Model & API Specification (v2)

Status: Draft for review. No implementation yet.
Applies to: `FRC-Team-3464/sim-scouting` (React + Vite frontend → Node/Express backend → Firestore).

This spec defines a clean-break redesign. There is **no backward compatibility** with the
legacy generic `/read`+`/write` passthrough, the legacy `/login`/`/register` routes, or the
`auth/{name}` SHA-256 credential collection. Those are removed. The existing Firebase
**session-cookie + CSRF** auth layer (`/api/auth/*`, `session.js`, `csrf.js`,
`require-authentication.js`) is **kept and reused**.

---

## 1. Goals

1. **Analytics-first.** Store an immutable event log plus a query-friendly derived rollup.
2. **Coded, stable keys.** No free-text where an enum or number belongs.
3. **Explicit "unanswered."** Missing data is queryable as missing — never defaulted to `false`/`0`.
4. **Estimates carry uncertainty.** Fuel/volley counts are ranges + confidence, not fake-exact integers.
5. **Season-versioned.** `schemaVersion` + `seasonKey` on every doc; the season vocabulary lives in Firestore as data.
6. **Server owns identity, time, keys, and validation.** Client attribution is never trusted.
7. **Multiple scouts per robot are first-class.** One record per scout; agreement/consensus is derived.

---

## 2. Architecture (unchanged data path)

```
React (Vite)  →  Node/Express (/api)  →  Firestore
     |                  |
     |                  └── Firebase Admin SDK (server only)
     └── never touches Firestore / Firebase tokens directly
```

Auth chain reused as-is:
- `GET  /api/auth/csrf` → issues signed double-submit CSRF token
- `POST /api/auth/register` → `auth.createUser` (Firebase Authentication)
- `POST /api/auth/login` → Firebase REST password exchange → HttpOnly session cookie
- `POST /api/auth/logout` → session revocation
- `GET  /api/auth/session` → current session
- `createRequireAuthentication` middleware → verifies session cookie, attaches `request.user`

All `/api/scouting/*` mutations run behind `requireAuth` **and** CSRF, identical to the auth router's protected mutations.

---

## 3. Firestore collection layout

```
seasons/{seasonKey}                         // versioned game vocabulary (schema-as-data) — §4
events/{eventKey}                           // prefetched TBA/FIRST context (teams, schedule, alliances) — §4a
matchScouting/{recordId}                    // one doc per (scout × robot × match)
  observations/{observationId}              // subcollection: append-only observation log
matchConsensus/{naturalKey}                 // derived agreement layer across scouts (server-written)
pitScouting/{eventKey}_{teamNumber}         // one doc per team per event
teams/{teamNumber}                          // cross-event team profile (derived + pit)
```

---

## 4. `seasons/{seasonKey}` — schema as data

The season vocabulary is stored, not hardcoded, so year-over-year changes need no redeploy.
The server loads and caches it, and validates every submission against it.

```jsonc
{
  "seasonKey": "2026",
  "schemaVersion": 2,
  "displayName": "2026 Game",
  "zones": [
    { "id": "near_hub",  "label": "Near HUB" },
    { "id": "mid_field", "label": "Mid Field" },
    { "id": "far_zone",  "label": "Far Zone" }
  ],
  "climbResults": ["none", "attempted_failed", "low", "mid", "high"],
  "fuelAccuracyBuckets": ["none", "some", "most", "all"],
  "issueTypes": [
    { "id": "tipped",        "label": "Tipped over",   "severity": "high"   },
    { "id": "died",          "label": "Lost power",    "severity": "high"   },
    { "id": "comms",         "label": "Comms drop",    "severity": "med"    },
    { "id": "mechanism",     "label": "Mechanism jam", "severity": "med"    },
    { "id": "other",         "label": "Other",         "requiresNote": true }
  ],
  "ratingScale": { "min": 0, "max": 4, "anchors": { "0": "None", "2": "Average", "4": "Dominant" }, "allowNotObserved": true },
  "eventTypes": ["auto_line_cross","fuel_volley","climb_state","collection","defense","issue","note"]
}
```

Validation rule: any coded value submitted by a client (zoneId, climbResult, issueType, eventType,
accuracy bucket) MUST exist in the referenced `seasons/{seasonKey}` doc, or the write is rejected.

---

## 4a. `events/{eventKey}` — prefetched TBA / FIRST context

Populated server-side by the TBA Sync Engine (PRD §3) and cached in Firestore so devices can
pre-download an event package before going offline. Scouts **confirm** this data rather than typing
it; manual entry is a clearly-flagged fallback. The client fetches it via `GET /api/scouting/event/:eventKey`.

```jsonc
{
  "eventKey": "2026dal",
  "seasonKey": "2026",
  "schemaVersion": 2,
  "name": "Dallas Regional",
  "source": "tba",                    // tba | first | manual
  "lastSyncedAt": "<serverTimestamp>",
  "teams": [3464, 118, 148],          // numbers
  "matches": [
    {
      "competitionLevel": "qm",
      "setNumber": 1,
      "matchNumber": 42,
      "replayNumber": 1,
      "red":  { "teams": [3464, 118, 148], "score": null },
      "blue": { "teams": [254, 1114, 971], "score": null },
      "scheduledStartMs": 1740000000000,
      "actualStartMs": null,
      "status": "scheduled"           // scheduled | in_progress | complete | replayed
    }
  ],
  "rankings": [ { "teamNumber": 3464, "rank": 5, "rankingPoints": 18 } ]
}
```

The scout's `driverStation` + `allianceColor` (§5) are **derived** from this schedule, not scouted.
Official scores/rankings live here so scouted data is never expected to duplicate them.

---

## 5. `matchScouting/{recordId}` — the record

```jsonc
{
  "recordId": "uuid-v4",
  "schemaVersion": 2,
  "seasonKey": "2026",

  // --- Coded identity (indexed) ---
  "eventKey": "2026dal",
  "competitionLevel": "qm",        // qm | qf | sf | f
  "setNumber": 1,
  "matchNumber": 42,
  "replayNumber": 1,
  "teamNumber": 3464,              // number
  "allianceColor": "red",          // red | blue | unknown
  "driverStation": 2,              // 1 | 2 | 3 | null

  // --- Server-owned attribution ---
  "scoutUid": "…",                 // from session cookie, never from body
  "scoutName": "…",
  "submittedAt": "<serverTimestamp>",
  "clientCapturedAt": 1730000000000,

  // --- Derived, server-recomputed rollup ---
  "summary": {
    "auto":    { "leftStart": true, "fuelScored": {"low":8,"high":12,"confidence":"med"}, "climbResult": "none" },
    "teleop":  { "fuelScored": {"low":40,"high":55,"confidence":"low"}, "defensePlayed": true, "defenseRating": 3 },
    "endgame": { "climbResult": "high", "climbStartMs": 128000, "climbEndMs": 141000 },
    "reliability": { "issues": ["tipped"], "unresolvedIssues": 0 },
    "dataQuality": { "unansweredCount": 2, "correctionCount": 1 }
  },

  "postMatch": {
    "notes": "",                   // max 1000 chars
    "issues": [ { "type": "tipped", "atMs": 91000, "resolved": true, "note": null } ]
  },

  "syncStatus": "synced"           // server-set on successful write
}
```

Field states use an explicit tri/quad-state where relevant:
`"unanswered" | "yes" | "no" | "not_observed"`. **Never default an unanswered field to `false`.**

---

## 6. `matchScouting/{recordId}/observations/{observationId}` — append-only log

Corrections **supersede**; they never mutate in place. Analytics can replay the raw stream.

```jsonc
{
  "observationId": "uuid-v4",
  "type": "fuel_volley",           // must be in seasons.eventTypes
  "phase": "teleop",               // auto | teleop | endgame
  "elapsedMatchMs": 73400,         // relative to match start
  "zoneId": "near_hub",            // must be in seasons.zones; primary spatial signal
  "coord": { "x": 0.62, "y": 0.31 },  // optional normalized [0,1], nullable
  "payload": { "quantity": {"low":3,"high":5}, "accuracy": "most" },
  "confidence": "med",             // low | med | high
  "source": "live",                // live | corrected | inferred
  "supersedesObservationId": null, // correction chain
  "voided": false
}
```

---

## 7. `matchConsensus/{naturalKey}` — derived agreement layer (server-written)

Because multiple scouts each submit their own record, the server derives a consensus doc keyed by
the **robot-match natural key** (no scoutUid). This is where inter-scout agreement lives.

```
naturalKey = {eventKey}_{competitionLevel}{setNumber}-{matchNumber}r{replayNumber}_team{teamNumber}
```

```jsonc
{
  "naturalKey": "2026dal_qm1-42r1_team3464",
  "eventKey": "2026dal",
  "teamNumber": 3464,
  "contributingRecordIds": ["uuid-a", "uuid-b"],
  "scoutCount": 2,
  "consensus": {
    "teleop": { "fuelScored": {"low":42,"high":52,"confidence":"med"}, "defenseRating": 3 },
    "endgame": { "climbResult": "high" }
  },
  "agreement": {
    "climbResult": { "agreement": 1.0, "values": {"high": 2} },
    "defenseRating": { "agreement": 0.5, "spread": 2 },
    "fuelScored": { "overlap": 0.7 }
  },
  "recomputedAt": "<serverTimestamp>"
}
```

Recomputed on every match record write that shares the natural key.

---

## 8. Record identity (ends the overwrite bug)

Legacy wrote to `{teamNumber}/{matchNumber}` (event omitted → cross-event collisions, and second
scout overwrote the first). New `recordId` derives from the full natural key **plus scoutUid**:

```
recordId source = (eventKey, competitionLevel, setNumber, matchNumber, replayNumber, teamNumber, scoutUid)
```

- Two scouts on the same robot → two distinct records (comparable, never merged).
- Same scout re-submitting the same match → same `recordId` → idempotent upsert, not a duplicate.
- Team-index maintenance (`datas/data.team[]` today, an untransacted read-modify-write) moves
  server-side into a **transaction / `arrayUnion`**, so concurrent scouts can't clobber the index.

---

## 9. Endpoints — `/api/scouting/*`

All mounted behind `requireAuth`. Mutations also require CSRF.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/scouting/match` | Submit/upsert one match record (idempotent) |
| `POST` | `/api/scouting/pit` | Submit/upsert one pit record |
| `GET`  | `/api/scouting/match/:recordId` | Fetch one record (owner or elevated role) |
| `GET`  | `/api/scouting/mine?eventKey=` | List caller's submissions for an event |
| `GET`  | `/api/scouting/season/:seasonKey` | Fetch the active season schema for the client |
| `GET`  | `/api/scouting/event/:eventKey` | Fetch prefetched TBA/FIRST context |

### 9.1 `POST /api/scouting/match` — request body

```jsonc
{
  "idempotencyKey": "uuid-v4",
  "schemaVersion": 2,
  "seasonKey": "2026",
  "record": {
    "recordId": "uuid-v4",
    "eventKey": "2026dal",
    "competitionLevel": "qm",
    "setNumber": 1,
    "matchNumber": 42,
    "replayNumber": 1,
    "teamNumber": 3464,
    "allianceColor": "red",
    "driverStation": 2
  },
  "timing": { "matchStartClientMs": 0, "submitClientMs": 0 },
  "observations": [ /* see §6 */ ],
  "postMatch": { "notes": "", "issues": [] }
}
```

Note: the client does **not** send `summary`, `scoutUid`, `scoutName`, `submittedAt`, `syncStatus`,
`role`, or `debug`. The server strips any such fields if present, derives attribution from
`request.user`, and **recomputes `summary`** from `observations` authoritatively.

### 9.2 Responses

| Status | Meaning |
|---|---|
| `201 Created` | New record written; body returns `{ recordId, submittedAt }` |
| `200 OK` | Idempotency key already seen; returns existing record (no duplicate) |
| `400 Bad Request` | Validation failure (typed error list; see §10) |
| `401 Unauthorized` | Missing/expired session → client runs existing refresh + CSRF replay, then retries (safe: idempotent) |
| `403 Forbidden` | CSRF failure, or reading a record the caller doesn't own without an elevated role |
| `409 Conflict` | Natural-key/idempotency inconsistency (e.g. same key, different payload hash) |

---

## 10. Validation (server-authoritative)

Replaces the weak client check (`eventName !== "" && teamNumber !== null && matchNumber !== null`,
which let `0` pass and only enforced a non-empty event).

- `eventKey` — required, must match an existing `events/{eventKey}` (or a manual-entry flag is set).
- `competitionLevel` — required, in `{qm,qf,sf,f}`.
- `teamNumber`, `matchNumber` — required positive integers. **`0` and empty are rejected.**
- `setNumber`, `replayNumber` — positive integers, default 1.
- `allianceColor` — in `{red,blue,unknown}`.
- All coded values (zoneId, climbResult, issueType, eventType, accuracy) — must exist in `seasons/{seasonKey}`.
- `coord.x/y` — if present, floats in `[0,1]`.
- `notes` — max 1000 chars.
- `issues[].type === "other"` → `note` required.
- Unknown/extra fields — rejected.
- All client identity/attribution fields — stripped before write.

Error body shape:
```jsonc
{ "error": "validation_failed", "details": [ { "field": "teamNumber", "code": "must_be_positive" } ] }
```

---

## 11. Local persistence & sync (frontend)

Replaces raw `localStorage` (`scoutData-{team}-{match}`, cross-event collisions, unguarded
`JSON.parse`, no upload status) with an **IndexedDB outbox**:

- App-owned keys; records stored by `recordId`.
- Explicit `syncStatus`: `draft` → `ready` → `queued` → `uploading` → `synced` | `retryable` | `auth_required` | `rejected` | `conflict`.
- Guarded parsing; corrupt entries quarantined, never crash the view.
- `/api/scouting/mine` reconciles local vs server so the local-data view shows true upload state.

---

## 12. Removal plan (clean break)

Once the frontend cuts over to `/api/scouting/*`:

1. Delete `/api/read` and `/api/write` (generic passthrough).
2. Delete legacy top-level `/login` and `/register`.
3. Purge the `auth/{name}` SHA-256 credential collection (unsalted password-equivalents — security liability).
4. Remove `datas/data.team[]` untransacted maintenance; team index is server-owned going forward.
5. No legacy-shape documents are migrated. New season data starts clean in v2 shape.

---

## 13. Existing auth layer — data model & API (reused as-is, documented for completeness)

This layer is **kept unchanged** and every `/api/scouting/*` route composes with it. Documented here
so the contract the new endpoints depend on is explicit. Source: `backend/routes/auth.js`,
`backend/auth/session.js`, `backend/middleware/csrf.js`, `backend/middleware/require-authentication.js`.

### 13.1 Identity & storage model

- **Credential store:** Firebase Authentication (managed). The app stores **no** password material.
  Registration calls `auth.createUser({ email, password, displayName })`.
- **Session:** server-managed **HttpOnly** Firebase **session cookie** (`session`), created by exchanging
  a short-lived Firebase ID token (`auth.createSessionCookie`). Verified on every request with
  revocation checking enabled (`verifySessionCookie(cookie, true)`), so disabled/deleted/revoked users
  are rejected. Firebase ID tokens are **never** returned to the browser.
- **`request.user`** (verified claims, attached by `createRequireAuthentication`) is the only trusted
  identity source. Shape used downstream:
  ```jsonc
  { "uid": "…", "email": "…", "name": "…", "debug": false }   // debug = frontend feature-flag only
  ```
  New scouting endpoints derive `scoutUid`/`scoutName` from `request.user`; `debug` must never bypass
  auth, attribution, or server validation.

### 13.2 CSRF model (signed double-submit)

- `csrf_binding` (HttpOnly) + `csrf_token` (JS-readable) cookies; header `X-CSRF-Token` echoes the token.
- Token is HMAC-signed and **bound** to the session cookie (or a pre-auth random binding), so a token
  copied from another browser/session fails. Exact `Origin` match against the configured frontend is
  required. All state-changing routes require it; `/api/scouting/*` mutations reuse `protectJsonRequest`.

### 13.3 API contract (unchanged)

| Method | Path | CSRF | Auth | Body | Success | Notes |
|---|---|---|---|---|---|---|
| `GET`  | `/api/auth/csrf` | issues | no | — | `200 { csrfToken }` | Call before any mutation; safe before login |
| `POST` | `/api/auth/register` | yes | no | `{ name, email, password }` | `201` session response + `session` cookie | 409 email in use, 400 weak/invalid, 429 rate-limited |
| `POST` | `/api/auth/login` | yes | no | `{ email, password }` | `200` session response + `session` cookie | 401 invalid/disabled, 429 rate-limited |
| `POST` | `/api/auth/logout` | yes | no | — | `204` (idempotent, clears cookies) | Reveals nothing about session existence |
| `GET`  | `/api/auth/session` | no | cookie | — | `200` session response / `401` | Frontend session bootstrap + expiry timers |

**Session response body** (from `createSessionResponse`):
```jsonc
{
  "user": { "uid": "…", "email": "…", "name": "…", "debug": false },
  "sessionExpiresAt": "2026-01-01T00:00:00.000Z",
  "sessionExpirationWarningAt": "2026-01-01T00:00:00.000Z"
}
```

### 13.4 Client integration expectations

The frontend `client.ts` already: fetches CSRF, sends the header on mutations, and on `401` runs a
session-refresh + CSRF replay for **safe/idempotent** requests. Because `/api/scouting/*` writes are
idempotent (§8–§9), they slot directly into this retry path.

---

## 14. PWA requirements compatibility (reconciliation with the PRD)

Maps each PRD requirement to this data model / API, and states where the architecture intentionally
diverges. **Non-negotiable constraint:** the browser never talks to Firestore directly — React → Node → Firestore.

| PRD requirement | Compatibility | Where it lives |
|---|---|---|
| **1. Mobile-first responsive, 48px targets, zero input delay** | UI-layer only; no data/API impact. | Phase 3 design directions |
| **1. Dynamic alliance themes** | Supported; `allianceColor` is derived from `events` schedule (§4a/§5). Applied as a persistent badge/accent (see conflict note below), not a data-model concern. | `allianceColor` |
| **1. Canvas/SVG field mapping** | Supported by the optional normalized `coord {x,y} ∈ [0,1]` on observations (§6); **zones are the primary signal**, coordinates optional. | `observations.coord` / `observations.zoneId` |
| **1. Haptic/visual feedback** | UI-layer only. | Phase 3 |
| **2. Service Worker (Workbox) app-shell caching** | Fully compatible; caches bundle/assets only, no data-model impact. | Frontend build |
| **2. Firestore native offline persistence (`enableIndexedDbPersistence`)** | **Intentional divergence.** The client does not use the Firestore SDK. The **IndexedDB outbox (§11)** provides offline queueing instead, preserving the React→Node→Firestore boundary and server-owned validation/identity. | §11 outbox |
| **2. QR-code fail-safe sync + `lz-string` compression** | Supported as an **optional transport**. The v2 record + observations are JSON-serializable; a device can compress and emit the same payload that `POST /api/scouting/match` accepts, and a relay device forwards it. Server still validates/attributes identically. See §14.1. | §14.1 |
| **3. JSON-driven dynamic forms from `game-schema.json`** | Satisfied by **schema-as-data**: `seasons/{seasonKey}` (§4) served via `GET /api/scouting/season/:seasonKey`. Same intent, but delivered as a validated, versioned API resource rather than a static file — so the server can validate submissions against the exact schema the client rendered. | §4 |
| **3. Three-phase lifecycle (Pre / Active / Post)** | Directly modeled: Pre-match = identity (§5, derived from `events`) + optional starting `coord`; Active = `observations` with `phase ∈ {auto,teleop,endgame}` + `elapsedMatchMs`; Post = `postMatch` (§5). | §5, §6 |
| **3. TBA Sync Engine (schedules, rankings, results cached in Firestore)** | Modeled as `events/{eventKey}` (§4a), populated server-side. Client reads via `GET /api/scouting/event/:eventKey`. | §4a |
| **4. Client-side edge analytics (True Shooting %, cycle times, climb rates)** | Data model provides the inputs: fuel as `{low,high,confidence}` ranges, cycle timing from `observations.elapsedMatchMs`, climb outcomes from `climbResult` enums, and cross-scout `matchConsensus` (§7). Computation is a client/strategist concern; no schema change needed. | §5, §6, §7 |
| **4. Predictive simulator / Component OPR** | Consumes `matchScouting.summary` + `matchConsensus` across matches; enabled by coded keys + numeric `teamNumber`. Aggregation endpoints can be added later without model changes. | §5, §7 |
| **4. Drag-and-drop picklist builder** | Pure read/strategy UI over aggregated team data (`teams/{teamNumber}` + consensus). No write-model impact. | `teams`, §7 |

### 14.1 QR transport envelope (optional, PRD §2)

When a venue network is unusable, a scout device may render the pending record as compressed QR frames;
a connected relay device decodes and submits it through the **same** authenticated endpoint. The QR
payload carries only the client-authored portion — never identity — so the server still derives
attribution from the relay operator's session (or a future signed hand-off token, TBD in §15).

```jsonc
// lz-string-compressed JSON, chunked across frames
{
  "v": 2,                        // schemaVersion
  "k": "idempotencyKey",         // dedupe across relay + retries
  "r": { /* record identity, §9.1 */ },
  "o": [ /* observations, §6 */ ],
  "p": { /* postMatch, §5 */ }
}
```

Idempotency (§8) makes relay + later direct upload safe: duplicates collapse to one record.

---

## 15. Open domain questions (for the scouting/analytics owners)

1. "Hoarded fuel" — is there an observable, unambiguous definition, or should it be dropped?
2. `transitionCollected`, `crossedBump`, `underTrench` — observed occurrence vs. capability? Expose or retire?
3. Confirm zones are the primary spatial input, with coordinates reserved for Auto paths / super-scout.
4. Elevated roles for `GET /api/scouting/match/:recordId` and cross-scout reads — which roles?
5. QR relay attribution (§14.1): should a relayed record be attributed to the **relay operator's**
   session, or do we need a **signed hand-off token** that preserves the original scout's identity?
6. Alliance theming intensity: PRD §1 asks to shift the **entire** UI to crimson/blue; do we honor that
   literally, or use a neutral high-contrast base with a persistent alliance badge/accent for legibility
   and reduced miscolor bias? (Affects Phase 3 design only, not the data model.)
