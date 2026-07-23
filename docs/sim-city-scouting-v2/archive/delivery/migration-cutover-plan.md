# V2 migration, cutover, and rollback plan

> Archived delivery draft. It is superseded by `delivery/delivery-plan.md`.

**Status:** Proposed; legacy-data disposition approved

## Policy

Existing legacy scouting data is not preserved, exported, adapted, transformed, or used by v2. There is no dual-write, shadow-write, or legacy payload adapter. Modern Firebase authentication/session/CSRF code is retained. Destructive Firestore cleanup remains a separately approved operation.

## Preparation

1. Accept ADRs and contracts.
2. Add feature flags for v2 navigation, writes, reads, and privileged operations.
3. Build v2 collections/endpoints without exposing them to unapproved users.
4. Validate authentication, CSRF, permissions, offline recovery, idempotency, event/season packages, monitoring, and rollback in an isolated environment.
5. Complete method validation and Scout workspace acceptance.
6. Communicate that legacy local and server scouting data will not carry forward.

## Cutover

1. Freeze legacy scouting writes for a short announced maintenance window.
2. Deploy the reviewed v2 server and client together.
3. Enable v2 reads/writes for administrators and smoke-test users.
4. Verify login, package download, assignment, offline capture, reconnect, idempotent submission, receipt, permissions, and safe logs.
5. Expand the feature flag to all event users.
6. Remove frontend access to legacy Match, Pit, and Local Data workflows.
7. After an acceptance window, remove generic `/api/read` and `/api/write` and legacy `/api/login` and `/api/register`.
8. Only after explicit destructive approval, remove obsolete legacy Firestore data and `auth/*` password-hash documents.

## Rollback

Before legacy routes/data deletion, rollback disables v2 writes, preserves v2 IndexedDB records, and redeploys the last approved code. Submitted v2 records remain isolated; do not translate them into legacy writes. After legacy removal, rollback means restoring a prior v2 release or disabling new submissions while repairing forward. It does not restore legacy data compatibility.

## Acceptance and abort conditions

Abort expansion on authentication/CSRF regression, missing receipts, duplicate canonical records, unrecoverable IndexedDB migration, assignment misattribution, unsafe logging, production/staging data crossover, or material accessibility regression. Rollback instructions and responsible owners must be available before enabling writes.

## Existing local data

On first v2 launch, detect legacy `scoutData-*` keys, explain that they are unsupported, and offer explicit deletion. Do not parse, upload, or migrate them into v2.
