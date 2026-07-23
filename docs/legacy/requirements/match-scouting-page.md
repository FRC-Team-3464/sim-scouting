# Match Scouting Page Requirements

**Product:** Sim-City Robotics Scouting Application
**Page:** Match Scouting (`/match`)
**Game context:** FRC REBUILT 2026
**Purpose:** Design-ready requirements to use with screenshots of the existing UI.
**Basis:** Current form, shared controls, submission API, recovery page, routes, authentication behavior, and tests reviewed July 20, 2026.

## 1. Product objective

The page enables an authenticated scout to record one robot's actions during one match. It must favor fast, accurate entry while watching live play, retain data while the scout moves between phases, preserve a local recovery copy, and clearly distinguish local saving from a successful upload.

The redesign may change layout, wording, grouping, and control presentation, but it must preserve the data contract in section 8 unless a coordinated migration is approved. Screenshots supplied with this document are current-state visual references, not the behavioral source of truth.

Additional design principles apply throughout:

- **Tenth-of-a-second entry:** Frequent actions need large, high-contrast targets and immediate acknowledgement so scouts can keep watching the robot.
- **Intuitive field mapping:** A visual, interactive, top-down field map must support coordinate-based event logging.
- **Alliance-aware presentation:** The interface must adapt to the assigned Red or Blue alliance to reduce wrong-alliance entry.
- **Lightweight confirmation cues:** Subtle animation and optional device vibration should confirm accepted input without distraction.

## 2. Users and context

The primary user is an authenticated team scout using a smartphone, small tablet, or a laptop in a loud, time-sensitive venue with unreliable connectivity. The scout may work one-handed, look away frequently, enter repeated scores quickly, and return to earlier sections to correct observations.

## 3. Scope

In scope:

- Page navigation and progress through Setup, Auto, Teleop, Endgame, and Finale.
- Every field, counter, choice, note, error, submission state, and recovery behavior.
- Current validation and recommended target validation.
- Responsive, accessible, offline-resilient behavior.

Out of scope:

- Homepage, Pit Scouting, Local Data, authentication-screen, analytics, and reporting redesigns.
- Changes to game rules or metric meanings.

## 4. Navigation and page structure

### 4.1 Site header

- Back is solely a site-level action and must navigate to the homepage (`/`).
- Put the Back/Home action in a persistent site header. Do not repeat it in the form content.
- If the form has unsaved changes that are not recoverably persisted, leaving must trigger an unsaved-work warning.
- The page title should be **Match Scouting**; the current title is “Scouting Match.”

### 4.2 Primary sections

- Show five ordered destinations: **Setup**, **Auto**, **Teleop**, **Endgame**, **Finale**.
- Setup is initially active.
- Users may move freely between sections without clearing or submitting data.
- Distinguish active, completed, and error-containing states. These are separate concepts.
- Make all destinations discoverable at narrow widths without ambiguous abbreviations.
- On invalid submission, identify affected sections and focus or navigate to the first invalid field.

### 4.3 Teleop subsections

- Show **Transition**, **Shift 1**, **Shift 2**, **Shift 3**, and **Shift 4** in that order.
- Transition is initially active. Write it in full; the current “Tran” abbreviation should be removed.
- Switching subsections must preserve values and expose active/error state accessibly.

## 5. Requirements by tab

All scoring values currently start at `0`, are stored as whole numbers, and have an effective range of 0–999. Existing counters allow direct entry plus `-10`, `-5`, `-1`, `+1`, `+5`, and `+10` adjustments.

### 5.1 Setup

| Field | Data key | Current state | Requirement |
|---|---|---|---|
| Event | `eventName` | Empty; hard-coded options “NE District Minuteman Event” and “NE District URI Event” | Select exactly one event. The placeholder is not a value. Support future dynamic options, loading/empty states, and long names. |
| Scouting team | `scoutingTeam` | `0`; input intends 1–99,999 | Capture the scout organization's team number. Current label: “Your team number.” |
| Match number | `matchNumber` | `0`; input intends 1–99,999 | Identify the observed match. |
| Team being scouted | `teamNumber` | `0`; input intends 1–99,999 | Identify the observed robot/team. Current label: “Team Number.” |
| Alliance | New; proposed `allianceColor` | Not currently captured | Identify Red or Blue alliance. Prefer deriving it from the event schedule; otherwise require explicit selection before timed scouting. |

