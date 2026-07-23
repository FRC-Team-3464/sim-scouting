# Phase 1 — Current-state product and repository analysis

> Archived historical input. It is not a current requirement; use the canonical v2 documentation index.

**Status:** Verified analysis at commit `c7ed1c9abba7a82c0b7da6366a0308099222c9ba`
**Baseline:** `feat/firebase-session-auth` at `b5f62095c95b6a563fd5f1bcadfd5d6f226c8b5d`

## Current product

The application is an authenticated React form system for match and pit scouting. It provides modern Firebase session authentication but retains legacy generic data APIs and form-centric scouting workflows.

## Confirmed strengths

- React, TypeScript, Vite, React Router, and Tailwind CSS v4
- Node/Express as the only Firebase and Firestore boundary
- HttpOnly Firebase session cookies with revocation checking
- Signed, session-bound CSRF protection
- Startup session restoration and in-place reauthentication
- Central API client with safe bounded retry behavior
- Server-owned scouting attribution and timestamps
- Passing backend and frontend test suites

## Confirmed weaknesses

- Manual event, team, match, alliance, and station context
- Zero and false defaults that conflate unanswered with observations
- Static tabs and nested Teleop shifts instead of time-aware capture
- `{team}/{match}` writes that omit event and scout identity from logical uniqueness
- Generic caller-selected Firestore paths and no purpose-specific authorization
- Legacy SHA-256 login and registration routes remain mounted
- LocalStorage collisions, unguarded parsing, and pit retry misrouting
- No IndexedDB, outbox, assignments, idempotency, PWA shell, or service worker
- No role/permission system, audit model, or consensus layer
- No CI workflow in the repository

## Product conclusion

The modern authentication/session platform should be retained. Scouting data capture, storage, offline behavior, and navigation require a greenfield v2 design. Legacy screens and payloads are evidence, not compatibility requirements.

The product owner approved a clean break: legacy scouting data is not preserved, transformed, adapted, or included in v2 analytics. V2 writes use v2 contracts only.

## Verification

- Backend tests: 123 passed
- Frontend tests: 25 passed
- Live Firestore data, Vercel dashboard state, and branch-protection settings were not inspected
