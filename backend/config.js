import dotenv from "dotenv";

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
 *   serviceAccountKey: string | undefined
 * }} Validated backend configuration.
 * @throws {Error} When the port or allowed CORS origin is invalid.
 */
export function validateConfiguration(environmentVariables) {
    const environment = environmentVariables.NODE_ENV || "development";
    const port = Number(environmentVariables.PORT);
    const corsAllowedOrigin = environmentVariables.CORS_ALLOWED_ORIGIN;

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(
            "PORT must be configured as an integer between 1 and 65535",
        );
    }

    if (!corsAllowedOrigin) {
        throw new Error("CORS_ALLOWED_ORIGIN must be configured");
    }

    return {
        environment,
        port,
        corsAllowedOrigin,
        serviceAccountKey: environmentVariables.SERVICE_ACCOUNT_KEY,
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
