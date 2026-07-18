/**
 * Firebase session-cookie service.
 *
 * This module converts short-lived Firebase ID tokens into server-managed
 * session cookies, verifies those cookies with revocation checking, and keeps
 * browser cookie settings and expiration-warning calculations consistent.
 */

export const SESSION_COOKIE_NAME = "session";

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MILLISECONDS_PER_SECOND = 1000;

/**
 * Exchanges a recently issued Firebase ID token for a session cookie.
 *
 * The configured duration is converted from operator-friendly minutes to the
 * milliseconds required by Firebase Admin only at this API boundary.
 *
 * @param {import("firebase-admin").auth.Auth} auth Firebase Admin Auth service.
 * @param {string} idToken Short-lived Firebase ID token from REST sign-in.
 * @param {number} sessionDurationMinutes Absolute session lifetime in minutes.
 * @returns {Promise<string>} Firebase session-cookie value.
 * @throws {Error} When Firebase rejects the token or cannot create the session.
 */
export async function createSessionCookie(
    auth,
    idToken,
    sessionDurationMinutes,
) {
    const sessionDurationMilliseconds =
        sessionDurationMinutes * MILLISECONDS_PER_MINUTE;

    return auth.createSessionCookie(idToken, {
        expiresIn: sessionDurationMilliseconds,
    });
}

/**
 * Verifies a Firebase session cookie and checks whether it was revoked.
 *
 * Revocation checking is always enabled so disabled users, deleted users, and
 * explicitly revoked sessions cannot continue accessing protected operations.
 *
 * @param {import("firebase-admin").auth.Auth} auth Firebase Admin Auth service.
 * @param {string} sessionCookie Firebase session-cookie value.
 * @returns {Promise<import("firebase-admin").auth.DecodedIdToken>} Verified claims.
 * @throws {Error} When the cookie is invalid, expired, revoked, or disabled.
 */
export async function verifySessionCookie(auth, sessionCookie) {
    return auth.verifySessionCookie(sessionCookie, true);
}

/**
 * Calculates the timestamps returned by the current-session API.
 *
 * Firebase stores the expiration claim as Unix seconds. Returning ISO strings
 * gives React unambiguous UTC timestamps for expiration and warning timers.
 *
 * @param {{exp: number}} decodedSessionClaims Verified Firebase session claims.
 * @param {number} warningMinutes Minutes before expiration to warn the user.
 * @returns {{sessionExpiresAt: string, sessionExpirationWarningAt: string}}
 * ISO-8601 session timing values.
 * @throws {Error} When verified claims do not contain a valid expiration time.
 */
export function calculateSessionTiming(
    decodedSessionClaims,
    warningMinutes,
) {
    const expirationSeconds = decodedSessionClaims?.exp;

    if (!Number.isFinite(expirationSeconds) || expirationSeconds <= 0) {
        throw new Error("Verified session is missing a valid expiration time");
    }

    const expirationMilliseconds =
        expirationSeconds * MILLISECONDS_PER_SECOND;
    const warningMilliseconds =
        expirationMilliseconds - warningMinutes * MILLISECONDS_PER_MINUTE;

    return {
        sessionExpiresAt: new Date(expirationMilliseconds).toISOString(),
        sessionExpirationWarningAt: new Date(warningMilliseconds).toISOString(),
    };
}

/**
 * Builds the Express options used when setting the authentication cookie.
 *
 * `HttpOnly` prevents React and injected browser scripts from reading the
 * Firebase session. `Secure`, `SameSite`, and `Path` consistently constrain
 * when the browser may send it.
 *
 * @param {{
 *   sessionDurationMinutes: number,
 *   sessionCookieSecure: boolean,
 *   sessionCookieSameSite: "lax" | "strict" | "none"
 * }} configuration Validated backend session configuration.
 * @returns {{
 *   httpOnly: true,
 *   secure: boolean,
 *   sameSite: "lax" | "strict" | "none",
 *   path: "/",
 *   maxAge: number
 * }} Express cookie options.
 */
export function createSessionCookieOptions(configuration) {
    return {
        httpOnly: true,
        secure: configuration.sessionCookieSecure,
        sameSite: configuration.sessionCookieSameSite,
        path: "/",
        maxAge:
            configuration.sessionDurationMinutes * MILLISECONDS_PER_MINUTE,
    };
}

/**
 * Builds matching Express options for clearing the authentication cookie.
 *
 * Browsers clear cookies reliably only when the identifying attributes match
 * those used when the cookie was created. Expiration itself is handled later
 * by Express `clearCookie`, so `maxAge` is intentionally omitted here.
 *
 * @param {{
 *   sessionCookieSecure: boolean,
 *   sessionCookieSameSite: "lax" | "strict" | "none"
 * }} configuration Validated backend session configuration.
 * @returns {{
 *   httpOnly: true,
 *   secure: boolean,
 *   sameSite: "lax" | "strict" | "none",
 *   path: "/"
 * }} Express clear-cookie options.
 */
export function createClearSessionCookieOptions(configuration) {
    return {
        httpOnly: true,
        secure: configuration.sessionCookieSecure,
        sameSite: configuration.sessionCookieSameSite,
        path: "/",
    };
}
