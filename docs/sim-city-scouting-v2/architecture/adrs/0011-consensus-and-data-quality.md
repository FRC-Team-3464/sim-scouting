# ADR 0011 — Consensus and data quality

**Status:** Approved by product owner and principal architect

## Context

Multiple scouts may observe one robot; overwriting or silent merging destroys evidence.

## Decision

Retain independent records. Derive versioned consensus only for configured metrics with sufficient contributors. Store contributing record revisions, algorithm version, agreement measures, range overlap, categorical distributions, outlier flags, and recomputation time. Subjective notes and unique observations remain scout-specific. Recompute asynchronously or on read from finalized revisions; a failed consensus update never invalidates accepted evidence.

## Alternatives considered

Last-write wins and manual silent merges were rejected. Universal averaging is invalid for categorical and uncertain observations.

## Rationale and consequences

Auditable consensus supports strategy without hiding disagreement. Algorithms require calibration and can become stale.

## Implications

- **Security:** cross-scout and consensus reads require capability.
- **Offline:** raw records sync first; consensus may be unavailable offline until cached.
- **Migration:** no legacy records participate.
- **Performance:** recomputation is bounded and decoupled from submission acceptance.
- **Accessibility:** disagreement indicators use text and explanations, not color alone.

## Deferred work and validation

Metric-specific algorithms and minimum scout count require data-analysis validation. Revisit whenever season capture methods change.
