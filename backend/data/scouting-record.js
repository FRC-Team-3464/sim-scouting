/**
 * Server-owned scouting attribution helpers.
 *
 * Browser data is never an authentication source. These helpers discard
 * caller-controlled identity and role fields before adding identity obtained
 * from a verified Firebase session.
 */

export const SHARED_TEAM_INDEX_PATH = "datas/data";

const CALLER_CONTROLLED_IDENTITY_FIELDS = [
    "name",
    "uid",
    "scoutName",
    "scoutUid",
    "submittedAt",
    "debug",
    "role",
    "roles",
];

/**
 * Identifies the shared team-number index that is not a scouting submission.
 *
 * Keeping this document free of per-scout fields preserves its existing
 * `{team: [...]}` representation and avoids attributing a shared index update
 * to whichever scout happened to add the latest team.
 *
 * @param {string} path Caller-selected Firestore document path.
 * @returns {boolean} Whether the path is the shared team index.
 */
export function isSharedTeamIndexPath(path) {
    return path === SHARED_TEAM_INDEX_PATH;
}

/**
 * Creates a scouting document with identity derived from verified claims.
 *
 * Any identity, role, debug flag, or timestamp sent by the browser is removed
 * before the authoritative values are added. The UID provides a stable unique
 * identifier while the name remains convenient for people reading Firestore.
 * `submittedAt` records when the backend accepted an upload or offline retry.
 *
 * @param {Record<string, unknown>} submittedData Untrusted scouting fields.
 * @param {import("firebase-admin/auth").DecodedIdToken} verifiedUser Verified claims.
 * @param {() => unknown} createServerTimestamp Firestore timestamp factory.
 * @returns {Record<string, unknown>} Sanitized, server-attributed record.
 */
export function createAuthenticatedScoutingRecord(
    submittedData,
    verifiedUser,
    createServerTimestamp,
) {
    const authenticatedRecord = { ...submittedData };

    for (const field of CALLER_CONTROLLED_IDENTITY_FIELDS) {
        delete authenticatedRecord[field];
    }

    const scoutName =
        typeof verifiedUser.name === "string" && verifiedUser.name.length > 0
            ? verifiedUser.name
            : verifiedUser.email || verifiedUser.uid;

    return {
        ...authenticatedRecord,
        scoutUid: verifiedUser.uid,
        scoutName,
        submittedAt: createServerTimestamp(),
    };
}
