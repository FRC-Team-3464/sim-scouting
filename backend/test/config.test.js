import assert from "node:assert/strict";
import test from "node:test";

import { validateConfiguration } from "../config.js";

const validEnvironment = {
    NODE_ENV: "development",
    PORT: "3000",
    CORS_ALLOWED_ORIGIN: "http://localhost:5173",
    SERVICE_ACCOUNT_KEY: "test-service-account-value",
    FIREBASE_WEB_API_KEY: "test-firebase-web-api-key",
    SESSION_DURATION_MINUTES: "360",
    SESSION_EXPIRATION_WARNING_MINUTES: "30",
    SESSION_COOKIE_SECURE: "false",
    SESSION_COOKIE_SAME_SITE: "lax",
    CSRF_SECRET: "a".repeat(64),
};

test("validateConfiguration returns converted backend settings", () => {
    const configuration = validateConfiguration(validEnvironment);

    assert.deepEqual(configuration, {
        environment: "development",
        port: 3000,
        corsAllowedOrigin: "http://localhost:5173",
        serviceAccountKey: "test-service-account-value",
        firebaseWebApiKey: "test-firebase-web-api-key",
        sessionDurationMinutes: 360,
        sessionExpirationWarningMinutes: 30,
        sessionCookieSecure: false,
        sessionCookieSameSite: "lax",
        csrfSecret: "a".repeat(64),
    });
});

test("validateConfiguration defaults NODE_ENV to development", () => {
    const { NODE_ENV, ...environmentWithoutNodeEnv } = validEnvironment;

    const configuration = validateConfiguration(environmentWithoutNodeEnv);

    assert.equal(configuration.environment, "development");
});

test("validateConfiguration rejects missing and invalid ports", async (t) => {
    const invalidPorts = [undefined, "", "0", "65536", "3000.5", "invalid"];

    for (const port of invalidPorts) {
        await t.test(`rejects PORT=${String(port)}`, () => {
            assert.throws(
                () => validateConfiguration({ ...validEnvironment, PORT: port }),
                {
                    message:
                        "PORT must be configured as an integer between 1 and 65535",
                },
            );
        });
    }
});

test("validateConfiguration rejects a missing CORS allowed origin", () => {
    assert.throws(
        () =>
            validateConfiguration({
                ...validEnvironment,
                CORS_ALLOWED_ORIGIN: "",
            }),
        { message: "CORS_ALLOWED_ORIGIN must be configured" },
    );
});

test("validateConfiguration rejects malformed CORS allowed origins", async (t) => {
    const invalidOrigins = [
        "example.com",
        "ftp://example.com",
        "https://example.com/",
        "https://example.com/path",
        "https://example.com?query=value",
    ];

    for (const corsAllowedOrigin of invalidOrigins) {
        await t.test(`rejects ${corsAllowedOrigin}`, () => {
            assert.throws(
                () =>
                    validateConfiguration({
                        ...validEnvironment,
                        CORS_ALLOWED_ORIGIN: corsAllowedOrigin,
                    }),
                {
                    message:
                        "CORS_ALLOWED_ORIGIN must include only an http(s) scheme, host, and optional port",
                },
            );
        });
    }
});

test("validateConfiguration rejects a missing Firebase Web API key", () => {
    assert.throws(
        () =>
            validateConfiguration({
                ...validEnvironment,
                FIREBASE_WEB_API_KEY: " ",
            }),
        { message: "FIREBASE_WEB_API_KEY must be configured" },
    );
});

test("validateConfiguration rejects invalid session durations", async (t) => {
    const invalidDurations = [undefined, "", "0", "-1", "30.5", "invalid"];

    for (const duration of invalidDurations) {
        await t.test(
            `rejects SESSION_DURATION_MINUTES=${String(duration)}`,
            () => {
                assert.throws(
                    () =>
                        validateConfiguration({
                            ...validEnvironment,
                            SESSION_DURATION_MINUTES: duration,
                        }),
                    {
                        message:
                            "SESSION_DURATION_MINUTES must be configured as a positive integer",
                    },
                );
            },
        );
    }
});

test("validateConfiguration rejects invalid warning durations", async (t) => {
    const invalidWarnings = [undefined, "", "0", "-1", "30.5", "invalid"];

    for (const warning of invalidWarnings) {
        await t.test(
            `rejects SESSION_EXPIRATION_WARNING_MINUTES=${String(warning)}`,
            () => {
                assert.throws(
                    () =>
                        validateConfiguration({
                            ...validEnvironment,
                            SESSION_EXPIRATION_WARNING_MINUTES: warning,
                        }),
                    {
                        message:
                            "SESSION_EXPIRATION_WARNING_MINUTES must be configured as a positive integer",
                    },
                );
            },
        );
    }
});

test("validateConfiguration requires the warning before expiration", () => {
    assert.throws(
        () =>
            validateConfiguration({
                ...validEnvironment,
                SESSION_DURATION_MINUTES: "30",
                SESSION_EXPIRATION_WARNING_MINUTES: "30",
            }),
        {
            message:
                "SESSION_EXPIRATION_WARNING_MINUTES must be shorter than SESSION_DURATION_MINUTES",
        },
    );
});

test("validateConfiguration parses only strict cookie booleans", () => {
    assert.throws(
        () =>
            validateConfiguration({
                ...validEnvironment,
                SESSION_COOKIE_SECURE: "yes",
            }),
        { message: "SESSION_COOKIE_SECURE must be configured as true or false" },
    );
});

test("validateConfiguration normalizes valid SameSite values", () => {
    const configuration = validateConfiguration({
        ...validEnvironment,
        SESSION_COOKIE_SAME_SITE: "Lax",
    });

    assert.equal(configuration.sessionCookieSameSite, "lax");
});

test("validateConfiguration rejects invalid SameSite values", () => {
    assert.throws(
        () =>
            validateConfiguration({
                ...validEnvironment,
                SESSION_COOKIE_SAME_SITE: "invalid",
            }),
        {
            message:
                "SESSION_COOKIE_SAME_SITE must be configured as lax, strict, or none",
        },
    );
});

test("validateConfiguration requires secure cookies in production", () => {
    assert.throws(
        () =>
            validateConfiguration({
                ...validEnvironment,
                NODE_ENV: "production",
                SESSION_COOKIE_SECURE: "false",
            }),
        {
            message:
                "SESSION_COOKIE_SECURE must be true when NODE_ENV is production",
        },
    );
});

test("validateConfiguration normalizes a valid CSRF secret", () => {
    const configuration = validateConfiguration({
        ...validEnvironment,
        CSRF_SECRET: "ABCDEF0123456789".repeat(4),
    });

    assert.equal(
        configuration.csrfSecret,
        "abcdef0123456789".repeat(4),
    );
});

test("validateConfiguration rejects missing and malformed CSRF secrets", async (t) => {
    const invalidSecrets = [
        undefined,
        "",
        "too-short",
        "g".repeat(64),
        "a".repeat(63),
        "a".repeat(65),
    ];

    for (const csrfSecret of invalidSecrets) {
        await t.test(`rejects CSRF_SECRET=${String(csrfSecret)}`, () => {
            assert.throws(
                () =>
                    validateConfiguration({
                        ...validEnvironment,
                        CSRF_SECRET: csrfSecret,
                    }),
                {
                    message:
                        "CSRF_SECRET must be configured as exactly 64 hexadecimal characters",
                },
            );
        });
    }
});
