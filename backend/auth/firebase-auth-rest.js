/**
 * Firebase Authentication REST client.
 *
 * This module is the only backend component that sends email/password
 * credentials to Firebase. It returns the short-lived ID token needed by the
 * session service, discards refresh tokens, and converts Firebase responses
 * into safe application error categories without logging sensitive payloads.
 */

const FIREBASE_SIGN_IN_URL =
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

export const FIREBASE_AUTH_ERROR_CATEGORY = Object.freeze({
    INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
    USER_DISABLED: "USER_DISABLED",
    RATE_LIMITED: "RATE_LIMITED",
    NOT_CONFIGURED: "NOT_CONFIGURED",
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
});

const SAFE_ERROR_MESSAGES = Object.freeze({
    [FIREBASE_AUTH_ERROR_CATEGORY.INVALID_CREDENTIALS]:
        "Invalid email or password",
    [FIREBASE_AUTH_ERROR_CATEGORY.USER_DISABLED]:
        "Unable to authenticate this account",
    [FIREBASE_AUTH_ERROR_CATEGORY.RATE_LIMITED]:
        "Too many authentication attempts",
    [FIREBASE_AUTH_ERROR_CATEGORY.NOT_CONFIGURED]:
        "Firebase Authentication is not configured correctly",
    [FIREBASE_AUTH_ERROR_CATEGORY.SERVICE_UNAVAILABLE]:
        "Firebase Authentication is temporarily unavailable",
});

/**
 * Safe error raised when Firebase cannot authenticate a user.
 *
 * Raw Firebase messages are intentionally excluded because they may expose
 * internal configuration or account details if an error is logged or returned
 * by a future route. Callers should make HTTP decisions using `category`.
 */
export class FirebaseAuthenticationError extends Error {
    /**
     * Creates a categorized authentication error containing only a safe message.
     *
     * @param {string} category One of `FIREBASE_AUTH_ERROR_CATEGORY`.
     */
    constructor(category) {
        super(SAFE_ERROR_MESSAGES[category]);
        this.name = "FirebaseAuthenticationError";
        this.category = category;
    }
}

/**
 * Reads a JSON response without allowing malformed upstream content to escape.
 *
 * @param {Response | {json: () => Promise<unknown>}} response Fetch response.
 * @returns {Promise<unknown | null>} Parsed response, or `null` when malformed.
 */
async function readJsonSafely(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Extracts the stable Firebase error code from an error response.
 *
 * Firebase messages can append explanatory text after a colon. Only the code
 * prefix is used, and the complete upstream payload is never retained.
 *
 * @param {unknown} responseBody Parsed Firebase response.
 * @returns {string | null} Normalized Firebase error code when available.
 */
function getFirebaseErrorCode(responseBody) {
    if (
        !responseBody ||
        typeof responseBody !== "object" ||
        !("error" in responseBody) ||
        !responseBody.error ||
        typeof responseBody.error !== "object" ||
        !("message" in responseBody.error) ||
        typeof responseBody.error.message !== "string"
    ) {
        return null;
    }

    return responseBody.error.message.split(":", 1)[0].trim();
}

/**
 * Maps Firebase's detailed errors to categories safe for application code.
 *
 * Missing users, invalid emails, and incorrect passwords intentionally share
 * one category so future API responses cannot be used to enumerate accounts.
 *
 * @param {unknown} responseBody Parsed Firebase error response.
 * @returns {FirebaseAuthenticationError} Safe categorized error.
 */
function mapFirebaseAuthenticationError(responseBody) {
    const firebaseErrorCode = getFirebaseErrorCode(responseBody);

    switch (firebaseErrorCode) {
        case "EMAIL_NOT_FOUND":
        case "INVALID_EMAIL":
        case "INVALID_LOGIN_CREDENTIALS":
        case "INVALID_PASSWORD":
        case "MISSING_EMAIL":
        case "MISSING_PASSWORD":
            return new FirebaseAuthenticationError(
                FIREBASE_AUTH_ERROR_CATEGORY.INVALID_CREDENTIALS,
            );
        case "USER_DISABLED":
            return new FirebaseAuthenticationError(
                FIREBASE_AUTH_ERROR_CATEGORY.USER_DISABLED,
            );
        case "TOO_MANY_ATTEMPTS_TRY_LATER":
            return new FirebaseAuthenticationError(
                FIREBASE_AUTH_ERROR_CATEGORY.RATE_LIMITED,
            );
        case "API_KEY_INVALID":
        case "INVALID_API_KEY":
        case "OPERATION_NOT_ALLOWED":
        case "PROJECT_NOT_FOUND":
            return new FirebaseAuthenticationError(
                FIREBASE_AUTH_ERROR_CATEGORY.NOT_CONFIGURED,
            );
        default:
            return new FirebaseAuthenticationError(
                FIREBASE_AUTH_ERROR_CATEGORY.SERVICE_UNAVAILABLE,
            );
    }
}

/**
 * Verifies an email and password through Firebase Authentication.
 *
 * Firebase returns an ID token and a refresh token. Only the ID token and safe
 * user metadata are returned because the server immediately exchanges the ID
 * token for a session cookie and does not maintain refresh-token state.
 *
 * @param {{
 *   email: string,
 *   password: string,
 *   firebaseWebApiKey: string,
 *   fetchImplementation?: typeof fetch
 * }} options Credentials, project Web API key, and optional test fetch function.
 * @returns {Promise<{
 *   idToken: string,
 *   uid: string,
 *   email: string,
 *   displayName: string
 * }>} Firebase ID token and safe authenticated-user metadata.
 * @throws {FirebaseAuthenticationError} When credentials are rejected, Firebase
 * is misconfigured, the service is unavailable, or its response is malformed.
 */
export async function signInWithEmailAndPassword({
    email,
    password,
    firebaseWebApiKey,
    fetchImplementation = fetch,
}) {
    const requestUrl = new URL(FIREBASE_SIGN_IN_URL);
    requestUrl.searchParams.set("key", firebaseWebApiKey);

    let response;
    try {
        response = await fetchImplementation(requestUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
                returnSecureToken: true,
            }),
        });
    } catch {
        throw new FirebaseAuthenticationError(
            FIREBASE_AUTH_ERROR_CATEGORY.SERVICE_UNAVAILABLE,
        );
    }

    const responseBody = await readJsonSafely(response);

    if (!response.ok) {
        throw mapFirebaseAuthenticationError(responseBody);
    }

    if (
        !responseBody ||
        typeof responseBody !== "object" ||
        !("idToken" in responseBody) ||
        typeof responseBody.idToken !== "string" ||
        !("localId" in responseBody) ||
        typeof responseBody.localId !== "string" ||
        !("email" in responseBody) ||
        typeof responseBody.email !== "string"
    ) {
        throw new FirebaseAuthenticationError(
            FIREBASE_AUTH_ERROR_CATEGORY.SERVICE_UNAVAILABLE,
        );
    }

    return {
        idToken: responseBody.idToken,
        uid: responseBody.localId,
        email: responseBody.email,
        displayName:
            "displayName" in responseBody &&
            typeof responseBody.displayName === "string"
                ? responseBody.displayName
                : "",
    };
}
