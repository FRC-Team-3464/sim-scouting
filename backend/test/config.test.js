import assert from "node:assert/strict";
import test from "node:test";

import { validateConfiguration } from "../config.js";

const validEnvironment = {
    NODE_ENV: "development",
    PORT: "3000",
    CORS_ALLOWED_ORIGIN: "http://localhost:5173",
    SERVICE_ACCOUNT_KEY: "test-service-account-value",
};

test("validateConfiguration returns converted backend settings", () => {
    const configuration = validateConfiguration(validEnvironment);

    assert.deepEqual(configuration, {
        environment: "development",
        port: 3000,
        corsAllowedOrigin: "http://localhost:5173",
        serviceAccountKey: "test-service-account-value",
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
