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
