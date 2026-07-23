# Pit Scouting contract

**Status:** Proposed

## Identity and model

Pit scouting is keyed by `seasonKey`, `eventKey`, and `teamNumber`; match number is prohibited. Contributor records remain distinct:

```ts
interface PitContributionRevision {
  contributionId: string; revision: number; seasonKey: string; eventKey: string;
  teamNumber: number; assignmentId?: string; contributorUid: string;
  seasonPackageHash: string; robotIdentity: {label?: string; changeNote?: string};
  dimensions?: MeasurementSet; drivetrain?: StructuredAnswer;
  mechanisms: StructuredAnswer[]; capabilities: CapabilityClaim[];
  autonomous: StructuredAnswer[]; endgame: StructuredAnswer[];
  controls?: StructuredAnswer; sensors?: StructuredAnswer[];
  reliability?: StructuredAnswer; repairability?: StructuredAnswer;
  driverExperience?: StructuredAnswer; notes?: string; photoIds?: string[];
  createdAt: string; finalizedAt: string;
}
```

Claims include value, claim source, contributor, confidence, and optional evidence. Match-observed verification lives outside pit records. A derived team/event profile references contribution revisions and exposes disagreements rather than overwriting them.

## Optional photo extension

Photos are not an MVP requirement. MVP clients omit `photoIds`, expose no upload flow, and complete every structured pit workflow without blob storage. The optional field is reserved only as a compatibility point for a separately approved extension.

A future extension must define provider and billing, event-scale quota budgets, retention/deletion, compression, formats, dimensions, MIME and content validation, metadata stripping, accessible descriptions, ownership, idempotency, offline behavior, and graceful disablement. Image bytes must not be stored in Firestore or embedded in contribution JSON.

## Ownership and storage

- **Authoritative/server-only:** contributor identity, revision, timestamps, and validation status.
- **Client-authored:** structured answers, claims, and notes.
- **Derived:** canonical profile and verified-vs-claimed indicators.
- **Local-only:** draft and outbox state.
- Index by event/team, contributor/event, assignment, finalization time. Notes max 2,000 characters; contribution JSON max 512 KiB. Retention follows event/team governance; deletion creates an audit tombstone.

## API

- `POST /api/scouting/v2/pit/contributions`
- `POST /api/scouting/v2/pit/contributions/:id/revisions`
- `GET /api/scouting/v2/pit/events/:eventKey/teams/:teamNumber`

Create request includes `idempotencyKey`, context, package hash, and answers. Success: `201 {"contributionId":"pitc_...","revision":1,"receiptId":"rcpt_..."}`.

Validation: `422 {"error":{"code":"PIT_VALIDATION_FAILED","message":"Pit submission is invalid","retryable":false,"details":[{"path":"dimensions.weight","code":"unit_required"}]}}`
Authentication: `401 {"error":{"code":"AUTHENTICATION_REQUIRED","message":"Log in to continue","retryable":true}}`
Conflict: `409 {"error":{"code":"PIT_REVISION_CONFLICT","message":"A newer contribution revision exists","retryable":false,"details":{"currentRevision":2}}}`
Structured contributions are independently idempotent and never depend on an optional photo service.
