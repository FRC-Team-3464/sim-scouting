import assert from "node:assert/strict";
import test from "node:test";

import {
    createSignedCsrfToken,
    isSignedCsrfTokenValid,
    timingSafeStringEqual,
} from "../middleware/csrf.js";

const csrfSecret = "a".repeat(64);
const browserBinding = "browser-binding-value";
const sessionBinding = "firebase-session-cookie-value";
const randomValue = "b".repeat(64);

test("createSignedCsrfToken creates a valid HMAC-bound token", () => {
    const token = createSignedCsrfToken({
        binding: browserBinding,
        randomValue,
        csrfSecret,
    });

    assert.match(token, /^[a-f\d]{64}\.[a-f\d]{64}$/);
    assert.equal(
        isSignedCsrfTokenValid(token, browserBinding, csrfSecret),
        true,
    );
});

test("signed CSRF tokens cannot move between browser or Firebase session bindings", () => {
    const token = createSignedCsrfToken({
        binding: browserBinding,
        randomValue,
        csrfSecret,
    });

    assert.equal(
        isSignedCsrfTokenValid(token, sessionBinding, csrfSecret),
        false,
    );
    assert.equal(
        isSignedCsrfTokenValid(token, browserBinding, "c".repeat(64)),
        false,
    );
});

test("signed CSRF validation rejects malformed and altered tokens", () => {
    const token = createSignedCsrfToken({
        binding: browserBinding,
        randomValue,
        csrfSecret,
    });
    const alteredToken = `${"c".repeat(64)}.${randomValue}`;
    const malformedTokens = [
        undefined,
        "",
        "not-a-token",
        token.toUpperCase(),
        `${token}.extra`,
        alteredToken,
    ];

    for (const malformedToken of malformedTokens) {
        assert.equal(
            isSignedCsrfTokenValid(
                malformedToken,
                browserBinding,
                csrfSecret,
            ),
            false,
        );
    }
});

test("createSignedCsrfToken rejects a malformed random value", () => {
    assert.throws(
        () =>
            createSignedCsrfToken({
                binding: browserBinding,
                randomValue: "not-32-random-bytes",
                csrfSecret,
            }),
        {
            message: "CSRF random value must be 32 bytes of hexadecimal data",
        },
    );
});

test("timingSafeStringEqual compares only exact expected-length values", () => {
    assert.equal(timingSafeStringEqual("same", "same", 4), true);
    assert.equal(timingSafeStringEqual("same", "diff", 4), false);
    assert.equal(timingSafeStringEqual("short", "short", 6), false);
    assert.equal(timingSafeStringEqual("short", "longer", 5), false);
    assert.equal(timingSafeStringEqual(undefined, "value", 5), false);
});