The design must make the scouting team and observed team difficult to confuse. Numeric fields must summon a mobile numeric keypad.

Alliance must control the alliance-aware theme. Always show persistent alliance text/iconography; color alone is insufficient.

### 5.2 Auto

| Field | Data key | Current default | Requirement |
|---|---|---|---|
| Auto fuel | `autoFuel` | `0` | Record autonomous fuel; treat as the section's primary rapid-entry control. |
| Auto climb succeeded? | `autoClimbed` | `false` | Record whether the autonomous climb succeeded. |
| Hoarded fuel? | `autoHoardedFuel` | `false` | Record whether the robot hoarded fuel in Auto. |

The target UI must support an unanswered Yes/No state so an initial default is not mistaken for an observed “No.”

Auto must also provide the field-map interaction in section 5.6 for autonomous paths and applicable shot/miss coordinates.

### 5.3 Teleop

#### Transition

| Field | Data key | Current default | Requirement |
|---|---|---|---|
| Transition fuel | `transitionFuel` | `0` | Record fuel scored during Transition. |
| Collected from Neutral | `transitionCollected` | `false` | This is submitted today but has no current UI. Confirm whether to expose it here or retire it from the schema. Reserve a design location if retained. |

The current instruction “If the robot failed to lower from climb, state that in the errors tab” should instead use “Finale” consistently and appear beside the relevant error or as contextual help.

#### Shifts 1–4

Each shift repeats:

| Field | Data keys | Current defaults | Requirement |
|---|---|---|---|
| Hub active? | `shift1HubActive` … `shift4HubActive` | false, true, false, true | Indicate hub activity. Current changes toggle all four values together, preserving an alternating schedule. |
| Fuel | `shift1Fuel` … `shift4Fuel` | `0` | Record fuel scored in that shift. |
| Collected from Neutral | `shift1Collected` … `shift4Collected` | `false` | Record neutral-area collection. |
| Played defense? | `shift1Defense` … `shift4Defense` | `false` | Record defense. |
| Hoarded fuel? | `shift1HoardedFuel` … `shift4HoardedFuel` | `false` | Record fuel hoarding. |

Valid current Hub Active patterns are `false/true/false/true` and `true/false/true/false`. Because the four values are not independent, do not present them as four independent toggles. Prefer one starting-state/alliance control with a derived, read-only schedule, subject to domain confirmation.

### 5.4 Endgame

| Field | Data key | Current state | Requirement |
|---|---|---|---|
| Endgame fuel scored | `endgameFuel` | `0` | Record fuel scored in Endgame. |
| Endgame climb level | `endgameClimbLevel` | Internal `"0"`; displayed options “Didn't climb,” “Level 1,” “Level 2,” “Level 3” | Require one explicit valid outcome. |

The current default does not match a displayed option and can submit `"0"`. The redesign must use an unanswered state or a valid climb value.

### 5.5 Finale

| Field | Data key | Current state | Requirement |
|---|---|---|---|
| Over bump? | `crossedBump` | `false` | Record whether the robot crossed the bump. |
| Under trench? | `underTrench` | `false` | Record whether the robot traveled under the trench. |
| Robot errors | `robotError` | All options false | Allow zero or more issues; keep selected values visible when collapsed and after tab changes. |
| Other notes about robot | `notes` | Empty | Allow concise multiline observations, growing to a reasonable height then scrolling. |

Robot error options:

- Intake issues
- Climb failed
- Robot unresponsive
- Robot part fell off
- Did not participate
- Auto stop
- Robot could not get off after climb
- Other

Finale design requirements:

- Use consistent sentence case.
- Selecting Other should reveal an explanation input or require explanatory notes.
- Consider an explicit “No robot errors observed” state so intentional none differs from untouched.
- The current multi-select mutates its object in place and does not bind checkbox checked states. The redesigned controlled component must accurately reflect stored state.
- Separate traversal observations, robot errors, notes, review, and submission visually.

