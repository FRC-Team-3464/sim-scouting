import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { validateConfiguration } from "../config.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Reads a repository JSON file using an absolute path derived from this test.
 * This keeps deployment tests independent of the directory from which npm was
 * invoked, which is useful in local shells and continuous integration.
 *
 * @param {string} relativePath Path relative to the repository root.
 * @returns {Record<string, unknown>} Parsed JSON object.
 */
function readRepositoryJson(relativePath) {
    return JSON.parse(
        readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8"),
    );
}

test("both root-level Vercel projects share one tracked routing configuration", () => {
    const vercelConfiguration = readRepositoryJson("vercel.json");

    assert.equal(
        vercelConfiguration.installCommand,
        "npm ci && npm --prefix frontend ci",
    );
    assert.equal(
        vercelConfiguration.buildCommand,
        "npm --prefix frontend run build",
    );
    assert.equal(vercelConfiguration.outputDirectory, "frontend/dist");
    assert.deepEqual(vercelConfiguration.rewrites, [
        { source: "/(.*)", destination: "/index.html" },
    ]);
    assert.equal("headers" in vercelConfiguration, false);
    assert.equal(
        existsSync(`${repositoryRoot}frontend/vercel.json`),
        false,
        "the frontend must not define a conflicting nested Vercel configuration",
    );
});

test("Vercel exposes the existing Express routes through one catch-all function", () => {
    assert.equal(existsSync(`${repositoryRoot}api/[...path].js`), true);

    const functionSource = readFileSync(
        `${repositoryRoot}api/[...path].js`,
        "utf8",
    );

    assert.match(functionSource, /from "\.\.\/backend\/app\.js"/);
    assert.match(functionSource, /export default app/);
});

test("production examples describe the approved same-origin deployment", () => {
    const backendEnvironment = dotenv.parse(
        readFileSync(`${repositoryRoot}.env.production.example`, "utf8"),
    );
    const frontendEnvironment = dotenv.parse(
        readFileSync(
            `${repositoryRoot}frontend/.env.production.example`,
            "utf8",
        ),
    );

    // Replace only the documented placeholder with a valid test key. The real
    // production CSRF secret remains outside the repository and is never read.
    const validatedBackendConfiguration = validateConfiguration({
        ...backendEnvironment,
        NODE_ENV: "production",
        CSRF_SECRET: "a".repeat(64),
    });

    assert.equal(
        validatedBackendConfiguration.corsAllowedOrigin,
        "https://sim-city-scouting.vercel.app",
    );
    assert.equal(validatedBackendConfiguration.sessionCookieSecure, true);
    assert.equal(validatedBackendConfiguration.sessionCookieSameSite, "lax");
    assert.equal(frontendEnvironment.VITE_API_BASE_URL, "/api");
});

test("the unused CORS package is not installed because Express owns API headers", () => {
    const rootPackage = readRepositoryJson("package.json");

    assert.equal("cors" in rootPackage.dependencies, false);
});
