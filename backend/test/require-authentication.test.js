import assert from "node:assert/strict";
import test from "node:test";

import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";

import { createRequireAuthentication } from "../middleware/require-authentication.js";

/**
 * Creates an isolated protected route and observable Firebase test double.
 *
 * @param {object} options Test-specific verification behavior.
 * @returns {{app: import("express").Express, calls: object[], logs: object[]}}
 * Express test context.
 */
function createTestContext({ claims, verificationError } = {}) {
    const calls = [];
    const logs = [];
    const auth = {
        async verifySessionCookie(cookie, checkRevoked) {
            calls.push({ cookie, checkRevoked });

            if (verificationError) {
                throw verificationError;
            }

            return claims || {
                uid: "verified-uid",
                email: "scout@example.com",
                name: "Verified Scout",
            };
        },
    };
    const logger = {
        warn(message, event) {
            logs.push({ message, event });
        },
    };
    const app = express();

    app.use(cookieParser());
    app.get(
        "/api/protected",
        createRequireAuthentication({ auth, logger }),
        (req, res) => res.status(200).json({ user: req.user }),
    );

    return { app, calls, logs };
}

test("protected routes reject a missing session without calling Firebase", async () => {
    const context = createTestContext();

    const response = await request(context.app)
        .get("/api/protected")
        .expect(401);

    assert.deepEqual(response.body, { message: "Authentication required" });
    assert.deepEqual(context.calls, []);
    assert.deepEqual(context.logs[0].event, {
        route: "GET /api/protected",
        status: 401,
        category: "SESSION_MISSING",
    });
});

test("protected routes attach identity from a verified, non-revoked session", async () => {
    const context = createTestContext();

    const response = await request(context.app)
        .get("/api/protected")
        .set("Cookie", "session=test-session-cookie")
        .expect(200);

    assert.equal(response.body.user.uid, "verified-uid");
    assert.deepEqual(context.calls, [
        { cookie: "test-session-cookie", checkRevoked: true },
    ]);
    assert.deepEqual(context.logs, []);
});

for (const code of [
    "auth/session-cookie-expired",
    "auth/session-cookie-revoked",
    "auth/user-disabled",
    "auth/user-not-found",
]) {
    test(`protected routes reject ${code} safely`, async () => {
        const verificationError = new Error("Firebase internal details");
        verificationError.code = code;
        const context = createTestContext({ verificationError });

        const response = await request(context.app)
            .get("/api/protected")
            .set("Cookie", "session=rejected-session-cookie")
            .expect(401);

        assert.deepEqual(response.body, {
            message: "Invalid or expired session",
        });
        assert.equal(context.logs[0].event.category, code);
        assert.doesNotMatch(JSON.stringify(context.logs), /internal details/i);
        assert.doesNotMatch(JSON.stringify(context.logs), /rejected-session-cookie/);
    });
}