### 5.6 Interactive field map

The redesigned workflow must include an interactive 2D top-down field map overlay for spatial observations.

- Use an accurate, proportionally scaled current-game field.
- Orient or mirror the map consistently for the selected alliance and label that orientation; never rely on color alone.
- Open it from Auto, Transition, and each Teleop shift without losing current form state.
- Support taps for Auto path points, cycle locations, and applicable made- or missed-shot locations.
- Make the active logging mode unambiguous before a tap can create data.
- Mark every point with event-type icon/shape and sequence or time order where relevant.
- Allow undo, selection, correction, and deletion.
- Prevent browser gestures or out-of-field taps from creating accidental observations.
- Support zoom/pan only if accuracy requires it, with an obvious reset/recenter action.
- Store normalized field coordinates, not screen pixels, so data is portable across device sizes and orientations.
- Store phase/subsection, event type, sequence or relative time, coordinates, and alliance/orientation with every point.
- Include coordinate data in incremental local persistence and recovery.
- Provide an accessible non-map alternative, such as zone buttons or a keyboard-operable field grid.
- Approve the field asset, origin, scale, legal bounds, event taxonomy, and precision before implementation.

This feature does not exist in the current UI or payload. It requires coordinated frontend, validation, local-storage, backend, and analytics schema work; section 8 contains a proposed contract.

## 6. Submission, persistence, and feedback

### 6.1 Submit

- Submit appears in Finale after a compact review containing at least event, match, and team being scouted.
- Validate the whole form, not just the visible section.
- Invalid submission must neither upload nor navigate. Show a summary plus field-level errors.
- While uploading, disable Submit, show “Submitting…,” and prevent duplicate requests.

### 6.2 Local recovery

- Before remote upload, preserve the complete record locally.
- Current storage key: `scoutData-{teamNumber}-{matchNumber}`.
- The current copy remains after success and failure.
- Clearly distinguish “saved on this device” from “uploaded.”
- Ideally save drafts incrementally, not only on Submit.
- The current key can overwrite the same team/match across events. A future-safe key should include event or a unique ID, coordinated with Local Data migration.

### 6.3 Upload and attribution

- Current remote path: `{teamNumber}/{matchNumber}`.
- The server, not the browser, adds authoritative `scoutUid`, `scoutName`, and `submittedAt` and removes client-provided identity, role, debug, and timestamp fields.
- Do not present editable scout identity as authoritative attribution.
- Confirmed success navigates home and replaces the form history entry.

### 6.4 Failure and retry

- A rejected or thrown upload leaves the populated form open.
- Announce that data is saved locally and can be retried through Local Data.
- Prefer a direct Retry action; Local Data remains a secondary recovery route.
- Use an accessible alert and text/iconography, not color alone.
- Home navigation remains in the site header; do not add a failure-only Back button.

### 6.5 Authentication

- Only authenticated users may access or submit.
- An expired or warning-stage session must be refreshed before starting a new form.
- If a warning occurs after mounting, preserve the draft.
- Authentication failure during upload must retain the local copy and support reauthentication/retry.
- Server-authorized debug users currently bypass only legacy required-field checks; debug must never bypass authentication, attribution, or server validation.

## 7. Validation

### 7.1 Existing checks and gaps

| ID | Existing behavior | Limitation |
|---|---|---|
| EV-01 | Non-debug submit requires non-empty event. | Only effective required check. |
| EV-02 | Checks team and match against `null`. | Both initialize to `0` and never become null, so blank/zero passes. |
| EV-03 | No scouting-team submit check. | `0` can be submitted. |
| EV-04 | Integer controls accept digits only; clearing produces `0`. | Empty and zero cannot be distinguished. |
| EV-05 | Non-zero Setup values clamp to 1–99,999. | Zero remains allowed. |
| EV-06 | Fuel values clamp to 0–999. | No domain-realistic maximum validation. |
| EV-07 | Booleans initialize false. | Untouched looks like an intentional “No.” |
| EV-08 | Changing any Hub Active value toggles all four. | Dependency is not explained. |
| EV-09 | No climb validation. | Invalid initial `"0"` can submit. |
| EV-10 | Errors, traversal, and notes are optional/unvalidated. | No intentional-none, conditional, or length rule. |
| EV-11 | Submit is disabled in progress. | Correctly prevents repeat activation during request. |
| EV-12 | Navigation occurs only on confirmed success. | Correctly preserves form/local copy on failure. |

