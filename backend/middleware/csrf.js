/**
 * Signed double-submit CSRF protection for the cookie-authenticated API.
 *
 * Browsers attach cookies automatically, so a hostile site can otherwise make
 * a victim's browser submit authenticated requests. The custom header proves
 * that application JavaScript participated, exact Origin validation limits
 * which frontend may send it, and the HMAC prevents an injected cookie from
 * becoming a valid CSRF token.
 */

import {
    createHmac,
    randomBytes,
    timingSafeEqual,
} from "node:crypto";

import { SESSION_COOKIE_NAME } from "../auth/session.js";

export const CSRF_BINDING_COOKIE_NAME = "csrf_binding";
export const CSRF_TOKEN_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

const RANDOM_VALUE_BYTES = 32;
const HEX_VALUE_LENGTH = RANDOM_VALUE_BYTES * 2;
const SIGNED_TOKEN_LENGTH = HEX_VALUE_LENGTH * 2 + 1;
const HEX_VALUE_PATTERN = /^[a-f\d]{64}$/;
const SIGNED_TOKEN_PATTERN = /^[a-f\d]{64}\.[a-f\d]{64}$/;
const MAXIMUM_SESSION_COOKIE_LENGTH = 4096;
const MILLISECONDS_PER_MINUTE = 60 * 1000;

export const CSRF_REJECTION_CATEGORY = Object.freeze({
    ORIGIN_REJECTED: "CSRF_ORIGIN_REJECTED",
    CONTENT_TYPE_REJECTED: "CSRF_CONTENT_TYPE_REJECTED",
    TOKEN_MISSING: "CSRF_TOKEN_MISSING",
    TOKEN_INVALID: "CSRF_TOKEN_INVALID",
});

/**
 * Compares equal-length strings without revealing where they differ.
 *
 * Node's timing-safe comparison throws for unequal buffer lengths. Validating
 * the exact length first both avoids that exception and rejects oversized
 * attacker-controlled values before allocating comparison buffers.
 *
 * @param {unknown} firstValue First untrusted value.
 * @param {unknown} secondValue Second untrusted value.
 * @param {number} expectedLength Required character length.
 * @returns {boolean} Whether both values match exactly.
 */
export function timingSafeStringEqual(
    firstValue,
    secondValue,
    expectedLength,
) {
    if (
        typeof firstValue !== "string" ||
        typeof secondValue !== "string" ||
        firstValue.length !== expectedLength ||
        secondValue.length !== expectedLength
    ) {
        return false;
    }

    const firstBuffer = Buffer.from(firstValue, "utf8");
    const secondBuffer = Buffer.from(secondValue, "utf8");

    if (firstBuffer.length !== secondBuffer.length) {
        return false;
    }

    return timingSafeEqual(firstBuffer, secondBuffer);
}

/**
 * Builds an unambiguous HMAC message from a private browser/session binding and
 * a public random token value. Length prefixes prevent concatenation ambiguity.
 *
 * @param {string} binding Firebase session cookie or pre-authentication binding.
 * @param {string} randomValue Public hexadecimal token nonce.
 * @returns {string} HMAC input containing no server secret.
 */
function createSignatureMessage(binding, randomValue) {
    const bindingByteLength = Buffer.byteLength(binding, "utf8");

    return (
        `${bindingByteLength}!${binding}!` +
        `${randomValue.length}!${randomValue}`
    );
}

/**
 * Creates an HMAC-signed CSRF token.
 *
 * The binding is never included in the returned token. A token copied from a
 * different browser or Firebase session therefore cannot be validated against
 * the current request cookies.
 *
 * @param {{binding: string, randomValue: string, csrfSecret: string}} values
 * Signing values using a validated hexadecimal secret.
 * @returns {string} Token formatted as `signature.randomValue`.
 */
export function createSignedCsrfToken({
    binding,
    randomValue,
    csrfSecret,
}) {
    if (!HEX_VALUE_PATTERN.test(randomValue)) {
        throw new Error("CSRF random value must be 32 bytes of hexadecimal data");
    }

    const signature = createHmac(
        "sha256",
        Buffer.from(csrfSecret, "hex"),
    )
        .update(createSignatureMessage(binding, randomValue), "utf8")
        .digest("hex");

    return `${signature}.${randomValue}`;
}

/**
 * Verifies a signed token against the current private binding.
 *
 * @param {unknown} token Untrusted token from a request cookie or header.
 * @param {string} binding Current session or pre-authentication binding.
 * @param {string} csrfSecret Validated hexadecimal HMAC secret.
 * @returns {boolean} Whether the token has a valid signature for this binding.
 */
export function isSignedCsrfTokenValid(token, binding, csrfSecret) {
    if (typeof token !== "string" || !SIGNED_TOKEN_PATTERN.test(token)) {
        return false;
    }

    const [providedSignature, randomValue] = token.split(".");
    const expectedToken = createSignedCsrfToken({
        binding,
        randomValue,
        csrfSecret,
    });
    const [expectedSignature] = expectedToken.split(".");

    return timingSafeStringEqual(
        providedSignature,
        expectedSignature,
        HEX_VALUE_LENGTH,
    );
}

