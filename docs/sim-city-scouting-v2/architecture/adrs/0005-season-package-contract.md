# ADR 0005 — Season package contract

**Status:** Approved with amendments by product owner

## Context

Annual game changes require configuration without arbitrary executable forms.

## Decision

A season package is an immutable published manifest plus bounded resources for phases, observations, controlled component definitions, field zones/assets, validations, derived metrics, pit questions, and analytics mappings. Lifecycle is `draft`, `published`, `superseded`, `retired`, or `revoked`; published content is immutable and identified by schema version, content version, hash, and client compatibility range. An Administrator may publish without a second approver but must confirm the action and provide an audited change reason. Changes create a new immutable version. The server validates submissions against the exact published hash.

Components come only from a compiled, versioned registry owned by the Season Package contract. The independently hashed observations resource references definitions in the components resource by stable ID. Every observation independently selects one allow-listed kind and bounded configuration; no kind, including the multi-delta counter, is universal. Architecture defines component schemas and common behavior, UI design owns compiled renderers, validation selects season-specific kinds/configuration, and delivery implements executable validators before packages may publish them. A package cannot define layout, styling, executable behavior, or a new component kind.

Registry schema version 1 includes three approved historical-coverage amendments. CCR-001 adds `categorical_action`, where each activation appends one timestamped event with exactly one configured option rather than replacing prior evidence. CCR-002 requires every zone or coordinate action to declare bounded action options and every spatial payload to identify both an action option and a location. CCR-003 excludes raw timer, stopwatch, and cycle-timer payload kinds; compiled timing controls persist timestamped actions or state transitions, and durations and cycles are derived from that evidence.

## Alternatives considered

Hardcoding requires annual redeploys. Arbitrary JSON forms cannot express safe live workflows. Executable markup/code is unacceptable.

## Rationale and consequences

The package allows controlled variation and rollback. Adding a new widget still requires reviewed application code.

## Implications

- **Security:** packages contain data only and require publication permission.
- **Offline:** retain active and previous known-good versions.
- **Migration:** no legacy field registry is imported.
- **Performance:** validate size and lazy-load assets.
- **Accessibility:** registry components must meet WCAG and offer non-map alternatives.

## Deferred work and validation

Capture method defaults and per-observation component selection remain empirical. The product owner and principal architect approved CCR-001, CCR-002, and CCR-003 from the [historical coverage review](../../validation/controlled-component-registry-evidence.md) on 2026-07-24; the Season Package contract contains their normative schemas and invariants. Revisit if an evidence-backed annual need cannot be represented by the controlled registry; adding a kind requires an approved amendment and compatible application release rather than a package-only change.