### 7.2 Target validations

| ID | Requirement |
|---|---|
| V-01 | Event is required and must be an allowed event. |
| V-02 | Scouting team, match number, and team being scouted are required positive whole numbers in configured ranges. Placeholder, empty, and zero do not satisfy them. |
| V-03 | Fuel values are whole numbers from 0 through the configured maximum (currently 999). Prevent invalid counter actions and flag invalid direct input. |
| V-04 | Required observations start unanswered and require an intentional response. |
| V-05 | Endgame climb must be exactly one supported option; reject empty and legacy `"0"`. |
| V-06 | Hub values must match one valid alternating schedule; derive them rather than permit contradictions. |
| V-07 | Robot-error keys must be allow-listed booleans at the API boundary. |
| V-08 | Selecting Other requires an explanation. |
| V-09 | Notes require a documented maximum; 1,000 characters is proposed. Show a count near the limit without losing excess text silently. |
| V-10 | Validate all tabs on Submit, mark tabs with errors, and focus/navigate to the first invalid field. |
| V-11 | Associate messages programmatically with controls and announce them accessibly. |
| V-12 | Detect or explicitly confirm a duplicate event/team/match/scout record rather than silently overwrite it. |
| V-13 | Warn before leaving with unrecoverable changes. Explain what is locally saved versus at risk. |
| V-14 | Repeat integrity validation server-side; client checks are usability aids, not a trust boundary. |
| V-15 | Alliance is Red or Blue and, when schedule data exists, matches the event/match/team assignment. |
| V-16 | Map events use allowed types/phases and finite normalized coordinates inside playable bounds. |
| V-17 | Auto path points preserve unambiguous order after additions, edits, and deletion. |
| V-18 | Out-of-field taps, taps without a selected mode, and unintended gesture taps create no record. |

Suggested messages include “Select an event,” “Enter your scouting team number,” “Enter a valid match number,” “Enter the team being scouted,” and “Describe the other robot error.”

### 7.3 Domain decisions required

1. Are all Yes/No observations mandatory, or is Unknown/not observed a persisted value?
2. Should 999 limits be replaced with game-realistic per-phase limits?
3. Should event/team/match values be verified against a schedule and roster?
4. Must match type distinguish qualification, playoff, replay, and practice matches?
5. Should scouting team come from user/team configuration instead of per-match entry?
6. Should `transitionCollected` be exposed or removed?
7. What determines Hub Active order, and may scouts override it?
8. Should “Did not participate” disable or mark other metrics not applicable?
9. Do climb-related errors and climb outcomes require cross-field consistency?
10. Do bump/trench questions describe an observed occurrence or general capability?
11. Which map event types are required in each phase, and do made shots need coordinates or only misses?
12. What coordinate origin, precision, boundaries, and alliance-mirroring convention will analytics use?
13. Is alliance always schedule-derived, or may scouts override missing/incorrect schedule data?

## 8. Submission data contract

| Group | Keys |
|---|---|
| Setup | `scoutingTeam`, `eventName`, `teamNumber`, `matchNumber` |
| Auto | `autoFuel`, `autoClimbed`, `autoHoardedFuel` |
| Hub schedule | `shift1HubActive` through `shift4HubActive` |
| Collection | `transitionCollected`, `shift1Collected` through `shift4Collected` |
| Teleop fuel | `transitionFuel`, `shift1Fuel` through `shift4Fuel` |
| Defense | `shift1Defense` through `shift4Defense` |
| Hoarding | `shift1HoardedFuel` through `shift4HoardedFuel` |
| Endgame | `endgameFuel`, `endgameClimbLevel` |
| Finale | `crossedBump`, `underTrench`, `notes`, `robotError` |
| Alliance (new) | Proposed `allianceColor`: `"red"` or `"blue"` |
| Spatial events (new) | Proposed `fieldEvents`: ordered array of coordinate-event objects |
| Server-owned | `scoutUid`, `scoutName`, `submittedAt` |

