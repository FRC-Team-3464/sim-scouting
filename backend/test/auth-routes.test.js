import assert from "node:assert/strict";
import test from "node:test";

import express from "express";
import request from "supertest";

import {
    FIREBASE_AUTH_ERROR_CATEGORY,
    FirebaseAuthenticationError,
} from "../auth/firebase-auth-rest.js";
import { createAuthenticationRouter } from "../routes/auth.js";

const expirationSeconds =
    Date.parse("2026-07-18T02:00:00.000Z") / 1000;

const defaultConfiguration = {
    corsAllowedOrigin: "http://localhost:5173",
    csrfSecret: "a".repeat(64),
    firebaseWebApiKey: "test-firebase-web-api-key",
    sessionDurationMinutes: 360,
    sessionExpirationWarningMinutes: 30,
    sessionCookieSecure: false,
    sessionCookieSameSite: "lax",
};

/**
 * Creates an isolated Firebase Admin Auth test double with observable calls.
 *
 * @param {Partial<object>} overrides Optional behavior replaced for one test.
 * @returns {{auth: object, calls: object}} Fake service and recorded calls.
 */
function createAuthTestDouble(overrides = {}) {
    const calls = {
        createUser: [],
        createSessionCookie: [],
        verifySessionCookie: [],
    };
    const auth = {
        async createUser(user) {
            calls.createUser.push(user);
            return {
                uid: "registered-uid",
                email: user.email,
                displayName: user.displayName,
            };
        },
        async createSessionCookie(idToken, options) {
            calls.createSessionCookie.push({ idToken, options });
            return "test-session-cookie";
        },
        async verifySessionCookie(sessionCookie, checkRevoked) {
            calls.verifySessionCookie.push({ sessionCookie, checkRevoked });
            return {
                uid: "test-uid",
                email: "scout@example.com",
                name: "Scout Name",
                debug: false,
                exp: expirationSeconds,
            };
        },
        ...overrides,
    };

    return { auth, calls };
}

/**
 * Creates a logger test double that stores only calls made by the router.
 *
 * @returns {{logger: object, entries: Array<object>}} Fake logger and entries.
 */
function createLoggerTestDouble() {
    const entries = [];
    const logger = {
        info(message, event) {
            entries.push({ level: "info", message, event });
        },
        warn(message, event) {
            entries.push({ level: "warn", message, event });
        },
        error(message, event) {
            entries.push({ level: "error", message, event });
        },
    };

    return { logger, entries };
}

/**
 * Creates an Express application containing only the new authentication API.
 *
 * @param {{
 *   authOverrides?: Partial<object>,
 *   configurationOverrides?: Partial<object>,
 *   authenticateWithPassword?: Function
 * }} options Per-test dependency behavior.
 * @returns {{
 *   app: import("express").Express,
 *   calls: object,
 *   logEntries: Array<object>,
 *   authenticationCalls: Array<object>
 * }} Isolated HTTP test context.
 */
function createTestContext({
    authOverrides,
    configurationOverrides,
    authenticateWithPassword,
} = {}) {
    const { auth, calls } = createAuthTestDouble(authOverrides);
    const { logger, entries: logEntries } = createLoggerTestDouble();
    const authenticationCalls = [];
    const authenticationFunction =
        authenticateWithPassword ||
        (async (credentials) => {
            authenticationCalls.push(credentials);
            return {
                idToken: "test-id-token",
                uid: "test-uid",
                email: credentials.email,
                displayName: "Scout Name",
            };
        });
    const app = express();
    const configuration = {
        ...defaultConfiguration,
        ...configurationOverrides,
    };

    app.use(express.json());
    app.use(
        "/api/auth",
        createAuthenticationRouter({
            auth,
            configuration,
            authenticateWithPassword: authenticationFunction,
            logger,
        }),
    );

    return {
        app,
        calls,
        logEntries,
        authenticationCalls,
        configuration,
    };
}

