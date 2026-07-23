# Phase 1.5 — Corrected & Expanded Product Analysis

> Archived historical input. It is not a current requirement; use the canonical v2 documentation index. In particular, its required-photo proposal is superseded by ADR 0009.

**Status:** Analysis only. No implementation. No React code.
**Framing change:** This is now a **greenfield rewrite** of the FRC scouting product with a
**controlled migration** from the legacy Sim-City Scouting app. Legacy screenshots, routes, fields,
payloads, and source are an **implementation inventory** — they document what exists, not the target
UX, and must not constrain the new information architecture.

**Locked stack:** React + TypeScript + Vite + Tailwind v4 + separate Node.js backend + Firestore
(via backend only) + IndexedDB (offline) + service worker (PWA). **No Next.js. No RSC. No Supabase.**
Reuse the existing Firebase session-cookie + CSRF auth layer (see [the architecture inventory](phase-1-scouting-redesign-spec.md#13-existing-auth-layer--data-model--api-reused-as-is-documented-for-completeness)).

**Companion docs:** [architecture inventory](phase-1-scouting-redesign-spec.md) and [method-validation plan](../../validation/scouting-method-validation.md).

---

## A. Original Phase 1 assessment — keep / revise / remove

| # | Original Phase 1 conclusion | Keep | Revise | Remove | Explanation |
|---|---|:--:|:--:|:--:|---|
| 1 | Weak validation: only non-empty `eventName` enforced; `0` passes null checks; debug bypasses | ✓ | | | Confirmed in real `MatchForm.tsx`. Still the strongest current-state finding. |
| 2 | Upload path `{team}/{match}` omits event → cross-event overwrite; LocalStorage key collides | ✓ | | | Confirmed in code (contradicts the code comment). Root justification for v2 identity keys. |
| 3 | Server strips client identity and owns attribution/timestamps | ✓ | | | Confirmed in `createAuthenticatedScoutingRecord`. Carries directly into v2 endpoints. |
| 4 | Per-ball fuel counters are cognitively expensive live | | ✓ | | Keep the concern, but **do not assume** batch is better. It is now a **testable hypothesis** (Phase 2), with configurable methods. |
| 5 | Hub-active 4-toggle coupling should be derived from one observation | ✓ | | | Confirmed `switchShifts` flips all four. Derivation is still correct. |
| 6 | `robotError` checkboxes "not bound to state" | | ✓ | | **Corrected:** they *are* bound but the child **mutates in place** and re-emits the same reference. Real bug, different root cause. |
| 7 | Conflict C-1 framed as "REST vs Firebase; Firebase rejected" | | ✓ | | **Corrected:** Firestore is already the datastore behind Node. Real decision was generic passthrough vs purpose-specific endpoints. Resolved. |
| 8 | Keep Node REST + derive legacy payload for backward compatibility | | | ✓ | **Removed.** Owner decided on a clean break — no legacy payload derivation, no compatibility shims. |
| 9 | "Finale" tab should be renamed | ✓ | | | Confirmed; label is literally "Finale", key is `errors`. Becomes Post-match review. |
| 10 | Zones primary, coordinates optional | ✓ | | | Still correct; coordinates now explicitly a Phase 2 test variable, not a default. |
| 11 | Tri/quad-state answers; never default unanswered to `false` | ✓ | | | Reinforced by greenfield framing and analytics-correct denominators. |
| 12 | Timer-driven Match Mode replaces free tab switching | ✓ | | | Still central; expanded into the §E interaction model. |
| 13 | Bring TBA/FIRST data in so scouts confirm not type | ✓ | | | Now foundational — the product is **assignment-driven** (§C/§E). Elevated from "nice to have". |
| 14 | Legacy SHA-256 `/login` + `auth/{name}` is a security liability | ✓ | | | Confirmed in `backend/routes/auth.js`. Removed in migration; modern session auth kept. |
| 15 | Single scout covers all 3 robots is out of scope | | ✓ | | Keep 1 scout ⇄ 1 robot as default, but staffing model is a Phase 2 test (dedicated vs roaming lead). |

---

## B. Legacy application assessment

Categories: **Preserve as-is** · **Preserve data, redesign UX** · **Replace completely** · **Derive automatically** · **Retain for migration only** · **Remove**

| Legacy feature | Disposition | Rationale |
|---|---|---|
| **Landing page** (Scout/View Local Data/Pit/Sign out buttons) | **Replace completely** | Loud blue/green/crimson button stack is not navigation. Becomes a role-aware workspace shell with event + assignment context (§D). |
| **Authentication** (modern `/api/auth/*` session + CSRF) | **Preserve as-is** | Robust, HttpOnly, revocation-checked. Reused unchanged. |
| **Authentication** (legacy `/login`,`/register`, `auth/{name}` SHA-256) | **Remove** | Unsalted password-equivalents in a readable collection. Security liability. |
| **Match setup** (event dropdown + `0`-default number fields) | **Derive automatically** | Event/match/team/alliance/station come from the **assignment**; manual entry is fallback only. |
| **Match scouting** (5 tabs, one input per screen) | **Replace completely** | Replaced by phase-progressing, timestamped, one-tap Match Mode (§E). |
| **Teleop "shifts" (Tran/Shift 1–4) sub-tabs** | **Replace completely** | Second wrapped tab row is a UX failure. Replaced by continuous timeline segmented by match clock. |
| **Counters** (−10/−5/−1/+1/+5/+10) | **Preserve data, redesign UX** | Integer totals still valid; entry method becomes **configurable** and is Phase 2-tested (exact vs batch vs made/missed). |
| **Yes/No controls** | **Preserve data, redesign UX** | Booleans stay, but gain explicit **unanswered/NA** states and larger targets. Never default to `false`. |
| **Endgame** (fuel counter + climb select) | **Preserve data, redesign UX** | Climb becomes a validated result enum with timestamps; fuel via configurable method. |
| **Finale** (bump/trench + always-open 8-error checklist + notes) | **Replace completely** | Becomes **Post-match review**: typed/timestamped issue events, confirmation of derived data, notes. |
| **Pit scouting** (long `0`-field column) | **Replace completely** | Rebuilt as team/event capability profile with photos, no match number (§F). |
| **Local Data** (`localStorage`, unguarded parse, no status) | **Replace completely** | Becomes IndexedDB outbox with explicit sync states (§G). |
| **Submission & recovery** (`{team}/{match}` overwrite, no idempotency) | **Replace completely** | Purpose-specific validated endpoints, composite identity, idempotency, no silent overwrite. |
| **Navigation** (Back buttons + history replace) | **Replace completely** | Role/workspace navigation with persistent event/assignment/sync context (§D). |
| **Existing match/pit records already in Firestore** | **Remove** | Product-owner decision: do not preserve, adapt, import, or include legacy records in v2 analytics. |

---

## C. Target product model — workspaces

The product is **assignment-driven**, organized into four role-scoped workspaces sharing one shell,
event context, and offline engine. Users may hold multiple roles.

### 1. Scout workspace
- **Users:** match scouts, pit scouts.
- **Goal:** capture accurate, attributable observations fast, offline, with minimal decisions.
- **Workflow:** receive/pick assignment → confirm derived context → Match Mode (or pit profile) →
  post-match review → local save → auto-queue → sync. Manual entry only if no assignment/schedule.

### 2. Strategy workspace
- **Users:** strategists, drive team, scouting leads.
- **Goal:** turn observations into pick decisions and match plans.
- **Workflow:** team profiles, cross-scout consensus, cycle/rate trends, picklist building,
  match prediction. Read-heavy; consumes `matchScouting.summary` + `matchConsensus`.

### 3. Event-management workspace
- **Users:** scouting leads.
- **Goal:** coverage and data quality during an event.
- **Workflow:** assignment scheduling/reassignment, coverage gaps, unsynced-device tracking,
  conflict/duplicate resolution queue, TBA sync status, scout throughput.

### 4. Administration workspace
- **Users:** team administrators.
- **Goal:** governance and season configuration.
- **Workflow:** user/role management, **season package** publishing (versioned schema registry),
  event provisioning, data export for analytics, retention/audit.

---

## D. Target information architecture

**Principle:** navigation is role + context driven, not a port of the landing-page buttons.

- **Mobile (scout primary):** bottom tab bar limited to the active workspace's core (e.g. Assignments ·
  Capture · Review · Sync). Everything else behind an overflow. One-hand reach; 48px targets.
- **Tablet (leads/pit):** persistent left rail (workspace switch) + content; supports split (list + detail).
- **Desktop (strategy/admin):** left workspace rail + top context bar + multi-pane (tables, boards, charts).
- **Event context:** always-visible current event chip (name, sync freshness); switchable when multi-event.
- **Assignment context:** for scouts, a persistent banner — `Qual 34 · Team 3464 · Red 2` — that seeds capture and is correctable.
- **Global offline/sync status:** persistent indicator (online/offline, queued count, last sync, action-needed badge) reflecting §G states.
- **User & role controls:** account menu with active role, role switch (if multi-role), session-expiry warning wired to `/api/auth/session`.

---

## E. Match scouting interaction model

**Model:** an **assignment** opens a **timestamped event capture session** that auto-progresses through
match phases; final counters are **derived** from the event log, not typed.

- **Assignment-driven setup:** context pre-filled from schedule; scout confirms robot + station. Manual fallback clearly flagged, validated (no `0`-passes).
- **Automatic phase progression:** Pre-match → Auto → Teleop → Endgame → Post-match driven by a match clock the scout starts; manual phase override always available.
- **Timestamped events:** every action records `elapsedMatchMs`, phase, zone, optional coordinate, confidence, source.
- **One-tap undo:** last action reversible instantly; corrections **supersede** (never in-place mutate) so the log stays auditable.
- **Fast action controls:** large primary actions for the current phase only; low decision count per screen; haptic/visual confirmation.
- **Field zones:** primary spatial signal (tap a zone). **Optional detailed coordinates** for auto paths / super-scout.
- **Scout confidence:** per-observation or per-session confidence captured, so analytics can weight/filter.
- **Post-match review:** confirm derived summary, log typed/timestamped issues, add notes, resolve unanswered.
- **Offline submission:** always saves locally first, queues, syncs when possible; success is server-confirmed.
- **Conflict & duplicate handling:** idempotency key + composite identity; multiple scouts on one robot are **separate records** reconciled by the consensus layer, never overwrites.

**Configurable capture methods (per season package, some pending Phase 2 testing):**

| Method | Status |
|---|---|
| Exact counts | Available; **baseline under test** vs alternatives |
| Volley / batch logging | **Requires Phase 2 testing** before defaulting |
| Made & missed attempts | **Requires Phase 2 testing** |
| Cycle events (pickup→score timing) | **Requires Phase 2 testing** |
| Scoring-rate intervals | Candidate; test if game warrants |
| Quantity ranges (low/high) | Available for low-confidence situations |
| Confidence levels | Available; orthogonal to the above |

The **method is chosen per game element via the season package**, not hardcoded. See
[the method-validation plan](../../validation/scouting-method-validation.md) for the decision thresholds.

---

## F. Pit scouting product model

**Team/event based. No match number.** One capability profile per team per event, verifiable against match data.

- **Team identity:** number/name from event package.
- **Robot photos:** multiple, offline-cached, primary shot required.
- **Dimensions & weight:** structured numeric with units + validation.
- **Drivetrain:** type, module/motor config.
- **Mechanisms:** structured list from season registry.
- **Game-specific capabilities:** season-package driven (what it can score/where).
- **Autonomous capabilities:** declared routines/starting positions.
- **Endgame capabilities:** declared climb/park abilities.
- **Programming & controls:** language, control scheme, sensors/vision.
- **Reliability & repairability:** self-reported, plus mean-time-to-repair notes.
- **Driver experience:** seasons/events.
- **Pit claims requiring match verification:** any self-reported capability is flagged as **claimed**; the strategy workspace compares claims to observed match performance.

---

## G. Offline-first state model

Every record carries an explicit lifecycle state; UI reflects it via the global sync indicator (§D).

| State | Meaning | Primary UI action |
|---|---|---|
| **Local draft** | In progress, not yet saved | Auto-save |
| **Saved locally** | Persisted to IndexedDB, not queued | Continue / submit |
| **Queued** | Marked ready to upload | Wait / sync now |
| **Synchronizing** | Upload in flight | — (spinner) |
| **Synchronized** | Server-confirmed (recordId) | View / done |
| **Retry required** | Transient/network failure | Retry (idempotent) |
| **Conflict** | Server has a diverging record | Open resolution flow |
| **Duplicate** | Idempotency collapse detected | Auto-merge / dismiss |
| **Authentication expired** | Session invalid | Re-auth then auto-retry |
| **Storage warning** | IndexedDB quota pressure | Prompt sync/cleanup |
| **Event-data update available** | Newer event package on server | Refresh event context |
| **App update available** | New service-worker build | Prompt reload |

---

## H. Product risks & open decisions

| Decision / risk | Validated by |
|---|---|
| Which capture method per element (exact vs batch vs made/missed vs cycles) | **Recorded-match testing** + scout usability (Phase 2) |
| Zones-only vs zones+coordinates accuracy/cost tradeoff | Recorded-match testing |
| Timer-driven flow vs manual phase control adoption | Scout usability testing |
| Rating-scale anchors (defense, etc.) reliability | Recorded-match testing (inter-scout agreement) |
| Staffing: dedicated per-robot vs roaming lead | Scout usability + coverage data |
| Multi-scout consensus algorithm (how to weight/merge) | **Data-analysis needs** + backend analysis |
| Season-package registry scope (which component types are "supported") | Stakeholder interviews + repository/backend analysis |
| Migration read-model for legacy Firestore records | **Repository & backend analysis** |
| Assignment source of truth (TBA vs FIRST vs manual lead scheduling) | Backend analysis + stakeholder interviews |
| Role model granularity (fixed roles vs permissions) | Stakeholder interviews |
| QR relay attribution (operator vs signed hand-off token) | Backend analysis (open Q in spec §15) |
| Storage budget / photo retention for pit scouting offline | Scout usability + storage profiling |

---

## Recommended Phase 2 design scope

Phase 2 should be **design + method validation**, not implementation. Concretely:

1. **Run the method-validation protocol** in [the validation plan](../../validation/scouting-method-validation.md) to lock capture methods, spatial granularity, flow, and rating anchors **before** finalizing screens.
2. **Design the Scout workspace end-to-end** for phone + tablet: assignment list → context confirm →
   Match Mode (auto/teleop/endgame) → post-match review → sync — including offline states (§G) and the
   alliance-aware but legible theming decision (spec §15 Q6).
3. **Design the Pit workspace** (team/event capability profile, photos, claims-vs-verified).
4. **Define the season-package registry** (the controlled set of supported scouting components) so the
   model is configurable without a generic form renderer.
5. **Produce two design directions** (via `GenerateDesignInspiration`) that specifically fix the legacy
   problems: excessive scrolling, one-input-per-screen, stacked wrapping tab rows, `0`-default ambiguity.
6. **Defer** Strategy/Event-management/Admin workspaces to a later design pass; stub only their nav slots.

**Out of scope for Phase 2:** React implementation, every screen, backend endpoint code. Those begin
after the design directions and method decisions are approved.
