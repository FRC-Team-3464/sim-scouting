# Create a Repository Handoff Package for Codex

You are already connected to and aware of the Sim-City Scouting repository.

Create a detailed handoff document for a new Codex session. Codex will have
access to the repository but will not have access to this v0 conversation or
any previous reasoning.

> **Archive note:** This prompt records the original requested path. The resulting document now lives at `docs/sim-city-scouting-v2/architecture/codex-project-handoff.md`.

Create:

`docs/scouting-v2/codex-project-handoff.md`

The handoff must be grounded in the actual repository and the approved product
analysis. Do not make assumptions that cannot be confirmed from the repository
or project documents.

Include the following sections.

## 1. Product overview

Explain:

- What Sim-City Scouting is
- Who uses it
- Why the existing application is being replaced
- Why this is a greenfield rewrite with a controlled legacy transition
- The intended Scout, Strategy, Event Management, and Administration workspaces

## 2. Repository map

Identify the actual locations of:

- React application entry points
- Routes
- Major page components
- Shared UI components
- State management
- API client
- Authentication client
- PWA configuration
- Tests
- Node/Express application entry points
- API routes
- Authentication middleware
- CSRF middleware
- Firebase Admin initialization
- Firestore access
- Environment configuration

For each important file or directory, describe its current responsibility.

## 3. Existing architecture

Document the current:

- React and Vite architecture
- Tailwind CSS version and configuration
- Node/Express architecture
- Authentication flow
- Session-cookie behavior
- CSRF behavior
- Firestore collections
- Match Scouting submission flow
- Pit Scouting submission flow
- Local persistence behavior
- Error handling
- Deployment assumptions

Clearly distinguish confirmed repository findings from proposed architecture.

## 4. Legacy weaknesses

Document confirmed problems such as:

- Manual event/match/team entry
- Zero-valued defaults
- Weak validation
- Ambiguous Yes/No defaults
- Form-driven match scouting
- Teleop shift navigation
- Legacy record-key collisions
- LocalStorage limitations
- Missing idempotency
- Missing assignment model
- Missing offline lifecycle
- Pit Scouting limitations
- Responsive design limitations
- Legacy authentication routes that must be removed

Reference the relevant files where each issue exists.

## 5. Approved target architecture

Describe the approved direction:

- React
- TypeScript
- Vite
- Tailwind CSS v4
- Node/Express API
- Firestore accessed through Node only
- Firebase Authentication with HttpOnly session cookies
- Existing CSRF model
- IndexedDB offline database
- Outbox synchronization
- Service-worker application caching
- Assignment-driven scouting
- Timestamped observation events
- Server-authoritative validation and attribution
- Versioned season packages
- Event packages cached for offline use
- Multiple scouts per robot
- Derived consensus
- No Next.js
- No React Server Components
- No Supabase
- No direct browser-to-Firestore access

## 6. Approved product decisions

Include:

- Legacy UI is reference material, not the target
- New writes use v2 contracts only
- Existing authentication/session infrastructure should be reused when safe
- Match context is derived from assignments and schedules
- Manual entry is a fallback
- Unanswered must not default to false or zero
- Zones are the default spatial input
- Coordinates are optional
- Scouting methods are season-configurable
- Exact versus batch/volley capture requires validation
- Device-local sync status is not a server record field
- Pit Scouting is team/event based and does not require a match number
- v0 owns visual design exploration
- Codex owns implementation and architecture validation

## 7. Unresolved architecture decisions

Document unresolved questions regarding:

- Canonical record identity
- Idempotency
- Revisions
- Assignment model
- Event package structure
- Season package contract
- Submission atomicity
- Consensus recomputation
- Legacy-data access
- Pit photo storage
- QR transfer attribution
- Role permissions
- Match timing
- Capture-method validation

Do not present unresolved issues as approved decisions.

## 8. v0 design status

Describe:

- Which phases have been completed
- Which design direction has been selected, if any
- Which components or screens v0 generated
- Which branch or files contain v0 work
- What is conceptual versus implementation-ready
- Known design assumptions Codex must validate

## 9. Codex responsibilities

Specify that Codex must:

1. Read the project documentation.
2. Inspect the repository independently.
3. Verify every repository-related claim.
4. Report contradictions before implementation.
5. Create architecture decision records.
6. Work in small vertical slices.
7. Preserve the approved stack.
8. Add tests with implementation.
9. Avoid blindly accepting generated v0 code.
10. Avoid modifying unrelated legacy code.
11. Never expose Firebase service credentials to the browser.
12. Never use the debug flag as authorization.

## 10. Recommended first Codex task

Recommend an analysis-only Phase 1.6 task that resolves:

- Migration policy
- Record identity
- Assignment model
- Event package model
- Season package contract
- Local versus server state
- Submission transactions
- Pit Scouting model
- Roles and permissions

Codex must not implement production code during this first task.

## 11. Terminology

Define all important product and technical terms so Codex uses them consistently.

## 12. Source-of-truth hierarchy

Specify this priority:

1. Confirmed current repository behavior
2. Approved architecture-decision documents
3. Approved product-analysis documents
4. Approved v0 design specifications
5. Legacy screenshots and legacy requirements

When sources conflict, Codex must report the conflict rather than silently
choosing one.

After creating the document, summarize any repository details that could not be
confirmed.
