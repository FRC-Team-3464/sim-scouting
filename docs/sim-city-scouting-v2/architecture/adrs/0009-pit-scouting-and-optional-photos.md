# ADR 0009 — Pit scouting and optional photos

**Status:** Proposed

## Context

Current pit data incorrectly carries a match number and overwrites one team document. Photos can help identify a robot, but structured pit scouting supplies the essential capability, configuration, and reliability evidence. Making photos an MVP dependency would introduce blob storage, billing, quotas, retention, privacy, offline capacity, and upload-failure work before its value is validated.

## Decision

Pit identity is `(seasonKey,eventKey,teamNumber)`. Contributor submissions and revisions remain separate and attributable; a derived canonical profile reconciles claims. Claimed capabilities remain distinct from match-verified observations. Match number is prohibited.

The MVP neither requires nor uploads photos. Structured pit contributions must create, review, synchronize, and derive profiles with zero photos. Contracts may reserve optional photo references, but no storage provider, billing plan, upload endpoint, image processor, local photo queue, or retention policy is selected for MVP.

If product validation later justifies photos, amend this ADR or add a successor decision. Image bytes must use object/blob storage rather than Firestore or scouting JSON, and the extension must remain independently disableable.

## Alternatives considered

A merge-written team document loses contributor history. Required photos add field friction and operational dependencies without proven MVP necessity. Permanently prohibiting photos would remove a potentially useful identification aid, so a compatible extension point remains.

## Consequences

- Structured pit scouting has no Firebase Storage or Blaze billing dependency.
- MVP offline storage budgets and synchronization do not include image blobs.
- A later extension must validate provider cost/quota, event usage, retention, MIME/size/hash checks, metadata stripping, accessibility descriptions, and graceful degradation.
- Photos, if introduced, are never sole evidence and never block structured submissions.
- No legacy pit record or image is imported.

## Deferred validation

Measure whether scouts and strategists materially benefit from robot identification photos and estimate uploads, downloads, local storage, and retention per event. Only then select a provider and enforce limits.
