# Sim-City Scouting v2 UI design constraints

**Status:** Approved by product owner and principal architect; required for UI design exploration and implementation handoff

## Purpose and authority

These constraints apply regardless of design tool, prototyping platform, UI framework, or implementation technology. V0 is an approved tool for generating visual directions and repository-aware prototypes, but neither a V0 artifact nor generated code changes product requirements, ADRs, or architecture contracts. Generated code requires normal design, accessibility, security, architecture, and implementation review before use.

The [Product Requirements](../product/product-requirements.md) own product behavior, [ADRs](../architecture/adrs/README.md) own consequential architecture decisions, [contracts](../architecture/contracts/README.md) own implementable state and security rules, and [scouting-method validation](../validation/scouting-method-validation.md) owns empirical capture choices. This document translates those authorities into UI constraints; it does not duplicate or replace them.

A slice-specific design may omit workspaces and states that are not delivered in that slice. It must not contradict their approved boundaries, imply that an omitted state is impossible, or create a competing product rule.

## Product-wide design principles

- Optimize for fast, calm, interruption-tolerant use in a loud competition environment.
- Keep authenticated team, event, package freshness, connectivity, local persistence, and synchronization context visible where it affects the current task.
- Use an assignment-driven Scout experience. Do not make Scouts repeatedly type event, match, alliance, station, or team context already supplied by authoritative packages and assignments.
- Use a neutral, high-contrast base with persistent textual alliance labels. Color, position, iconography, vibration, or animation alone must never communicate identity, state, urgency, or result.
- Save capture work locally first. Capture must not wait for network availability, and only a server receipt may be presented as synchronized.
- Distinguish unanswered, not observed, not applicable, `false`, zero, unavailable, rejected, conflicted, and synchronized states.
- Preserve attribution, revisions, disagreements, and original evidence. Never present independent Scout records as silently merged or overwritten.
- Prefer progressive disclosure and role-focused navigation. Do not place technical administration controls in event-operation or capture workflows.
- Show safe, actionable error categories without exposing inaccessible records, internal authorization reasoning, secrets, raw provider errors, or sensitive scouting payloads.

## Supported devices and responsive behavior

- MVP designs must support representative smartphones and tablets on Android, iOS, and iPadOS, plus Windows laptops, Chromebooks, and MacBooks under the supported current-plus-three-major-OS-version policy.
- Match capture starts from the smallest supported screen and must remain fully operable there. Larger screens may add simultaneous context, spatial detail, review density, and management views without making core workflows unavailable on smaller supported devices.
- Layouts must reflow at 320 CSS pixels and remain usable at 200% zoom, in portrait and landscape where the device supports them, with safe-area insets and no essential horizontal scrolling.
- Primary touch targets are at least 44 by 44 CSS pixels; frequent capture actions should target 56 by 56 CSS pixels or larger when space permits.
- Do not assume hover, a precise pointer, a physical keyboard, haptics, continuous connectivity, background synchronization, high CPU performance, or a single device per user.

## Workspace boundaries

Navigation is composed from the bounded authorization projection, but the backend remains authoritative. Loading, stale, mismatched, or unavailable authorization must never produce a permissive UI.

| Workspace | UI must support | UI must not imply or expose |
|---|---|---|
| Scout | Own active assignments, context confirmation, capture/review/correction, local and synchronization state, own receipts/conflicts, and same-user recovery | Peer raw records, live cross-scout analytics, live team leaderboards, qualification-period derived summaries, or submission without an active assignment |
| Strategy | Read-only finalized evidence, provenance, disagreement, confidence, team comparison, derived-metric version/freshness, and authorized exports | Source-record mutation, assignment operation, package publication, opaque rankings, or unvalidated predictions presented as fact |
| Event Management | Lead Scout roster/availability, coverage, assignments, intentional duplicates, emergency assignments, failures, conflicts, audited correction/void, narrow event overrides, and qualification close/reopen | Season-package publication, membership/retention administration, deployment/server settings, secrets, or broad technical configuration |
| Administration | Online-first membership/role governance, season-package lifecycle, read-only scouting support access, audit, exports, retention, backup/recovery, account suspension, and emergency revocation | Routine event assignment/conflict operation or scouting-record correction/void authority by default |

