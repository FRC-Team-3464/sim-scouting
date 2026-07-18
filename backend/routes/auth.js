/**
 * Backend-managed Firebase authentication routes.
 *
 * These routes run alongside the legacy authentication endpoints until the
 * React migration is complete. They exchange passwords for Firebase ID tokens,
 * convert those tokens to HttpOnly session cookies, and never return Firebase
 * tokens to the browser. CSRF protection is added in Chunk 4 before React uses
 * these state-changing routes.
 */

import cookieParser from "cookie-parser";
import express from "express";

import {
    FIREBASE_AUTH_ERROR_CATEGORY,
    FirebaseAuthenticationError,
    signInWithEmailAndPassword,
} from "../auth/firebase-auth-rest.js";
import {
    SESSION_COOKIE_NAME,
    calculateSessionTiming,
    createClearSessionCookieOptions,
    createSessionCookie,
    createSessionCookieOptions,
    verifySessionCookie,
} from "../auth/session.js";

/**
 * Determines whether an API input is a non-empty string.
 *
 * @param {unknown} value Request value to validate.
 * @returns {value is string} Whether the value contains non-whitespace text.
 */
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates and normalizes a registration request.
 *
 * Names and email addresses are trimmed because surrounding whitespace is not
 * meaningful. Passwords are deliberately preserved byte-for-byte because
 * changing a password during authentication would make valid credentials fail.
 * Firebase remains responsible for email format and password-strength rules.
 *
 * @param {unknown} body Express request body.
 * @returns {{name: string, email: string, password: string} | null}
 * Validated registration values, or `null` for malformed input.
 */
function validateRegistrationBody(body) {
    if (
        !body ||
        typeof body !== "object" ||
        !("name" in body) ||
        !isNonEmptyString(body.name) ||
        !("email" in body) ||
        !isNonEmptyString(body.email) ||
        !("password" in body) ||
        !isNonEmptyString(body.password)
    ) {
        return null;
    }

    return {
        name: body.name.trim(),
        email: body.email.trim(),
        password: body.password,
    };
}

/**
 * Validates and normalizes a login request without changing its password.
 *
 * @param {unknown} body Express request body.
 * @returns {{email: string, password: string} | null} Validated credentials.
 */
function validateLoginBody(body) {
    if (
        !body ||
        typeof body !== "object" ||
        !("email" in body) ||
        !isNonEmptyString(body.email) ||
        !("password" in body) ||
        !isNonEmptyString(body.password)
    ) {
        return null;
    }

    return {
        email: body.email.trim(),
        password: body.password,
    };
}

/**
 * Converts an error into a category safe to include in operational logs.
 *
 * Firebase error messages and stack traces are intentionally excluded. Known
 * Firebase Admin codes are stable identifiers; all other failures use one
 * generic category.
 *
 * @param {unknown} error Authentication failure.
 * @returns {string} Safe operational category.
 */
function getSafeErrorCategory(error) {
    if (error instanceof FirebaseAuthenticationError) {
        return error.category;
    }

    if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string" &&
        /^auth\/[a-z-]+$/.test(error.code)
    ) {
        return error.code;
    }

    return "UNEXPECTED_ERROR";
}

/**
 * Writes one structured authentication event without sensitive request data.
 *
 * @param {{info: Function, warn: Function, error: Function}} logger Logger implementation.
 * @param {"info" | "warn" | "error"} level Log severity.
 * @param {{route: string, status: number, category: string, uid?: string}} event
 * Safe authentication event fields.
 * @returns {void}
 */
function logAuthenticationEvent(logger, level, event) {
    logger[level]("Authentication request", event);
}

/**
 * Converts verified Firebase claims into the public session representation.
 *
 * The debug claim controls frontend feature visibility only. Later protected
 * debug routes must independently enforce the verified claim on the server.
 * Missing or malformed debug claims always default to `false`.
 *
 * @param {import("firebase-admin").auth.DecodedIdToken} decodedClaims Verified claims.
 * @param {{sessionExpirationWarningMinutes: number}} configuration Session configuration.
 * @returns {{
 *   user: {uid: string, email: string, name: string, debug: boolean},
 *   sessionExpiresAt: string,
 *   sessionExpirationWarningAt: string
 * }} Public session response.
 */
