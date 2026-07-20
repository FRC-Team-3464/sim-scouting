/**
 * Central HTTP client for every request from React to the Node API.
 *
 * Authentication cookies remain HttpOnly, so this module never reads them.
 * The browser includes them through `credentials: "include"`. CSRF tokens are
 * deliberately kept only in memory and are refreshed whenever authentication
 * changes the private cookie binding.
 */

import { API_BASE_URL } from "../scripts/config";

const MAXIMUM_AUTOMATIC_RETRIES = 2;
const SAFE_RETRY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type ReauthenticationHandler = () => Promise<boolean>;

interface ErrorResponseBody {
    message?: unknown;
}

export interface ApiRequestOptions {
    method?: string;
    body?: unknown;
    headers?: HeadersInit;
    retryAfterReauthentication?: boolean;
}

/**
 * Safe application error produced for HTTP and network failures.
 *
 * Response bodies are retained only so callers can inspect documented public
 * fields. Request bodies, credentials, cookies, and CSRF values are never
 * attached to the error.
 */
export class ApiError extends Error {
    readonly status: number | null;
    readonly responseBody: unknown;

    constructor(message: string, status: number | null, responseBody?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.responseBody = responseBody;
    }
}

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
let reauthenticationHandler: ReauthenticationHandler | null = null;

/**
 * Registers the UI callback used when an authenticated request returns 401.
 *
 * The authentication provider owns the callback because only React can show a
 * modal without unmounting an active scouting form. Returning `true` confirms
 * that a replacement session was established and the request may be replayed.
 *
 * @param handler Callback that completes in-place reauthentication.
 * @returns {() => void} Cleanup function that removes only this callback.
 */
export function setReauthenticationHandler(
    handler: ReauthenticationHandler,
): () => void {
    reauthenticationHandler = handler;

    return () => {
        if (reauthenticationHandler === handler) {
            reauthenticationHandler = null;
        }
    };
}

/**
 * Discards the readable token after login, registration, or logout.
 *
 * Those operations clear or replace the private cookie binding on the server,
 * so reusing the old signed token would correctly produce a CSRF rejection.
 */
export function invalidateCsrfToken(): void {
    csrfToken = null;
    csrfRequest = null;
}

/**
 * Parses a response without assuming every endpoint returns JSON.
 *
 * @param response Fetch response returned by the Node API.
 * @returns Parsed JSON, text, or `undefined` for an empty response.
 */
async function parseResponseBody(response: Response): Promise<unknown> {
    if (response.status === 204) {
        return undefined;
    }

    const responseText = await response.text();

    if (!responseText) {
        return undefined;
    }

    if (response.headers.get("content-type")?.includes("application/json")) {
        try {
            return JSON.parse(responseText);
        } catch {
            throw new ApiError(
                "The API returned an invalid JSON response",
                response.status,
            );
        }
    }

    return responseText;
}

/**
 * Produces a safe public message from an unsuccessful response.
 *
 * @param status HTTP status returned by the API.
 * @param responseBody Parsed public response body.
 * @returns Message suitable for application error handling.
 */
function getErrorMessage(status: number, responseBody: unknown): string {
    if (
        responseBody &&
        typeof responseBody === "object" &&
        "message" in responseBody
    ) {
        const message = (responseBody as ErrorResponseBody).message;

        if (typeof message === "string" && message.trim()) {
            return message;
        }
    }

    if (typeof responseBody === "string" && responseBody.trim()) {
        return responseBody;
    }

    return `API request failed with status ${status}`;
}

/**
 * Obtains a signed CSRF token and coalesces simultaneous token requests.
 *
 * @returns Signed token returned by `/api/auth/csrf`.
 * @throws {ApiError} When the endpoint fails or returns a malformed payload.
 */
async function getCsrfToken(): Promise<string> {
    if (csrfToken) {
        return csrfToken;
    }

    if (!csrfRequest) {
        csrfRequest = (async () => {
            let response: Response;

            try {
                response = await fetch(`${API_BASE_URL}/auth/csrf`, {
                    credentials: "include",
                });
            } catch {
                throw new ApiError(
                    "Unable to contact the API",
                    null,
                );
            }

            const responseBody = await parseResponseBody(response);

            if (!response.ok) {
                throw new ApiError(
                    getErrorMessage(response.status, responseBody),
                    response.status,
                    responseBody,
                );
            }

            if (
                !responseBody ||
                typeof responseBody !== "object" ||
                !("csrfToken" in responseBody) ||
                typeof responseBody.csrfToken !== "string" ||
                !responseBody.csrfToken
            ) {
                throw new ApiError(
                    "The API returned an invalid CSRF response",
                    response.status,
                );
            }

            csrfToken = responseBody.csrfToken;
            return csrfToken;
        })().finally(() => {
            csrfRequest = null;
        });
    }

    return csrfRequest;
}

/**
 * Sends one API request using the approved retry policy.
 *
 * Safe reads may retry transient network and 5xx failures twice. Mutations are
 * never retried for those failures because the server may have committed the
 * operation before the response was lost. A 401 may be retried at most twice,
 * but only after the user successfully establishes a replacement session.
 *
 * @template T Expected successful response type.
 * @param path API path beginning with `/`.
 * @param options HTTP and retry options.
 * @returns Parsed successful response.
 * @throws {ApiError} For rejected, malformed, or unavailable API responses.
 */
export async function apiRequest<T = void>(
    path: string,
    options: ApiRequestOptions = {},
): Promise<T> {
    const method = (options.method || "GET").toUpperCase();
    const isSafeMethod = SAFE_RETRY_METHODS.has(method);
    const isMutation = !isSafeMethod;
    const mayReauthenticate = options.retryAfterReauthentication !== false;
    let automaticRetryCount = 0;

    while (true) {
        const headers = new Headers(options.headers);

        if (options.body !== undefined) {
            headers.set("Content-Type", "application/json");
        }

        if (isMutation) {
            headers.set("X-CSRF-Token", await getCsrfToken());
        }

        let response: Response;

        try {
            response = await fetch(`${API_BASE_URL}${path}`, {
                method,
                credentials: "include",
                headers,
                body:
                    options.body === undefined
                        ? undefined
                        : JSON.stringify(options.body),
            });
        } catch {
            if (
                isSafeMethod &&
                automaticRetryCount < MAXIMUM_AUTOMATIC_RETRIES
            ) {
                automaticRetryCount += 1;
                continue;
            }

            throw new ApiError("Unable to contact the API", null);
        }

        const responseBody = await parseResponseBody(response);

        if (response.ok) {
            return responseBody as T;
        }

        if (
            response.status === 401 &&
            mayReauthenticate &&
            reauthenticationHandler &&
            automaticRetryCount < MAXIMUM_AUTOMATIC_RETRIES
        ) {
            const reauthenticated = await reauthenticationHandler();

            if (reauthenticated) {
                automaticRetryCount += 1;
                continue;
            }
        }

        if (
            response.status >= 500 &&
            isSafeMethod &&
            automaticRetryCount < MAXIMUM_AUTOMATIC_RETRIES
        ) {
            automaticRetryCount += 1;
            continue;
        }

        throw new ApiError(
            getErrorMessage(response.status, responseBody),
            response.status,
            responseBody,
        );
    }
}