`robotError` is an object mapping the eight supported option names to booleans.

Each proposed `fieldEvents` item contains:

| Property | Type/purpose |
|---|---|
| `phase` | `"auto"` or `"teleop"` |
| `subsection` | `"auto"`, `"transition"`, or `"shift1"` through `"shift4"` |
| `eventType` | Approved enum such as path point, cycle, made shot, or missed shot |
| `x` / `y` | Finite normalized coordinates in the canonical field system |
| `sequence` | Positive integer preserving event/path order |
| `recordedAtMs` | Optional elapsed-match or client-relative ordering aid, not an authoritative server timestamp |
| `allianceColor` | Red/Blue orientation context when recorded |

These new names and enums are proposals and must be finalized with backend and analytics consumers.

## 9. UI and interaction requirements

- Use a persistent header, five-phase progress/navigation, clear section heading, and strong priority for timed scoring controls.
- Use touch targets at least 44×44 CSS pixels with enough separation for rapid tapping.
- Give counter controls explicit accessible names such as “Add 5 Auto fuel.”
- Retain direct numeric entry for correction.
- Do not rely on hover or color alone.
- Yes/No controls must expose unanswered and selected states.
- Select and multi-select controls require persistent visible labels.
- Show immediate feedback after changes and preserve all values between tabs/shifts.
- Define states for untouched, completed, error, saving locally, saved locally, uploading, success, and failure.
- Do not use browser alerts as the sole validation UI.
- Use “Finale” consistently rather than alternating with “Errors.”
- Prefer observable, phase-specific language and expand abbreviations.

### 9.1 Tenth-of-a-second entry

- A press must produce visible acknowledgement within 100 ms while persistence/network work continues asynchronously.
- Prefer targets larger than the 44×44 accessibility minimum for scoring and map actions, positioned for one-handed, eyes-up use.
- Keep the most frequent action reachable without scrolling in its active phase where practical.
- Do not require precision taps, confirmation dialogs, or multi-step menus for routine scoring.
- Prevent accidental double counts without suppressing legitimately rapid repeated taps.
- Show the changed value close to the tapped control for glanceable confirmation.
- Never block field entry on remote network activity.

### 9.2 Alliance-aware theme

- Automatically apply Red or Blue styling when assignment data is known.
- Theme the header/status, active accents, and map orientation consistently while retaining a readable neutral base.
- Do not recolor semantic success, warning, or error states in ways that conflict with their meanings.
- Pair color with persistent alliance text/iconography.
- Both themes must meet WCAG contrast in default, focus, selected, disabled, and error states.
- Theme changes must not reset data, alter recorded coordinates, or reorder controls.
- Use a neutral theme when alliance is unknown and require resolution before coordinate-sensitive entry or final submission.

### 9.3 Micro-animations and haptic feedback

- Use a brief, subtle press-state animation after accepted input; it must not delay entry or shift surrounding layout.
- Respect `prefers-reduced-motion` and provide an equivalent static state change.
- Where supported, an optional short Vibration API pulse may confirm accepted high-frequency taps.
- Haptics are progressive enhancement: all workflows must work when unsupported, blocked, or disabled.
- Never vibrate on page load or routine navigation. Use a restrained invalid-input pattern only if user testing shows value.
- Provide a locally remembered preference to disable vibration and default conservatively by platform capability.
- Visible feedback remains authoritative; absent vibration never means failure.
- Fire animation/vibration only after input is accepted and no more than once per accepted action.

## 10. Non-functional requirements

### 10.1 Accessibility

- Target WCAG 2.2 AA.
- Support keyboard-only use and common screen readers.
- Use semantic labels, headings, buttons, tabs/panels where applicable, status, and alert semantics.
- Maintain logical focus order and clearly visible focus.
- Meet AA contrast in every state and never convey state by color alone.
- Support 200% text zoom and reflow at 320 CSS pixels without two-dimensional page scrolling.
- Respect reduced-motion preferences.