An ordinary Scout with no active assignment, including a standby Scout, is read-only. Only a Lead Scout may create or approve a manual-fallback emergency assignment; the Scout begins work from the resulting assignment and must not receive an independent “manual scouting” escape hatch. A person with multiple roles may enter multiple workspaces, but each action remains capability-, scope-, ownership-, state-, and freshness-aware.

## Identity, session, and shared-device flows

Designs that include account access must represent:

- public registration with zero application privileges, Firebase-managed email verification, and a pending/no-access state until an Administrator activates verified membership;
- a thin password-reset request/status experience that hands password reset to Firebase rather than presenting an application-managed reset form;
- a six-hour absolute session, a non-blocking warning 30 minutes before expiry, explicit renewal, and no inactivity timeout that interrupts live capture;
- same-UID reauthentication that preserves the current task and restores focus, distinct from an explicit account switch;
- an authenticated-but-authorization-loading state and explicit refresh-required, version-mismatch, unavailable, suspended, and revoked outcomes;
- ordinary logout affecting the current browser only; no Scout self-service all-device logout control;
- before logout or account switch with unsynchronized work, retain, confirmed discard with an affected-item count, and cancel choices;
- automatic session expiry always retaining UID-owned work and pausing protected network operations; and
- another UID being unable to view, resume, or upload the prior UID's retained work.

Verification resend and password-reset initiation must distinguish accepted, throttled, quota-unavailable, and retryable provider-unavailable outcomes without revealing whether a reset account exists. Role or grant changes may alter available actions without ending the Firebase session. Membership suspension, revocation, lost-device response, or compromise may end sessions, but the UI must not imply that revocation remotely erases local browser data.

Contracted sensitive operations require same-UID recent authentication while preserving entered context. These include role changes, package publication, event overrides, correction or voiding of another Scout's evidence, identifiable exports, audit access, emergency revocation, and destructive cleanup. Ordinary capture must never be interrupted by a freshness challenge.

## Assignment, Match, and Pit capture

### Assignment and coverage

- Show the assignment subject, state, version-relevant conflict, event/team/match context, assignee, and whether work is normal, intentional duplicate, emergency, stale, reassigned, or former-assignee evidence.
- Support the lifecycle concepts `planned`, `available`, `accepted`, `in_progress`, `completed`, `missed`, `cancelled`, and `reassigned` where the current role needs them.
- Warn about known assignment changes before capture begins. If a change is discovered after offline work, preserve the work and route it to Lead Scout review rather than replacing or deleting it.
- Coverage, failure, and conflict views must distinguish missing work, stale work, duplicate evidence, former-assignee evidence, rejected submissions, and receipt gaps.

### Match Scouting

- Keep match identity, team, labeled alliance/station, current phase, device-local elapsed timer, latest action, local-persistence result, and undo/correction access visible during rapid capture.
- Provide one large explicit Start Match action at the observed field cue. Advance Auto and other season-package-defined phases automatically. The MVP must not expose routine pause/resume, manual phase navigation, detailed clock-correction controls, or per-observation confidence prompts.
- If timing was restored or the Scout believes timing or observations are incomplete, make that status clear and provide a simple post-match issue flag with an optional note. Do not silently rewrite original observations or imply that restored device timing is authoritative field time.
- Support assignment context confirmation, pre-match preparation, configured match phases, active/inactive periods where the season package defines them, End Game, post-match review, action history, correction, queueing, and receipt confirmation.
- Preserve the familiar multi-delta concept for high-throughput numeric observations: one prominent running total with rapid, reversible, package-configured adjustments. Treat the v1 screen as behavioral evidence, never as a visual template. V2 must explore improved hierarchy, grouping, responsive reflow, last-action/local-save feedback, accessible naming/announcement, invalid-adjustment prevention, and one-step undo while retaining one-tap capture.
- Positive capture actions should be visually primary and corrections clearly distinguished without relying on color. Do not add confirmation dialogs to routine delta actions; immediate feedback and undo provide recovery. At narrow widths, reflow the total and adjustment groups without shrinking targets or requiring essential horizontal scrolling.
- Corrections and undo must read as append/supersede/void actions, not silent destruction of accepted evidence.
- Active capture stays pinned to the assignment and season-package version with which it began. A package refresh must not silently alter controls mid-match.
- Zone or coordinate exploration must include an equally operable non-map alternative. Spatial controls must not be the only way to record or review an observation.

