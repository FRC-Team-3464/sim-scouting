# ADR 0005 — Season package contract

**Status:** Proposed

## Context

Annual game changes require configuration without arbitrary executable forms.

## Decision

A season package is an immutable published manifest plus bounded resources for phases, observations, controlled component definitions, field zones/assets, validations, derived metrics, pit questions, and analytics mappings. Lifecycle is `draft`, `published`, `retired`; published content is immutable and identified by schema version, content version, hash, and client compatibility range. The server validates submissions against the exact published hash. Components come only from a compiled registry.

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

Capture method defaults remain empirical. Revisit if annual needs cannot be represented by the controlled registry.
