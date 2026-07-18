/**
 * Shared Firebase session-cookie authentication middleware.
 *
 * Protected application routes use this module instead of trusting browser
 * fields. Firebase Admin verifies the HttpOnly session cookie and checks
 * revocation before the decoded identity is attached to the Express request.
 */

import {
    SESSION_COOKIE_NAME,
    verifySessionCookie,
} from "../auth/session.js";

/**
 * Converts a Firebase verification failure into a safe logging category.
 *
 * Firebase messages and stack traces are excluded because they can contain
 * implementation details that are unnecessary for operating the application.
 *
 * @param {unknown} error Firebase Admin verification failure.
 * @returns {string} Stable category safe for structured logs.
 */
function getSafeVerificationCategory(error) {
    if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string" &&
        /^auth\/[a-z-]+$/.test(error.code)
    ) {
        return error.code;
    }

    return "SESSION_VERIFICATION_FAILED";
}

/**
 * Creates middleware that requires a valid, non-revoked Firebase session.
 *
 * The Auth service is injected so tests can cover missing, expired, disabled,
 * and revoked sessions without contacting a live Firebase project. On success,
 * the verified decoded claims are assigned to `request.user`; callers must use
 * those claims rather than identity supplied in a request body.
 *
 * @param {{
 *   auth: import("firebase-admin/auth").Auth,
 *   logger?: {warn: Function}
 * }} dependencies Firebase Auth and safe logger dependencies.
 * @returns {import("express").RequestHandler} Asynchronous Express middleware.
 */
export function createRequireAuthentication({ auth, logger = console }) {
    return async function requireAuthentication(request, response, next) {
        const sessionCookie = request.cookies?.[SESSION_COOKIE_NAME];

        if (!sessionCookie) {
            logger.warn("Authentication required", {
                route: `${request.method} ${request.baseUrl}${request.path}`,
                status: 401,
                category: "SESSION_MISSING",
            });
            return response.status(401).json({
                message: "Authentication required",
            });
        }

        try {
            request.user = await verifySessionCookie(auth, sessionCookie);
            return next();
        } catch (error) {
            logger.warn("Authentication rejected", {
                route: `${request.method} ${request.baseUrl}${request.path}`,
                status: 401,
                category: getSafeVerificationCategory(error),
            });
            return response.status(401).json({
                message: "Invalid or expired session",
            });
        }
    };
}