/**
 * Sends a browser-style POST with a valid signed CSRF token.
 *
 * The helper forwards both cookies issued by `/csrf`. Tests using it therefore
 * reach the existing business validation and Firebase logic instead of being
 * rejected at the new security boundary. Cookies are forwarded explicitly so
 * production Secure-cookie behavior can still be tested over local HTTP.
 *
 * @param {ReturnType<typeof createTestContext>} context Test application context.
 * @param {string} path Authentication endpoint path.
 * @param {object | undefined} body Optional JSON request body.
 * @param {number} expectedStatus Expected HTTP response status.
 * @returns {Promise<import("supertest").Response>} Completed HTTP response.
 */
async function sendProtectedPost(context, path, body, expectedStatus) {
    const csrfResponse = await request(context.app)
        .get("/api/auth/csrf")
        .set("Origin", context.configuration.corsAllowedOrigin)
        .expect(200);
    const csrfCookies = csrfResponse.headers["set-cookie"].map(
        (cookie) => cookie.split(";")[0],
    );
    let protectedRequest = request(context.app)
        .post(path)
        .set("Origin", context.configuration.corsAllowedOrigin)
        // Supertest correctly refuses to resend Secure cookies over its local
        // HTTP transport. Forwarding only the issued cookie pairs explicitly
        // lets the production-cookie test exercise CSRF without weakening the
        // configured Secure attribute.
        .set("Cookie", csrfCookies.join("; "))
        .set("X-CSRF-Token", csrfResponse.body.csrfToken);

    if (body !== undefined) {
        protectedRequest = protectedRequest.send(body);
    }

    return protectedRequest.expect(expectedStatus);
}

