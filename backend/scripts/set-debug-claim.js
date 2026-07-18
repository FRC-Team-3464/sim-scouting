/**
 * Restricted command-line administration for the Firebase `debug` claim.
 *
 * This script is intentionally not an HTTP endpoint. It requires the backend
 * service-account configuration and must be run only by a trusted developer.
 * Existing custom claims are preserved, and sessions are revoked after every
 * change so the user must authenticate again with the updated authorization.
 */

import { pathToFileURL } from "node:url";

import { loadConfiguration } from "../config.js";
import { initializeFirebase } from "../firebase.js";

const MAXIMUM_FIREBASE_UID_LENGTH = 128;

/**
 * Identifies a safe, user-correctable command-line argument error.
 *
 * The command runner may print this error's message because it is constructed
 * only from static usage guidance and never contains Firebase responses,
 * credentials, claims, or other sensitive values.
 */
export class DebugClaimArgumentError extends Error {
    /**
     * Creates an argument error containing safe command guidance.
     *
     * @param {string} message Static validation or usage message.
     */
    constructor(message) {
        super(message);
        this.name = "DebugClaimArgumentError";
    }
}

/**
 * Validates the UID and boolean supplied on the command line.
 *
 * Requiring an explicit `true` or `false` prevents a misspelled value from
 * accidentally granting debug access. Firebase UIDs are non-empty strings no
 * longer than 128 characters.
 *
 * @param {string[]} argumentsList Arguments after the script filename.
 * @returns {{uid: string, enabled: boolean}} Validated administration request.
 * @throws {Error} When the command arguments are missing or malformed.
 */
export function parseDebugClaimArguments(argumentsList) {
    if (argumentsList.length !== 2) {
        throw new DebugClaimArgumentError(
            "Usage: npm run debug:claim -- <firebase-uid> <true|false>",
        );
    }

    const [uid, enabledValue] = argumentsList;

    if (
        uid.trim() !== uid ||
        uid.length === 0 ||
        uid.length > MAXIMUM_FIREBASE_UID_LENGTH
    ) {
        throw new DebugClaimArgumentError(
            "Firebase UID must be a non-empty value of at most 128 characters",
        );
    }

    if (enabledValue !== "true" && enabledValue !== "false") {
        throw new DebugClaimArgumentError(
            "Debug claim value must be exactly true or false",
        );
    }

    return {
        uid,
        enabled: enabledValue === "true",
    };
}

/**
 * Grants or removes one user's debug claim without deleting other claims.
 *
 * Firebase replaces the complete custom-claims object on every update, so the
 * current claims must be read and copied first. Revoking refresh tokens makes
 * existing session cookies fail the application's per-request revocation check;
 * the user must log in again to obtain a session containing the new claim.
 *
 * @param {import("firebase-admin/auth").Auth} auth Firebase Admin Auth service.
 * @param {string} uid Firebase Authentication user UID.
 * @param {boolean} enabled Whether debug access should be granted.
 * @returns {Promise<void>} Resolves after claims are updated and sessions revoked.
 * @throws {Error} When Firebase cannot find or update the user.
 */
export async function updateDebugClaim(auth, uid, enabled) {
    const user = await auth.getUser(uid);
    const updatedClaims = { ...(user.customClaims || {}) };

    if (enabled) {
        updatedClaims.debug = true;
    } else {
        delete updatedClaims.debug;
    }

    await auth.setCustomUserClaims(uid, updatedClaims);
    await auth.revokeRefreshTokens(uid);
}

/**
 * Runs the trusted command-line workflow with safe success and failure output.
 *
 * No service-account value, token, cookie, or full Firebase error is printed.
 *
 * @returns {Promise<void>} Resolves after the requested claim update.
 */
async function run() {
    try {
        const { uid, enabled } = parseDebugClaimArguments(
            process.argv.slice(2),
        );
        const configuration = loadConfiguration();
        const { auth } = initializeFirebase(
            configuration.serviceAccountKey,
        );

        await updateDebugClaim(auth, uid, enabled);
        console.info("Firebase debug claim updated", {
            uid,
            debug: enabled,
            sessionsRevoked: true,
        });
    } catch (error) {
        if (error instanceof DebugClaimArgumentError) {
            console.error("Invalid debug claim command");
            console.error(error.message);
            process.exitCode = 1;
            return;
        }

        const category =
            error &&
            typeof error === "object" &&
            "code" in error &&
            typeof error.code === "string" &&
            /^auth\/[a-z-]+$/.test(error.code)
                ? error.code
                : "DEBUG_CLAIM_UPDATE_FAILED";

        console.error("Unable to update Firebase debug claim", { category });

        process.exitCode = 1;
    }
}

const isExecutedDirectly =
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href;

if (isExecutedDirectly) {
    await run();
}
