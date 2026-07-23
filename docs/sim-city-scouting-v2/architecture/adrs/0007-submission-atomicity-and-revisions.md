# ADR 0007 — Submission atomicity and revisions

**Status:** Proposed

## Context

Large observation streams cannot safely be assumed to fit one request or Firestore batch.

## Decision

Validate authentication, CSRF, permission, envelope, assignment/context, season package, observations, and cross-field rules in that order. Upload bounded immutable observation chunks idempotently, then finalize a record revision in a Firestore transaction that verifies chunk hashes, writes the canonical revision/summary, and creates the receipt. A record is not synchronized until finalization succeeds. Corrections create a new revision and superseding observations; submitted evidence is not silently mutated.

## Alternatives considered

One large atomic submission risks platform limits. Partial untracked writes are ambiguous. In-place updates destroy audit history.

## Rationale and consequences

Chunking supports large offline records and deterministic retries. Orphan chunks require expiry cleanup and cannot appear in analytics before finalization.

## Implications

- **Security:** every chunk is owner-, assignment-, and package-bound.
- **Offline:** retries resume by chunk hash.
- **Migration:** no legacy compatibility transaction.
- **Performance:** bounds respect Vercel 4.5 MB and Firestore 10 MiB requests.
- **Accessibility:** progress and rejection identify actionable steps.

## Deferred work and validation

Set exact chunk/count/size limits after payload profiling. Revisit if observed records always fit a simpler bounded transaction.
