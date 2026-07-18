import dotenv from "dotenv";

const VALID_SAME_SITE_VALUES = new Set(["lax", "strict", "none"]);

/**
 * Reads a required positive integer from an environment variable.
 *
 * Authentication lifetimes use whole minutes so operators cannot accidentally
 * configure ambiguous fractional or zero-length sessions.
 *
 * @param {string | undefined} value Raw environment-variable value.
 * @param {string} variableName Name included in safe startup errors.
 * @returns {number} Parsed positive integer.
 * @throws {Error} When the value is missing, fractional, or not positive.
 */
function parsePositiveInteger(value, variableName) {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new Error(`${variableName} must be configured as a positive integer`);
    }

    return parsedValue;
}

/**
 * Reads a strict boolean environment variable.
 *
 * Accepting only the literal strings `true` and `false` prevents values such
 * as `yes` or `1` from silently weakening cookie security.
 *
 * @param {string | undefined} value Raw environment-variable value.
 * @param {string} variableName Name included in safe startup errors.
 * @returns {boolean} Parsed boolean value.
 * @throws {Error} When the value is not exactly `true` or `false`.
 */
function parseBoolean(value, variableName) {
    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    throw new Error(`${variableName} must be configured as true or false`);
}

/**
 * Validates the browser SameSite policy used by the session cookie.
 *
 * @param {string | undefined} value Raw environment-variable value.
 * @returns {"lax" | "strict" | "none"} Normalized SameSite policy.
 * @throws {Error} When the value is not a supported SameSite policy.
 */
function parseSameSite(value) {
    const normalizedValue = value?.toLowerCase();

    if (!VALID_SAME_SITE_VALUES.has(normalizedValue)) {
        throw new Error(
            "SESSION_COOKIE_SAME_SITE must be configured as lax, strict, or none",
        );
    }

    return normalizedValue;
}

/**
 * Validates backend environment variables and converts them into values the
 * application can use safely.
 *
 * Keeping validation in a small function makes startup rules easy to test
 * without loading a developer's real environment file or Firebase secret.
 *
 * @param {NodeJS.ProcessEnv} environmentVariables Environment variables to validate.
 * @returns {{
 *   environment: string,
 *   port: number,
 *   corsAllowedOrigin: string,
 *   serviceAccountKey: string | undefined,
 *   firebaseWebApiKey: string,
 *   sessionDurationMinutes: number,
 *   sessionExpirationWarningMinutes: number,
 *   sessionCookieSecure: boolean,
 *   sessionCookieSameSite: "lax" | "strict" | "none"
 * }} Validated backend configuration.
 * @throws {Error} When required backend or session configuration is invalid.
 */
export function validateConfiguration(environmentVariables) {
    const environment = environmentVariables.NODE_ENV || "development";
    const port = Number(environmentVariables.PORT);
    const corsAllowedOrigin = environmentVariables.CORS_ALLOWED_ORIGIN;
    const firebaseWebApiKey = environmentVariables.FIREBASE_WEB_API_KEY?.trim();
    const sessionDurationMinutes = parsePositiveInteger(
        environmentVariables.SESSION_DURATION_MINUTES,
        "SESSION_DURATION_MINUTES",
    );
    const sessionExpirationWarningMinutes = parsePositiveInteger(
        environmentVariables.SESSION_EXPIRATION_WARNING_MINUTES,
        "SESSION_EXPIRATION_WARNING_MINUTES",
    );
    const sessionCookieSecure = parseBoolean(
        environmentVariables.SESSION_COOKIE_SECURE,
        "SESSION_COOKIE_SECURE",
    );
    const sessionCookieSameSite = parseSameSite(
        environmentVariables.SESSION_COOKIE_SAME_SITE,
    );

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(
            "PORT must be configured as an integer between 1 and 65535",
        );
    }

    if (!corsAllowedOrigin) {
        throw new Error("CORS_ALLOWED_ORIGIN must be configured");
    }

    if (!firebaseWebApiKey) {
        throw new Error("FIREBASE_WEB_API_KEY must be configured");
    }

    if (sessionExpirationWarningMinutes >= sessionDurationMinutes) {
        throw new Error(
            "SESSION_EXPIRATION_WARNING_MINUTES must be shorter than SESSION_DURATION_MINUTES",
        );
    }

    // Production cookies travel only over HTTPS. Failing at startup prevents a
    // deployment from silently sending authentication cookies over HTTP.
    if (environment === "production" && !sessionCookieSecure) {
        throw new Error(
            "SESSION_COOKIE_SECURE must be true when NODE_ENV is production",
        );
    }

    return {
        environment,
        port,
        corsAllowedOrigin,
        serviceAccountKey: environmentVariables.SERVICE_ACCOUNT_KEY,
        firebaseWebApiKey,
        sessionDurationMinutes,
        sessionExpirationWarningMinutes,
        sessionCookieSecure,
        sessionCookieSameSite,
    };
}

/**
 * Loads the selected environment file and returns validated backend settings.
 *
 * The environment-specific file is loaded first. `.env` is an optional
 * fallback, while variables already supplied by the shell or hosting platform
 * continue to take precedence.
 *
 * @returns {ReturnType<typeof validateConfiguration>} Backend configuration.
 * @throws {Error} When required configuration is missing or invalid.
 */
export function loadConfiguration() {
    const environment = process.env.NODE_ENV || "development";

    dotenv.config({
        path: [`.env.${environment}`, ".env"],
    });

    return validateConfiguration(process.env);
}