function createSessionResponse(decodedClaims, configuration) {
    return {
        user: {
            uid: decodedClaims.uid,
            email: decodedClaims.email || "",
            name: decodedClaims.name || "",
            debug: decodedClaims.debug === true,
        },
        ...calculateSessionTiming(
            decodedClaims,
            configuration.sessionExpirationWarningMinutes,
        ),
    };
}

/**
 * Creates and immediately verifies a Firebase session.
 *
 * Verification supplies the canonical identity, custom claims, and expiration
 * used by every successful authentication response. Revocation checking is
 * enabled by the shared session service.
 *
 * @param {import("firebase-admin").auth.Auth} auth Firebase Admin Auth service.
 * @param {string} idToken Firebase ID token returned by REST authentication.
 * @param {{
 *   sessionDurationMinutes: number,
 *   sessionExpirationWarningMinutes: number
 * }} configuration Validated session configuration.
 * @returns {Promise<{sessionCookie: string, responseBody: object}>}
 * Session cookie and safe public response.
 * @throws {Error} When Firebase cannot create or verify the session.
 */
async function createVerifiedSession(auth, idToken, configuration) {
    const sessionCookie = await createSessionCookie(
        auth,
        idToken,
        configuration.sessionDurationMinutes,
    );
    const decodedClaims = await verifySessionCookie(auth, sessionCookie);

    return {
        sessionCookie,
        responseBody: createSessionResponse(decodedClaims, configuration),
    };
}

/**
 * Maps expected Firebase Admin registration errors to public HTTP responses.
 *
 * @param {unknown} error Firebase Admin user-creation failure.
 * @returns {{status: number, message: string} | null} Safe response or `null`.
 */
function getRegistrationErrorResponse(error) {
    if (!error || typeof error !== "object" || !("code" in error)) {
        return null;
    }

    switch (error.code) {
        case "auth/email-already-exists":
            return { status: 409, message: "Email already in use" };
        case "auth/invalid-display-name":
            return { status: 400, message: "Invalid name" };
        case "auth/invalid-email":
            return { status: 400, message: "Invalid email address" };
        case "auth/invalid-password":
        case "auth/weak-password":
            return { status: 400, message: "Password is too weak" };
        case "auth/too-many-requests":
            return {
                status: 429,
                message:
                    "Too many registration attempts. Please try again later.",
            };
        default:
            return null;
    }
}

/**
 * Creates the parallel backend-managed authentication router.
 *
 * Dependencies are injected so HTTP integration tests can exercise Express,
 * cookies, validation, and error mapping without contacting a live Firebase
 * project or exposing test credentials.
 *
 * @param {{
 *   auth: import("firebase-admin").auth.Auth,
 *   configuration: {
 *     firebaseWebApiKey: string,
 *     sessionDurationMinutes: number,
 *     sessionExpirationWarningMinutes: number,
 *     sessionCookieSecure: boolean,
 *     sessionCookieSameSite: "lax" | "strict" | "none"
 *   },
 *   authenticateWithPassword?: typeof signInWithEmailAndPassword,
 *   logger?: {info: Function, warn: Function, error: Function}
 * }} dependencies Router dependencies.
 * @returns {import("express").Router} Configured Express router.
 */
