# ADR 0006 — Match timing and observations

**Status:** Proposed

## Context

Official schedule time is not a live clock. Current forms store only totals.

## Decision

The scout starts a monotonic local clock at the observed field cue. The active season package defines phases. Store wall-clock anchors only for restoration; ordering and phase derivation use elapsed monotonic time plus an audit trail of start, pause, resume, phase override, and timer correction events. Observations are append-oriented with client sequence, client time, elapsed time, phase, type, payload, location, source, and optional uncertainty. Undo appends a void/supersede event. Official actual time is linkage metadata, never the device timer authority.

## Alternatives considered

Schedule-driven timing is inaccurate. Server timing fails offline. Mutable counters lose evidence.

## Rationale and consequences

Independent device clocks preserve offline capture and auditability but may drift; consensus cannot assume exact cross-device timestamp alignment.

## Implications

- **Security:** server validates ranges and configured types.
- **Offline:** full timing works without connectivity and restores after restart.
- **Migration:** no legacy totals are converted.
- **Performance:** observation count and tap batching are bounded.
- **Accessibility:** timer announcements are rate-limited and manual controls keyboard accessible.

## Deferred work and validation

Timer flow, confidence frequency, and clock-correction UX require testing. Revisit if reliable field timing becomes available through an approved integration.