### 10.2 Responsive competition use

- Mobile-first for 320–480 CSS-pixel portrait screens; support tablets and desktop.
- No horizontal scrolling for core fields or Submit.
- The field map must fit phone widths, preserve its aspect ratio, and avoid page-level horizontal scrolling.
- Tolerate long event names, errors, zoom, and safe areas.
- Remain one-hand usable and legible in bright/high-glare conditions.

### 10.3 Performance

- Section changes and counter feedback should appear within 100 ms under normal load.
- The same 100 ms acknowledgement target applies to accepted map taps and other frequent observations.
- Input stays responsive during local persistence.
- Support lower-powered mobile/school devices and constrained competition Wi-Fi.
- Loading reference data should not unnecessarily block the rest of the form.

### 10.4 Reliability/offline behavior

- Preserve data through navigation, upload failure, session warning, and ideally reload/crash.
- Incrementally persist drafts with atomic-enough writes.
- Distinguish offline, locally saved, retry-needed, uploading, and uploaded.
- Make retries idempotent or protect against duplicates.
- Do not report success if a required write step fails.

### 10.5 Security/privacy

- Require authenticated, fresh-enough sessions and same-origin API/CSRF protections.
- Never trust browser identity, role, debug authority, timestamps, field allow-lists, or validation.
- Do not expose tokens, credentials, internals, or full submissions in errors/logs.
- Document retention/clearing expectations because local records remain accessible to scripts on the origin and may be on shared devices.
- Never expose Firebase service-account credentials to the browser or design artifacts.
- Haptic preferences and map interactions must not request unnecessary device permissions or collect device identifiers.

### 10.6 Maintainability/testability

- Centralize field definitions, labels, defaults, options, limits, and validation.
- Generate repeated shifts from one data-driven component.
- Preserve existing keys until an explicit migration.
- Test every validation, tab/shift retention, counter bounds, hub schedule, local saving, success, failure, retry, duplicate prevention, and accessibility-critical interaction.
- Record an approved evergreen browser/mobile-web support matrix before release.

## 11. Acceptance criteria

1. A scout can enter and revisit every documented field without data loss.
2. Teleop includes Transition plus four shifts and correctly communicates/derives Hub Active order.
3. Whole-form validation marks the relevant section and field.
4. No unanswered boolean appears to be an observed “No.”
5. Submit saves a local recovery copy first, prevents duplicate activation, and navigates home only on confirmed success.
6. Failure retains the populated form and clearly offers retry/recovery.
7. The site header owns homepage navigation and protects unsaved work.
8. The UI works at 320 CSS pixels, by keyboard and screen reader, and meets WCAG 2.2 AA.
9. The payload preserves section 8 and receives server-owned attribution.
10. Automated tests cover constraints, retention, validation, persistence, successful/failed upload, and accessibility-critical behavior.
11. Red and Blue assignments produce identifiable, contrast-compliant themes and correct map orientation without changing form data.
12. A scout can log, inspect, undo, correct, recover, and submit normalized spatial events.
13. Rapid accepted actions acknowledge within 100 ms, while reduced-motion, no-vibration, keyboard, and zone/grid alternatives remain usable.

## 12. Design-generation deliverables

Ask the UI design generator for annotated responsive designs, not only a single ideal-state screen. Include:

1. Mobile Setup with empty required fields.
2. Mobile Auto during rapid fuel entry.
3. Mobile Teleop Transition and one numbered shift.
4. Endgame with unanswered climb state.
5. Finale with expanded errors, Other selected, notes, and review summary.
6. Whole-form validation failure with tab indicators.
7. Submitting state.
8. Offline/upload-failed state with local-save confirmation and retry.
9. Tablet/desktop layout.
10. Header-level Home navigation and unsaved-changes handling.
11. Red, Blue, and neutral/unknown alliance variants.
12. Auto field-map overlay with a sequenced path.
13. Teleop field-map overlay in cycle and missed-shot modes, including undo/correction.
14. Micro-animation annotations and haptic/reduced-motion behavior.

Annotate default, unanswered, selected, focused, disabled, error, saved-locally, uploading, and failed states plus responsive behavior.