### Pit Scouting

- Key the workflow by season, event, and team; never request or display match number as Pit contribution identity.
- Support structured answers, measurements with units, contributor-owned revisions, claims and confidence where configured, provenance, disagreements, review, local queueing, and receipt state.
- Clearly distinguish a pit claim from match-observed verification.
- The MVP flow must be complete with zero photo controls. Do not show upload affordances, dedicated external photo/album link fields, previews, placeholders that imply a required robot image, blob-queue state, storage-provider selection, photo quotas, or image-only evidence. `photoIds` is only a declaration-level future compatibility point and must be absent from MVP requests and canonical revisions.

## Offline, synchronization, storage, and application updates

- Previously installed shell content and downloaded compatible packages/assignments must open without connectivity. Offline status must not be presented as failure when the current task is safely local.
- Represent outbox states accurately: `queued`, `authorization_pending`, `uploading`, `auth_required`, `retry_wait`, `authorization_rejected`, `validation_rejected`, `conflict`, and `synced`. Do not collapse authorization rejection, validation rejection, assignment conflict, dependency outage, and retryable transport failure into one error.
- Show dependency/progress for multi-part submission without suggesting that uploaded chunks equal an accepted record. Only a valid receipt changes the displayed state to synchronized.
- Authorization-pending capture is limited to the original UID and previously downloaded assignments/packages. Reconnection reauthorizes; denial preserves evidence and offers the contracted recovery path.
- Make package download, hash/compatibility validation, staged activation, freshness, expiry, revocation, and last-known-good recovery understandable. Stale compatible packages may remain usable with a textual age/freshness warning; revoked or incompatible packages require the contracted blocking/review behavior.
- Surface storage pressure before it threatens work. Synchronized local records are normally retained for seven days from receipt and may be cleaned earlier under storage pressure; unsynchronized work must never be presented as subject to age-based automatic deletion. Destructive local cleanup must inventory the affected UID/work, state that server data is unaffected, and require explicit confirmation.
- Application updates wait outside active capture. Migration or update failure preserves the prior working shell/data where possible and offers retry, bounded export, quarantine inspection, or explicit reset as contracted; never force a reload or automatic reset that can discard work.
- Visible feedback is authoritative; haptics may supplement it but are never required. A primary capture action must acknowledge visibly within 100 ms on representative lower-powered devices.

## Packages, evidence, and governance