test("GET /api/auth/csrf issues signed cookies and a non-cacheable token", async () => {
    const context = createTestContext();

    const response = await request(context.app)
        .get("/api/auth/csrf")
        .set("Origin", context.configuration.corsAllowedOrigin)
        .expect(200);

    assert.match(response.body.csrfToken, /^[a-f\d]{64}\.[a-f\d]{64}$/);
    assert.equal(response.headers["cache-control"], "no-store");

    const cookies = response.headers["set-cookie"];
    const bindingCookie = cookies.find((cookie) =>
        cookie.startsWith("csrf_binding="),
    );
    const tokenCookie = cookies.find((cookie) =>
        cookie.startsWith("csrf_token="),
    );

    assert.ok(bindingCookie);
    assert.match(bindingCookie, /HttpOnly/);
    assert.match(bindingCookie, /Path=\//);
    assert.match(bindingCookie, /SameSite=Lax/);
    assert.ok(tokenCookie);
    assert.match(
        tokenCookie,
        new RegExp(`^csrf_token=${response.body.csrfToken};`),
    );
    assert.doesNotMatch(tokenCookie, /HttpOnly/);
    assert.match(tokenCookie, /Path=\//);
    assert.match(tokenCookie, /SameSite=Lax/);
    assert.equal(context.logEntries.length, 0);
});

test("GET /api/auth/csrf rejects an unexpected Origin without logging it", async () => {
    const context = createTestContext();
    const unexpectedOrigin = "https://attacker.example";

    const response = await request(context.app)
        .get("/api/auth/csrf")
        .set("Origin", unexpectedOrigin)
        .expect(403);

    assert.deepEqual(response.body, {
        message: "Request could not be verified",
    });
    assert.equal(
        context.logEntries[0].event.category,
        "CSRF_ORIGIN_REJECTED",
    );
    assert.equal(
        JSON.stringify(context.logEntries).includes(unexpectedOrigin),
        false,
    );
});

test("state-changing auth routes require the exact configured Origin", async (t) => {
    const cases = [
        ["missing Origin", undefined],
        ["unexpected Origin", "https://attacker.example"],
    ];

    for (const [name, origin] of cases) {
        await t.test(name, async () => {
            const context = createTestContext();
            let protectedRequest = request(context.app)
                .post("/api/auth/login")
                .send({
                    email: "scout@example.com",
                    password: "private-password",
                });

            if (origin) {
                protectedRequest = protectedRequest.set("Origin", origin);
            }

            const response = await protectedRequest.expect(403);

            assert.deepEqual(response.body, {
                message: "Request could not be verified",
            });
            assert.equal(
                context.logEntries[0].event.category,
                "CSRF_ORIGIN_REJECTED",
            );
            const serializedLogs = JSON.stringify(context.logEntries);
            assert.equal(serializedLogs.includes("private-password"), false);
            assert.equal(serializedLogs.includes(origin || "missing"), false);
            assert.equal(context.authenticationCalls.length, 0);
        });
    }
});

test("state-changing auth routes reject invalid CSRF tokens", async (t) => {
    const cases = [
        ["missing cookies and header", null, null, "CSRF_TOKEN_MISSING"],
        ["missing header", "issued", null, "CSRF_TOKEN_MISSING"],
        ["malformed header", "issued", "malformed", "CSRF_TOKEN_INVALID"],
        [
            "mismatched header",
            "issued",
            `${"b".repeat(64)}.${"c".repeat(64)}`,
            "CSRF_TOKEN_INVALID",
        ],
    ];

    for (const [name, cookieMode, headerToken, category] of cases) {
        await t.test(name, async () => {
            const context = createTestContext();
            const agent = request.agent(context.app);
            let issuedToken;

            if (cookieMode === "issued") {
                const csrfResponse = await agent
                    .get("/api/auth/csrf")
                    .set("Origin", context.configuration.corsAllowedOrigin)
                    .expect(200);
                issuedToken = csrfResponse.body.csrfToken;
            }

            let protectedRequest = agent
                .post("/api/auth/login")
                .set("Origin", context.configuration.corsAllowedOrigin)
                .send({
                    email: "scout@example.com",
                    password: "private-password",
                });

            if (headerToken) {
                protectedRequest = protectedRequest.set(
                    "X-CSRF-Token",
                    headerToken === "issued" ? issuedToken : headerToken,
                );
            }

            const response = await protectedRequest.expect(403);

            assert.deepEqual(response.body, {
                message: "Request could not be verified",
            });
            assert.equal(context.logEntries[0].event.category, category);
            assert.equal(
                JSON.stringify(context.logEntries).includes(
                    headerToken || issuedToken || "unused-token",
                ),
                false,
            );
            assert.equal(context.authenticationCalls.length, 0);
        });
    }
});

test(
    "registration and login reject non-JSON content types before validation",
    async () => {
        const context = createTestContext();
        const agent = request.agent(context.app);
        const csrfResponse = await agent
            .get("/api/auth/csrf")
            .set("Origin", context.configuration.corsAllowedOrigin)
            .expect(200);

        const response = await agent
            .post("/api/auth/login")
            .set("Origin", context.configuration.corsAllowedOrigin)
            .set("X-CSRF-Token", csrfResponse.body.csrfToken)
            .type("text/plain")
            .send("email=scout@example.com")
            .expect(415);

        assert.deepEqual(response.body, {
            message: "Content-Type must be application/json",
        });
        assert.equal(
            context.logEntries[0].event.category,
            "CSRF_CONTENT_TYPE_REJECTED",
        );
        assert.equal(context.authenticationCalls.length, 0);
    },
);

test("CSRF tokens rotate from pre-authentication to Firebase session binding", async () => {
    const context = createTestContext();
    const initialCsrfResponse = await request(context.app)
        .get("/api/auth/csrf")
        .set("Origin", context.configuration.corsAllowedOrigin)
        .expect(200);
    const preAuthenticationCookies =
        initialCsrfResponse.headers["set-cookie"].map(
            (cookie) => cookie.split(";")[0],
        );

    const loginResponse = await request(context.app)
        .post("/api/auth/login")
        .set("Origin", context.configuration.corsAllowedOrigin)
        .set("Cookie", preAuthenticationCookies.join("; "))
        .set("X-CSRF-Token", initialCsrfResponse.body.csrfToken)
        .send({
            email: "scout@example.com",
            password: "test-password",
        })
        .expect(200);
    const loginCookies = loginResponse.headers["set-cookie"];
    const sessionCookie = loginCookies
        .find((cookie) => cookie.startsWith("session=test-session-cookie;"))
        .split(";")[0];

    assert.ok(
        loginCookies.some((cookie) => cookie.startsWith("csrf_binding=;")),
    );
    assert.ok(
        loginCookies.some((cookie) => cookie.startsWith("csrf_token=;")),
    );

    // A token signed before authentication must fail after the Firebase
    // session cookie becomes the authoritative private binding.
    await request(context.app)
        .post("/api/auth/logout")
        .set("Origin", context.configuration.corsAllowedOrigin)
        .set(
            "Cookie",
            [sessionCookie, ...preAuthenticationCookies].join("; "),
        )
        .set("X-CSRF-Token", initialCsrfResponse.body.csrfToken)
        .expect(403);

    const sessionCsrfResponse = await request(context.app)
        .get("/api/auth/csrf")
        .set("Origin", context.configuration.corsAllowedOrigin)
        .set("Cookie", sessionCookie)
        .expect(200);
    const sessionTokenCookie = sessionCsrfResponse.headers["set-cookie"]
        .find((cookie) => cookie.startsWith("csrf_token="))
        .split(";")[0];

    assert.notEqual(
        sessionCsrfResponse.body.csrfToken,
        initialCsrfResponse.body.csrfToken,
    );
    const logoutResponse = await request(context.app)
        .post("/api/auth/logout")
        .set("Origin", context.configuration.corsAllowedOrigin)
        .set("Cookie", `${sessionCookie}; ${sessionTokenCookie}`)
        .set("X-CSRF-Token", sessionCsrfResponse.body.csrfToken)
        .expect(204);

    const clearedCookies = logoutResponse.headers["set-cookie"];
    assert.ok(clearedCookies.some((cookie) => cookie.startsWith("session=;")));
    assert.ok(
        clearedCookies.some((cookie) => cookie.startsWith("csrf_binding=;")),
    );
    assert.ok(
        clearedCookies.some((cookie) => cookie.startsWith("csrf_token=;")),
    );
});

test("POST /api/auth/register creates a user and verified session", async () => {
    const context = createTestContext();
    const password = "  preserved-password  ";

    const response = await sendProtectedPost(
        context,
        "/api/auth/register",
        {
            name: "  Scout Name  ",
            email: "  scout@example.com  ",
            password,
        },
        201,
    );

    assert.deepEqual(context.calls.createUser, [
        {
            email: "scout@example.com",
            password,
            displayName: "Scout Name",
        },
    ]);
    assert.deepEqual(context.authenticationCalls, [
        {
            email: "scout@example.com",
            password,
            firebaseWebApiKey: "test-firebase-web-api-key",
        },
    ]);
    assert.deepEqual(context.calls.createSessionCookie, [
        {
            idToken: "test-id-token",
            options: { expiresIn: 21_600_000 },
        },
    ]);
    assert.deepEqual(context.calls.verifySessionCookie, [
        {
            sessionCookie: "test-session-cookie",
            checkRevoked: true,
        },
    ]);
    assert.deepEqual(response.body, {
        user: {
            uid: "test-uid",
            email: "scout@example.com",
            name: "Scout Name",
            debug: false,
        },
        sessionExpiresAt: "2026-07-18T02:00:00.000Z",
        sessionExpirationWarningAt: "2026-07-18T01:30:00.000Z",
    });

    const setCookie = response.headers["set-cookie"][0];
    assert.match(setCookie, /^session=test-session-cookie;/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /Path=\//);
    assert.match(setCookie, /SameSite=Lax/);
    assert.doesNotMatch(setCookie, /Secure/);
    assert.equal(context.logEntries[0].event.uid, "registered-uid");
});

test("POST /api/auth/register requires name, email, and password", async () => {
    const context = createTestContext();

    const response = await sendProtectedPost(
        context,
        "/api/auth/register",
        { email: "scout@example.com", password: "test-password" },
        400,
    );

    assert.deepEqual(response.body, {
        message: "Name, email, and password are required",
    });
    assert.equal(context.calls.createUser.length, 0);
    assert.equal(context.logEntries[0].event.category, "INVALID_INPUT");
});

test("POST /api/auth/register maps expected Firebase Admin errors", async (t) => {
    const cases = [
        ["auth/email-already-exists", 409, "Email already in use"],
        ["auth/invalid-display-name", 400, "Invalid name"],
        ["auth/invalid-email", 400, "Invalid email address"],
        ["auth/invalid-password", 400, "Password is too weak"],
        [
            "auth/too-many-requests",
            429,
            "Too many registration attempts. Please try again later.",
        ],
    ];

    for (const [code, status, message] of cases) {
        await t.test(`maps ${code}`, async () => {
            const context = createTestContext({
                authOverrides: {
                    async createUser() {
                        throw Object.assign(new Error("private Firebase detail"), {
                            code,
                        });
                    },
                },
            });

            const response = await sendProtectedPost(
                context,
                "/api/auth/register",
                {
                    name: "Scout Name",
                    email: "scout@example.com",
                    password: "test-password",
                },
                status,
            );

            assert.deepEqual(response.body, { message });
            assert.equal(context.logEntries[0].event.category, code);
            assert.equal(
                JSON.stringify(context.logEntries).includes(
                    "private Firebase detail",
                ),
                false,
            );
        });
    }
});

test("POST /api/auth/register preserves the account after session failure", async () => {
    const context = createTestContext({
        authenticateWithPassword: async () => {
            throw new FirebaseAuthenticationError(
                FIREBASE_AUTH_ERROR_CATEGORY.SERVICE_UNAVAILABLE,
            );
        },
    });

    const response = await sendProtectedPost(
        context,
        "/api/auth/register",
        {
            name: "Scout Name",
            email: "scout@example.com",
            password: "test-password",
        },
        500,
    );

    assert.deepEqual(response.body, {
        message: "Account created, but automatic login failed. Please log in.",
    });
    assert.equal(context.calls.createUser.length, 1);
    assert.equal(context.logEntries[0].event.uid, "registered-uid");
    assert.equal(
        context.logEntries[0].event.category,
        FIREBASE_AUTH_ERROR_CATEGORY.SERVICE_UNAVAILABLE,
    );
});

test("POST /api/auth/login authenticates and sets a secure session cookie", async () => {
    const context = createTestContext({
        configurationOverrides: { sessionCookieSecure: true },
    });

    const response = await sendProtectedPost(
        context,
        "/api/auth/login",
        {
            email: "  scout@example.com  ",
            password: "test-password",
        },
        200,
    );

    assert.equal(response.body.user.uid, "test-uid");
    assert.deepEqual(context.authenticationCalls, [
        {
            email: "scout@example.com",
            password: "test-password",
            firebaseWebApiKey: "test-firebase-web-api-key",
        },
    ]);
    assert.match(response.headers["set-cookie"][0], /Secure/);
    assert.equal(context.logEntries[0].event.category, "SUCCESS");
});

test("POST /api/auth/login requires email and password", async () => {
    const context = createTestContext();

    const response = await sendProtectedPost(
        context,
        "/api/auth/login",
        { email: "scout@example.com" },
        400,
    );

    assert.deepEqual(response.body, {
        message: "Email and password are required",
    });
    assert.equal(context.authenticationCalls.length, 0);
});

test("POST /api/auth/login hides invalid and disabled account details", async (t) => {
    const categories = [
        FIREBASE_AUTH_ERROR_CATEGORY.INVALID_CREDENTIALS,
        FIREBASE_AUTH_ERROR_CATEGORY.USER_DISABLED,
    ];

    for (const category of categories) {
        await t.test(`hides ${category}`, async () => {
            const context = createTestContext({
                authenticateWithPassword: async () => {
                    throw new FirebaseAuthenticationError(category);
                },
            });

            const response = await sendProtectedPost(
                context,
                "/api/auth/login",
                {
                    email: "scout@example.com",
                    password: "private-password",
                },
                401,
            );

            assert.deepEqual(response.body, {
                message: "Invalid email or password",
            });
            const serializedLogs = JSON.stringify(context.logEntries);
            assert.equal(serializedLogs.includes("scout@example.com"), false);
            assert.equal(serializedLogs.includes("private-password"), false);
        });
    }
});

test("POST /api/auth/login maps Firebase rate limiting to 429", async () => {
    const context = createTestContext({
        authenticateWithPassword: async () => {
            throw new FirebaseAuthenticationError(
                FIREBASE_AUTH_ERROR_CATEGORY.RATE_LIMITED,
            );
        },
    });

    const response = await sendProtectedPost(
        context,
        "/api/auth/login",
        {
            email: "scout@example.com",
            password: "test-password",
        },
        429,
    );

    assert.deepEqual(response.body, {
        message: "Too many authentication attempts. Please try again later.",
    });
});

test("POST /api/auth/login hides unexpected Firebase failures", async () => {
    const context = createTestContext({
        authenticateWithPassword: async () => {
            throw new Error("private unexpected detail");
        },
    });

    const response = await sendProtectedPost(
        context,
        "/api/auth/login",
        {
            email: "scout@example.com",
            password: "test-password",
        },
        500,
    );

    assert.deepEqual(response.body, {
        message: "Login failed. Please try again.",
    });
    assert.equal(
        JSON.stringify(context.logEntries).includes("private unexpected detail"),
        false,
    );
});

test("POST /api/auth/logout clears the session cookie idempotently", async () => {
    const context = createTestContext();

    const response = await sendProtectedPost(
        context,
        "/api/auth/logout",
        undefined,
        204,
    );

    assert.equal(response.text, "");
    const clearCookie = response.headers["set-cookie"][0];
    assert.match(clearCookie, /^session=;/);
    assert.match(clearCookie, /HttpOnly/);
    assert.match(clearCookie, /Path=\//);
    assert.match(clearCookie, /SameSite=Lax/);
});

test("GET /api/auth/session rejects a missing cookie without routine logs", async () => {
    const context = createTestContext();

    const response = await request(context.app)
        .get("/api/auth/session")
        .expect(401);

    assert.deepEqual(response.body, {
        message: "Authentication required",
    });
    assert.equal(context.calls.verifySessionCookie.length, 0);
    assert.equal(context.logEntries.length, 0);
});

test("GET /api/auth/session returns verified identity and custom claims", async () => {
    const { auth, calls } = createAuthTestDouble({
        async verifySessionCookie(sessionCookie, checkRevoked) {
            calls.verifySessionCookie.push({ sessionCookie, checkRevoked });
            return {
                uid: "debug-uid",
                email: "debug@example.com",
                name: "Debug Scout",
                debug: true,
                exp: expirationSeconds,
            };
        },
    });
    const { logger, entries: logEntries } = createLoggerTestDouble();
    const app = express();
    app.use(express.json());
    app.use(
        "/api/auth",
        createAuthenticationRouter({
            auth,
            configuration: defaultConfiguration,
            logger,
        }),
    );

    const response = await request(app)
        .get("/api/auth/session")
        .set("Cookie", "session=test-session-cookie")
        .expect(200);

    assert.deepEqual(response.body.user, {
        uid: "debug-uid",
        email: "debug@example.com",
        name: "Debug Scout",
        debug: true,
    });
    assert.deepEqual(calls.verifySessionCookie, [
        {
            sessionCookie: "test-session-cookie",
            checkRevoked: true,
        },
    ]);
    assert.equal(logEntries.length, 0);
});

test("GET /api/auth/session rejects expired, revoked, and disabled sessions", async (t) => {
    const codes = [
        "auth/session-cookie-expired",
        "auth/session-cookie-revoked",
        "auth/user-disabled",
    ];

    for (const code of codes) {
        await t.test(`rejects ${code}`, async () => {
            const context = createTestContext({
                authOverrides: {
                    async verifySessionCookie() {
                        throw Object.assign(new Error("private session detail"), {
                            code,
                        });
                    },
                },
            });

            const response = await request(context.app)
                .get("/api/auth/session")
                .set("Cookie", "session=private-cookie-value")
                .expect(401);

            assert.deepEqual(response.body, {
                message: "Invalid or expired session",
            });
            const serializedLogs = JSON.stringify(context.logEntries);
            assert.equal(serializedLogs.includes("private-cookie-value"), false);
            assert.equal(serializedLogs.includes("private session detail"), false);
            assert.equal(context.logEntries[0].event.category, code);
        });
    }
});
