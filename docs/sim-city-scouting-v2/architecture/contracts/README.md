# Architecture contracts

**Status:** Proposed for review

- [Scouting v2 data model and API](scouting-v2-data-model-api.md)
- [Season package](season-package.md)
- [Assignment model](assignment-model.md)
- [Event package](event-package.md)
- [Pit Scouting](pit-scouting.md)
- [Offline synchronization](offline-sync.md)
- [Roles and permissions](roles-permissions.md)

All mutations require the existing Firebase session and signed CSRF protection. Error envelopes use `{ "error": { "code", "message", "retryable", "details?" } }` and never expose credentials, cookies, tokens, internal paths, or stack traces.