/**
 * Accepts the opaque Firebase cookie only within a conservative HTTP-cookie
 * size bound. Firebase Admin performs the authoritative session validation;
 * this check only prevents unbounded input from entering HMAC processing.
 *
 * @param {unknown} value Untrusted cookie value.
 * @returns {value is string} Whether the value is usable as a CSRF binding.
 */
function isUsableSessionBinding(value) {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= MAXIMUM_SESSION_COOKIE_LENGTH
    );
}

/**
 * Returns the binding that must be used for this request.
 *
 * An authenticated browser is always bound to its Firebase session cookie. A
 * browser without a session uses a separate random HttpOnly cookie so login and
 * registration can still be protected before authentication exists.
 *
 * @param {import("express").Request} request Express request with parsed cookies.
 * @returns {string | null} Current private binding or `null` when missing.
 */
function getRequestBinding(request) {
    const sessionCookie = request.cookies?.[SESSION_COOKIE_NAME];

    if (sessionCookie !== undefined) {
        return isUsableSessionBinding(sessionCookie) ? sessionCookie : null;
    }

    const preAuthenticationBinding =
        request.cookies?.[CSRF_BINDING_COOKIE_NAME];

    return typeof preAuthenticationBinding === "string" &&
        HEX_VALUE_PATTERN.test(preAuthenticationBinding)
        ? preAuthenticationBinding
        : null;
}

/**
 * Builds the shared CSRF cookie attributes.
 *
 * No Domain attribute is set, making both cookies host-only. Their lifetime
 * matches the configured Firebase session lifetime and a new token can always
 * be requested without extending authentication.
 *
 * @param {{
 *   sessionDurationMinutes: number,
 *   sessionCookieSecure: boolean,
 *   sessionCookieSameSite: "lax" | "strict" | "none"
 * }} configuration Validated cookie configuration.
 * @returns {{secure: boolean, sameSite: string, path: "/", maxAge: number}}
 * Shared Express cookie options.
 */
function createSharedCookieOptions(configuration) {
    return {
        secure: configuration.sessionCookieSecure,
        sameSite: configuration.sessionCookieSameSite,
        path: "/",
        maxAge:
            configuration.sessionDurationMinutes * MILLISECONDS_PER_MINUTE,
    };
}

/**
 * Creates signed CSRF endpoint and protection middleware.
 *
 * The random-byte function is injectable only for deterministic unit tests.
 * Production always uses Node's cryptographically secure `randomBytes`.
 *
 * @param {{
 *   configuration: {
 *     corsAllowedOrigin: string,
 *     csrfSecret: string,
 *     sessionDurationMinutes: number,
 *     sessionCookieSecure: boolean,
 *     sessionCookieSameSite: "lax" | "strict" | "none"
 *   },
 *   logger?: {warn: Function},
 *   randomBytesFunction?: typeof randomBytes
 * }} dependencies Validated security dependencies.
 * @returns {{
 *   issueCsrfToken: import("express").RequestHandler,
 *   protectJsonRequest: import("express").RequestHandler,
 *   protectRequest: import("express").RequestHandler,
 *   clearCsrfCookies: (response: import("express").Response) => void
 * }} CSRF route handlers and cookie cleanup helper.
 */
