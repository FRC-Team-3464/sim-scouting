import assert from "node:assert/strict";
import test from "node:test";

import {
    SESSION_COOKIE_NAME,
    calculateSessionTiming,
    createClearSessionCookieOptions,
    createSessionCookie,
    createSessionCookieOptions,
    verifySessionCookie,
} from "../auth/session.js";

test("the authentication cookie uses the documented name", () => {
    assert.equal(SESSION_COOKIE_NAME, "session");
});

test("createSessionCookie converts configured minutes to milliseconds", async () => {
    const calls = [];
    const auth = {
        async createSessionCookie(idToken, options) {
            calls.push({ idToken, options });
            return "test-session-cookie";
        },
    };

    const sessionCookie = await createSessionCookie(
        auth,
        "test-id-token",
        360,
    );

    assert.equal(sessionCookie, "test-session-cookie");
    assert.deepEqual(calls, [
        {
            idToken: "test-id-token",
            options: { expiresIn: 21_600_000 },
        },
    ]);
});

test("verifySessionCookie always enables revocation checking", async () => {
    const calls = [];
    const decodedClaims = {
        uid: "test-uid",
        exp: 1_800_000_000,
    };
    const auth = {
        async verifySessionCookie(sessionCookie, checkRevoked) {
            calls.push({ sessionCookie, checkRevoked });
            return decodedClaims;
        },
    };

    const result = await verifySessionCookie(auth, "test-session-cookie");

    assert.equal(result, decodedClaims);
    assert.deepEqual(calls, [
        {
            sessionCookie: "test-session-cookie",
            checkRevoked: true,
        },
    ]);
});

test("calculateSessionTiming returns expiration and warning timestamps", () => {
    const expiration = Date.parse("2026-07-18T02:00:00.000Z");

    const timing = calculateSessionTiming(
        { exp: expiration / 1000 },
        30,
    );

    assert.deepEqual(timing, {
        sessionExpiresAt: "2026-07-18T02:00:00.000Z",
        sessionExpirationWarningAt: "2026-07-18T01:30:00.000Z",
    });
});

test("calculateSessionTiming rejects a missing expiration claim", () => {
    assert.throws(
        () => calculateSessionTiming({}, 30),
        { message: "Verified session is missing a valid expiration time" },
    );
});

test("createSessionCookieOptions creates secure production options", () => {
    const options = createSessionCookieOptions({
        sessionDurationMinutes: 360,
        sessionCookieSecure: true,
        sessionCookieSameSite: "lax",
    });

    assert.deepEqual(options, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 21_600_000,
    });
});

test("createSessionCookieOptions permits local HTTP development", () => {
    const options = createSessionCookieOptions({
        sessionDurationMinutes: 360,
        sessionCookieSecure: false,
        sessionCookieSameSite: "lax",
    });

    assert.equal(options.secure, false);
});

test("createClearSessionCookieOptions matches identifying attributes", () => {
    const options = createClearSessionCookieOptions({
        sessionCookieSecure: true,
        sessionCookieSameSite: "lax",
    });

    assert.deepEqual(options, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
    });
    assert.equal("maxAge" in options, false);
});
