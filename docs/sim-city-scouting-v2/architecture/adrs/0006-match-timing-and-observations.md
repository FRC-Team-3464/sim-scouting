# ADR 0006 — Match timing and observations

**Status:** Approved with amendments by product owner and principal architect

## Context

Official schedule time is not a live clock. Current forms store only totals.

## Decision

The Scout starts one device-local elapsed timer with an explicit **Start Match** action at the observed field cue. The implementation uses the device's monotonic elapsed-time facility while capture is active; locally persisted wall-clock anchors exist only to restore an interrupted capture. The active season package defines phase order and duration, and the application advances phases automatically.

The MVP exposes no routine pause/resume control, manual phase navigation, per-observation confidence prompt, or detailed clock-correction workflow. If the Scout starts late, misses observations, or distrusts restored timing, post-match review provides a simple timing/incompleteness issue flag and optional note. Restoration and any future correction remain auditable and never silently rewrite original observations.

Observations are append-oriented with client sequence, client time, elapsed match time, package-derived phase, type, payload, location, source, and a reserved optional uncertainty field that the MVP rapid-capture UI does not routinely request. Undo appends a void/supersede event. Official scheduled or actual time is linkage metadata, never the live device-timer authority.

High-throughput numeric observations use a redesigned multi-delta interaction: one visible total derived from append-oriented positive and negative adjustment actions. The season package defines labels, allowed deltas, bounds, and phase applicability. V1 establishes familiarity with this concept but does not establish v2 layout, styling, spacing, or color treatment.

## Alternatives considered

Schedule-driven timing is inaccurate. Server timing fails offline. A mutable total without an action history loses evidence; the approved counter instead derives its total from immutable delta actions. Routine pause/manual-phase controls, detailed clock correction, and per-observation confidence were rejected for MVP because they add Scout training and attention cost without validated value; they remain possible only through a later approved amendment.

## Rationale and consequences

The Scout sees one simple timer even though the implementation uses the appropriate device time source for elapsed measurement and wall-clock anchors for restart recovery. Independent device clocks preserve offline capture but may drift; consensus cannot assume exact cross-device timestamp alignment. Avoiding routine timing and confidence controls reduces training and attention cost for an inexperienced scouting team.

## Implications

- **Security:** server validates ranges and configured types.
- **Offline:** full timing works without connectivity and restores after restart.
- **Migration:** no legacy totals are converted.
- **Performance:** observation count and tap batching are bounded.
- **Accessibility:** the Start Match action is large, keyboard operable, and clearly confirmed; automatic phase announcements are rate-limited.

## Deferred work and validation

The simple MVP timer and post-match issue flag are approved and do not await method validation. Advanced pause/resume, manual phase navigation, detailed clock correction, or granular confidence capture are post-MVP candidates that require evidence and an approved amendment before introduction.

If a future integration provides reliable live field timing, a successor ADR must define source authority, latency, outage and offline fallback, local/field-time reconciliation, provenance, and contract versioning before it supplements or replaces the device-local timer.