export function createCsrfProtection({
    configuration,
    logger = console,
    randomBytesFunction = randomBytes,
}) {
    const sharedCookieOptions = createSharedCookieOptions(configuration);
    const bindingCookieOptions = {
        ...sharedCookieOptions,
        httpOnly: true,
    };
    const tokenCookieOptions = {
        ...sharedCookieOptions,
        httpOnly: false,
    };
    const bindingClearCookieOptions = {
        secure: sharedCookieOptions.secure,
        sameSite: sharedCookieOptions.sameSite,
        path: sharedCookieOptions.path,
        httpOnly: true,
    };
    const tokenClearCookieOptions = {
        secure: sharedCookieOptions.secure,
        sameSite: sharedCookieOptions.sameSite,
        path: sharedCookieOptions.path,
        httpOnly: false,
    };

    /**
     * Writes a safe rejection log and generic public response.
     *
     * @param {import("express").Request} request Rejected request.
     * @param {import("express").Response} response Express response.
     * @param {number} status HTTP status.
     * @param {string} category Safe operational category.
     * @param {string} message Public response without security details.
     * @returns {import("express").Response} Completed response.
     */
    function rejectRequest(request, response, status, category, message) {
        logger.warn("CSRF request rejected", {
            route: `${request.method} ${request.baseUrl}${request.path}`,
            status,
            category,
        });

        return response.status(status).json({ message });
    }

    /**
     * Requires the request Origin to match the one configured frontend exactly.
     *
     * @param {import("express").Request} request Express request.
     * @param {import("express").Response} response Express response.
     * @returns {import("express").Response | null} Rejection or `null`.
     */
    function rejectInvalidOrigin(request, response) {
        if (request.get("Origin") === configuration.corsAllowedOrigin) {
            return null;
        }

        return rejectRequest(
            request,
            response,
            403,
            CSRF_REJECTION_CATEGORY.ORIGIN_REJECTED,
            "Request could not be verified",
        );
    }

    /**
     * Validates origin, optional JSON content type, and signed token values.
     *
     * @param {boolean} requireJson Whether this route accepts a JSON body.
     * @returns {import("express").RequestHandler} Express protection middleware.
     */
    function createProtectionMiddleware(requireJson) {
        return (request, response, next) => {
            const originRejection = rejectInvalidOrigin(request, response);

            if (originRejection) {
                return originRejection;
            }

            if (requireJson && !request.is("application/json")) {
                return rejectRequest(
                    request,
                    response,
                    415,
                    CSRF_REJECTION_CATEGORY.CONTENT_TYPE_REJECTED,
                    "Content-Type must be application/json",
                );
            }

            const headerToken = request.get(CSRF_HEADER_NAME);
            const cookieToken = request.cookies?.[CSRF_TOKEN_COOKIE_NAME];
            const binding = getRequestBinding(request);

            if (!headerToken || !cookieToken || !binding) {
                return rejectRequest(
                    request,
                    response,
                    403,
                    CSRF_REJECTION_CATEGORY.TOKEN_MISSING,
                    "Request could not be verified",
                );
            }

            if (
                !SIGNED_TOKEN_PATTERN.test(headerToken) ||
                !SIGNED_TOKEN_PATTERN.test(cookieToken) ||
                !timingSafeStringEqual(
                    headerToken,
                    cookieToken,
                    SIGNED_TOKEN_LENGTH,
                ) ||
                !isSignedCsrfTokenValid(
                    headerToken,
                    binding,
                    configuration.csrfSecret,
                )
            ) {
                return rejectRequest(
                    request,
                    response,
                    403,
                    CSRF_REJECTION_CATEGORY.TOKEN_INVALID,
                    "Request could not be verified",
                );
            }

            return next();
        };
    }

    /**
     * Issues a token for the current Firebase session or pre-authentication
     * browser binding. Existing valid tokens are reused so another browser tab
     * cannot unexpectedly invalidate an active form.
     */
    const issueCsrfToken = (request, response) => {
        const suppliedOrigin = request.get("Origin");

        // Same-origin GET requests may omit Origin. If it is present, however,
        // an unexpected site must not be allowed to initialize CSRF cookies.
        if (
            suppliedOrigin &&
            suppliedOrigin !== configuration.corsAllowedOrigin
        ) {
            return rejectInvalidOrigin(request, response);
        }

        const sessionCookie = request.cookies?.[SESSION_COOKIE_NAME];
        let binding;

        if (sessionCookie !== undefined) {
            if (!isUsableSessionBinding(sessionCookie)) {
                return rejectRequest(
                    request,
                    response,
                    403,
                    CSRF_REJECTION_CATEGORY.TOKEN_INVALID,
                    "Request could not be verified",
                );
            }

            binding = sessionCookie;
            // Once authenticated, the Firebase session is the stronger private
            // binding. Remove the pre-authentication cookie so only one binding
            // remains active in the browser.
            response.clearCookie(
                CSRF_BINDING_COOKIE_NAME,
                bindingClearCookieOptions,
            );
        } else {
            const existingBinding =
                request.cookies?.[CSRF_BINDING_COOKIE_NAME];
            binding =
                typeof existingBinding === "string" &&
                HEX_VALUE_PATTERN.test(existingBinding)
                    ? existingBinding
                    : randomBytesFunction(RANDOM_VALUE_BYTES).toString("hex");

            response.cookie(
                CSRF_BINDING_COOKIE_NAME,
                binding,
                bindingCookieOptions,
            );
        }

        const existingToken = request.cookies?.[CSRF_TOKEN_COOKIE_NAME];
        const csrfToken = isSignedCsrfTokenValid(
            existingToken,
            binding,
            configuration.csrfSecret,
        )
            ? existingToken
            : createSignedCsrfToken({
                binding,
                randomValue:
                    randomBytesFunction(RANDOM_VALUE_BYTES).toString("hex"),
                csrfSecret: configuration.csrfSecret,
            });

        response.cookie(
            CSRF_TOKEN_COOKIE_NAME,
            csrfToken,
            tokenCookieOptions,
        );
        response.setHeader("Cache-Control", "no-store");
        return response.status(200).json({ csrfToken });
    };

    /**
     * Clears both CSRF cookies after authentication changes the binding or the
     * user logs out. The identifying attributes match those used when setting.
     *
     * @param {import("express").Response} response Express response.
     * @returns {void}
     */
    function clearCsrfCookies(response) {
        response.clearCookie(
            CSRF_BINDING_COOKIE_NAME,
            bindingClearCookieOptions,
        );
        response.clearCookie(
            CSRF_TOKEN_COOKIE_NAME,
            tokenClearCookieOptions,
        );
    }

    return {
        issueCsrfToken,
        protectJsonRequest: createProtectionMiddleware(true),
        protectRequest: createProtectionMiddleware(false),
        clearCsrfCookies,
    };
}
