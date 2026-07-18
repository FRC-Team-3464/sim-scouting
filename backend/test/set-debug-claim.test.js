import assert from "node:assert/strict";
import test from "node:test";

import {
    parseDebugClaimArguments,
    updateDebugClaim,
} from "../scripts/set-debug-claim.js";

test("debug claim arguments require one UID and an explicit boolean", () => {
    assert.deepEqual(parseDebugClaimArguments(["test-uid", "true"]), {
        uid: "test-uid",
        enabled: true,
    });
    assert.deepEqual(parseDebugClaimArguments(["test-uid", "false"]), {
        uid: "test-uid",
        enabled: false,
    });
    assert.throws(() => parseDebugClaimArguments([]), /Usage:/);
    assert.throws(
        () => parseDebugClaimArguments(["test-uid", "yes"]),
        /exactly true or false/,
    );
    assert.throws(
        () => parseDebugClaimArguments([" spaced-uid ", "true"]),
        /Firebase UID/,
    );
});

/**
 * Creates an observable Firebase Auth administration test double.
 *
 * @param {object} customClaims Existing user claims.
 * @returns {{auth: object, calls: object}}
 * Fake Auth service and recorded administrative operations.
 */
function createAuthTestDouble(customClaims) {
    const calls = {
        getUser: [],
        setCustomUserClaims: [],
        revokeRefreshTokens: [],
    };
    const auth = {
        async getUser(uid) {
            calls.getUser.push(uid);
            return { uid, customClaims };
        },
        async setCustomUserClaims(uid, claims) {
            calls.setCustomUserClaims.push({ uid, claims });
        },
        async revokeRefreshTokens(uid) {
            calls.revokeRefreshTokens.push(uid);
        },
    };

    return { auth, calls };
}

test("granting debug preserves other claims and revokes old sessions", async () => {
    const context = createAuthTestDouble({ driveTeam: true });

    await updateDebugClaim(context.auth, "test-uid", true);

    assert.deepEqual(context.calls.setCustomUserClaims, [
        {
            uid: "test-uid",
            claims: { driveTeam: true, debug: true },
        },
    ]);
    assert.deepEqual(context.calls.revokeRefreshTokens, ["test-uid"]);
});

test("removing debug preserves other claims and revokes privileged sessions", async () => {
    const context = createAuthTestDouble({ driveTeam: true, debug: true });

    await updateDebugClaim(context.auth, "test-uid", false);

    assert.deepEqual(context.calls.setCustomUserClaims, [
        {
            uid: "test-uid",
            claims: { driveTeam: true },
        },
    ]);
    assert.deepEqual(context.calls.revokeRefreshTokens, ["test-uid"]);
});