export function createAuthenticationRouter({
    auth,
    configuration,
    authenticateWithPassword = signInWithEmailAndPassword,
    logger = console,
}) {
    const router = express.Router();
    const setCookieOptions = createSessionCookieOptions(configuration);
    const clearCookieOptions = createClearSessionCookieOptions(configuration);

    router.use(cookieParser());

    router.post("/register", async (req, res) => {
        const registration = validateRegistrationBody(req.body);

        if (!registration) {
            logAuthenticationEvent(logger, "warn", {
                route: "POST /api/auth/register",
                status: 400,
                category: "INVALID_INPUT",
            });
            return res.status(400).json({
                message: "Name, email, and password are required",
            });
        }

        let userRecord;
        try {
            userRecord = await auth.createUser({
                email: registration.email,
                password: registration.password,
                displayName: registration.name,
            });
        } catch (error) {
            const expectedResponse = getRegistrationErrorResponse(error);
            const status = expectedResponse?.status || 500;

            logAuthenticationEvent(
                logger,
                expectedResponse ? "warn" : "error",
                {
                    route: "POST /api/auth/register",
                    status,
                    category: getSafeErrorCategory(error),
                },
            );

            return res.status(status).json({
                message: expectedResponse?.message || "Registration failed",
            });
        }

        try {
            const authenticatedUser = await authenticateWithPassword({
                email: registration.email,
                password: registration.password,
                firebaseWebApiKey: configuration.firebaseWebApiKey,
            });
            const session = await createVerifiedSession(
                auth,
                authenticatedUser.idToken,
                configuration,
            );

            res.cookie(
                SESSION_COOKIE_NAME,
                session.sessionCookie,
                setCookieOptions,
            );
            logAuthenticationEvent(logger, "info", {
                route: "POST /api/auth/register",
                status: 201,
                category: "SUCCESS",
                uid: userRecord.uid,
            });
            return res.status(201).json(session.responseBody);
        } catch (error) {
            logAuthenticationEvent(logger, "error", {
                route: "POST /api/auth/register",
                status: 500,
                category: getSafeErrorCategory(error),
                uid: userRecord.uid,
            });
            return res.status(500).json({
                message:
                    "Account created, but automatic login failed. Please log in.",
            });
        }
    });

    router.post("/login", async (req, res) => {
        const credentials = validateLoginBody(req.body);

        if (!credentials) {
            logAuthenticationEvent(logger, "warn", {
                route: "POST /api/auth/login",
                status: 400,
                category: "INVALID_INPUT",
            });
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        try {
            const authenticatedUser = await authenticateWithPassword({
                email: credentials.email,
                password: credentials.password,
                firebaseWebApiKey: configuration.firebaseWebApiKey,
            });
            const session = await createVerifiedSession(
                auth,
                authenticatedUser.idToken,
                configuration,
            );

            res.cookie(
                SESSION_COOKIE_NAME,
                session.sessionCookie,
                setCookieOptions,
            );
            logAuthenticationEvent(logger, "info", {
                route: "POST /api/auth/login",
                status: 200,
                category: "SUCCESS",
                uid: session.responseBody.user.uid,
            });
            return res.status(200).json(session.responseBody);
        } catch (error) {
            const category = getSafeErrorCategory(error);
            let status = 500;
            let message = "Login failed. Please try again.";

            if (
                category === FIREBASE_AUTH_ERROR_CATEGORY.INVALID_CREDENTIALS ||
                category === FIREBASE_AUTH_ERROR_CATEGORY.USER_DISABLED
            ) {
                status = 401;
                message = "Invalid email or password";
            } else if (category === FIREBASE_AUTH_ERROR_CATEGORY.RATE_LIMITED) {
                status = 429;
                message =
                    "Too many authentication attempts. Please try again later.";
            }

            logAuthenticationEvent(
                logger,
                status === 500 ? "error" : "warn",
                {
                    route: "POST /api/auth/login",
                    status,
                    category,
                },
            );
            return res.status(status).json({ message });
        }
    });

    router.post("/logout", (req, res) => {
        // Clearing is intentionally idempotent: an anonymous browser receives
        // the same response and does not learn whether a session existed.
        res.clearCookie(SESSION_COOKIE_NAME, clearCookieOptions);
        return res.status(204).end();
    });

    router.get("/session", async (req, res) => {
        const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];

        if (!sessionCookie) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        try {
            const decodedClaims = await verifySessionCookie(
                auth,
                sessionCookie,
            );
            return res.status(200).json(
                createSessionResponse(decodedClaims, configuration),
            );
        } catch (error) {
            logAuthenticationEvent(logger, "warn", {
                route: "GET /api/auth/session",
                status: 401,
                category: getSafeErrorCategory(error),
            });
            return res.status(401).json({
                message: "Invalid or expired session",
            });
        }
    });

    return router;
}