- Season and event package states are `draft`, `published`, `superseded`, `retired`, and `revoked`. Draft content is unavailable to capture; published content is immutable; superseded content remains valid for pinned work; retired content is unavailable for new work; revoked content blocks new work and sends affected offline submissions to review.
- Event data uses TBA as the sole external source. Show TBA provenance, freshness, and any narrow reasoned Lead Scout override without inventing a multi-provider reconciliation workflow or disguising an override as imported source data.
- Capture controls come from the approved [controlled component registry](../architecture/contracts/season-package.md#controlled-component-registry). Each observation may use a different allow-listed kind; the multi-delta counter is not universal. Design the unanswered, answered, not-observed, not-applicable, invalid, disabled, review, and correction states applicable to each kind without redefining its payload or interaction model. A design must not require arbitrary executable forms, remote HTML/script/style, or a generic plugin builder.
- A categorical append action must make each activation visibly append one configured option; it has no preselected value and must not look or behave like a replaceable segmented choice. Correction remains an explicit append-oriented undo, supersede, or void operation.
- A zone or coordinate action must collect one configured action option and one location as a single evidence event. Its keyboard/screen-reader non-map alternative must collect the same pair rather than a reduced meaning.
- A renderer may provide familiar start, stop, or lap-like affordances only over contracted actions or state transitions. It must persist the underlying event promptly and present elapsed or cycle values as derived feedback; a displayed timer total is never the submitted raw payload.
- Administrator publication/revocation and Lead Scout event overrides require the correct separated workspace, explicit target/version, mandatory confirmation, non-empty reason, current authorization, recent authentication where contracted, and an auditable outcome.
- Strategy and Lead Scout evidence views must expose provenance, contributing revisions, disagreement, uncertainty/confidence, algorithm version, and freshness. Failed or stale derived data must not invalidate or obscure accepted raw evidence.
- Ordinary Scouts must not see live leaderboards, peer raw records, or derived qualification summaries. Post-qualification summaries unlock for Scouts only after explicit Lead Scout closure, not merely after a scheduled final qualification match.
- Administrator scouting-record access is routine read-only support access, but the UI must preserve the sensitive-read audit boundary and must not offer record mutation through that role alone.
- Export and recovery operations are online, requester-bound, status-driven, and potentially asynchronous. Show the explicit environment and target where the operation can affect data. Do not imply an export is immediately available or that a backup/recovery action succeeded before authoritative job evidence exists. Where retention is displayed, event records, receipts, and audit history retain through 14 days after event end unless an approved incident/legal hold suspends cleanup.
- Administration operational-status designs must distinguish application liveness from dependency readiness and expose actionable job backlog, backup age, and restore-test evidence where available. Breaches of the event recovery objectives—no more than 30 minutes of synchronized-data loss and no more than one hour to restore service—must be unmistakable without relying on color alone.

## Accessibility, interaction, and content

- Meet WCAG 2.2 AA and test complete workflows with keyboard, screen reader, reduced motion, 200% zoom, and 320 CSS-pixel reflow.
- Use native semantics or equivalent accessible patterns; provide visible focus, logical focus order, named controls, field instructions, programmatic errors, and focus restoration after dialogs and reauthentication.
- Use restrained live regions for persistence, synchronization, timer, quota, and update announcements. Avoid repetitive countdown or rapid-action announcements that overwhelm assistive technology.
- Charts, spatial views, coverage maps, and status color require table/text alternatives. Alliance color always has a persistent label.
- Confirmation dialogs identify the action, target, consequence, affected local items where relevant, and recovery limits. Do not use vague “Are you sure?” copy for discard, reset, revoke, void, publication, rollback, or override.
- Preserve user input and navigation context across retryable failures, reauthentication, orientation changes, refresh, and supported application updates.

## Decisions UI design must not lock before validation

- Made/missed, cycle, interval-rate, or quantity-range capture as a universal addition to the approved high-throughput multi-delta baseline
- Multi-delta preset sizes, accuracy/quantity buckets, cycle linkage, or interval duration
- Zones, coordinates, or non-spatial controls as the universal spatial default for every observation
- Rating anchors and scale presentation
- Dedicated, reduced, roaming, or specialist staffing layouts
- Phone/tablet control density beyond the supported-device and accessibility constraints above

Design explorations must show genuinely configurable alternatives for the method under study. They must not make a visually polished candidate look architecturally selected before the validation protocol and Lead Scout review approve it.

## Design rejection criteria

Reject a design or generated implementation that requires direct browser-to-Firestore access, caches authenticated API responses in the service worker, assumes background sync will run, stores local synchronization state in canonical records, requires online launch or capture, equates upload completion with synchronization, hides package/assignment/authorization conflicts, uses `debug`, role labels, routes, device identity, or cached grants as authority, permits cross-UID recovery, silently merges Scout evidence, implies legacy-data compatibility, requires Pit photos, or places deployment/server configuration in the Lead Scout workflow.

Before design approval, trace each represented action and state to Product Requirements and its owning contract, confirm that deferred empirical choices remain visibly configurable, and test the relevant workflow across the supported devices and accessibility modes.
