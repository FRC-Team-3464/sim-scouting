import assert from "node:assert/strict";
import test from "node:test";

import {
    FIREBASE_AUTH_ERROR_CATEGORY,
    FirebaseAuthenticationError,
    signInWithEmailAndPassword,
} from "../auth/firebase-auth-rest.js";

/**
 * Creates the JSON response shape consumed by the REST client.
 *
 * @param {boolean} ok Whether the simulated HTTP request succeeded.
 * @param {unknown} body Simulated Firebase JSON payload.
 * @returns {{ok: boolean, json: () => Promise<unknown>}} Fetch response test double.
 */
function createJsonResponse(ok, body) {
    return {
        ok,
        async json() {
            return body;
        },
    };
}

test("signInWithEmailAndPassword sends the documented Firebase request", async () => {
    let capturedUrl;
    let capturedOptions;
    const fetchImplementation = async (url, options) => {
        capturedUrl = url;
        capturedOptions = options;
        return createJsonResponse(true, {
            idToken: "test-id-token",
            localId: "test-uid",
            email: "scout@example.com",
            displayName: "Scout Name",
            refreshToken: "discarded-refresh-token",
        });
    };

    const result = await signInWithEmailAndPassword({
        email: "scout@example.com",
        password: "test-password",
        firebaseWebApiKey: "test-api-key",
        fetchImplementation,
    });

    assert.equal(
        capturedUrl.origin + capturedUrl.pathname,
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
    );
    assert.equal(capturedUrl.searchParams.get("key"), "test-api-key");
    assert.equal(capturedOptions.method, "POST");
    assert.deepEqual(capturedOptions.headers, {
        "Content-Type": "application/json",
    });
    assert.deepEqual(JSON.parse(capturedOptions.body), {
        email: "scout@example.com",
        password: "test-password",
        returnSecureToken: true,
    });
    assert.deepEqual(result, {
        idToken: "test-id-token",
        uid: "test-uid",
        email: "scout@example.com",
        displayName: "Scout Name",
    });
    assert.equal("refreshToken" in result, false);
});

test("signInWithEmailAndPassword defaults a missing display name", async () => {
    const result = await signInWithEmailAndPassword({
        email: "scout@example.com",
        password: "test-password",
        firebaseWebApiKey: "test-api-key",
        fetchImplementation: async () =>
            createJsonResponse(true, {
                idToken: "test-id-token",
                localId: "test-uid",
                email: "scout@example.com",
            }),
    });

    assert.equal(result.displayName, "");
});

test("signInWithEmailAndPassword safely categorizes Firebase errors", async (t) => {
    const cases = [
        ["EMAIL_NOT_FOUND", FIREBASE_AUTH_ERROR_CATEGORY.INVALID_CREDENTIALS],
        ["INVALID_PASSWORD", FIREBASE_AUTH_ERROR_CATEGORY.INVALID_CREDENTIALS],
        [
            "INVALID_LOGIN_CREDENTIALS",
            FIREBASE_AUTH_ERROR_CATEGORY.INVALID_CREDENTIALS,
        ],
        ["USER_DISABLED", FIREBASE_AUTH_ERROR_CATEGORY.USER_DISABLED],
        [
            "TOO_MANY_ATTEMPTS_TRY_LATER",
            FIREBASE_AUTH_ERROR_CATEGORY.RATE_LIMITED,
        ],
        ["OPERATION_NOT_ALLOWED", FIREBASE_AUTH_ERROR_CATEGORY.NOT_CONFIGURED],
        ["UNKNOWN_INTERNAL_DETAIL", FIREBASE_AUTH_ERROR_CATEGORY.SERVICE_UNAVAILABLE],
    ];

    for (const [firebaseCode, expectedCategory] of cases) {
        await t.test(`maps ${firebaseCode}`, async () => {
            await assert.rejects(
                () =>
                    signInWithEmailAndPassword({
                        email: "scout@example.com",
                        password: "test-password",
                        firebaseWebApiKey: "test-api-key",
                        fetchImplementation: async () =>
                            createJsonResponse(false, {
                                error: {
                                    message: `${firebaseCode} : private upstream detail`,
                                },
                            }),
                    }),
                (error) => {
                    assert.ok(error instanceof FirebaseAuthenticationError);
                    assert.equal(error.category, expectedCategory);
                    assert.equal(error.message.includes("private upstream detail"), false);
                    return true;
                },
            );
        });
    }
});

test("signInWithEmailAndPassword categorizes network failures safely", async () => {
    await assert.rejects(
        () =>
            signInWithEmailAndPassword({
                email: "scout@example.com",
                password: "test-password",
                firebaseWebApiKey: "test-api-key",
                fetchImplementation: async () => {
                    throw new Error("private network detail");
                },
            }),
        {
            name: "FirebaseAuthenticationError",
            category: FIREBASE_AUTH_ERROR_CATEGORY.SERVICE_UNAVAILABLE,
            message: "Firebase Authentication is temporarily unavailable",
        },
    );
});

test("signInWithEmailAndPassword rejects malformed successful responses", async () => {
    await assert.rejects(
        () =>
            signInWithEmailAndPassword({
                email: "scout@example.com",
                password: "test-password",
                firebaseWebApiKey: "test-api-key",
                fetchImplementation: async () =>
                    createJsonResponse(true, { unexpected: "response" }),
            }),
        {
            category: FIREBASE_AUTH_ERROR_CATEGORY.SERVICE_UNAVAILABLE,
        },
    );
});
