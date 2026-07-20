/**
 * Application-wide Firebase session lifecycle for the React frontend.
 *
 * The provider restores verified state from Node, schedules warning/expiration
 * UI from server timestamps, and coordinates in-place reauthentication for API
 * retries without exposing or reading the HttpOnly session cookie.
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import {
    ApiError,
    apiRequest,
    invalidateCsrfToken,
    setReauthenticationHandler,
} from "../api/client";
import { AuthenticationContext } from "./auth-context";
import { ReauthenticationModal } from "./ReauthenticationModal";
import { SessionExpirationWarning } from "./SessionExpirationWarning";
import type {
    AuthenticatedUser,
    AuthenticationContextValue,
    AuthenticationSession,
    AuthenticationStatus,
} from "./types";

interface AuthenticationProviderProps {
    children: ReactNode;
}

interface PendingReauthentication {
    promise: Promise<boolean>;
    resolve: (authenticated: boolean) => void;
}

/**
 * Ensures an authentication response contains the documented public fields.
 *
 * @param value Untrusted JSON returned by the API.
 * @returns Validated session representation.
 * @throws {ApiError} When required user or timing fields are malformed.
 */
function validateAuthenticationSession(value: unknown): AuthenticationSession {
    if (!value || typeof value !== "object" || !("user" in value)) {
        throw new ApiError("The API returned an invalid session", 500);
    }

    const candidate = value as Partial<AuthenticationSession>;
    const user = candidate.user as Partial<AuthenticatedUser> | undefined;
    const expirationTime = Date.parse(candidate.sessionExpiresAt || "");
    const warningTime = Date.parse(
        candidate.sessionExpirationWarningAt || "",
    );

    if (
        !user ||
        typeof user.uid !== "string" ||
        typeof user.email !== "string" ||
        typeof user.name !== "string" ||
        typeof user.debug !== "boolean" ||
        !Number.isFinite(expirationTime) ||
        !Number.isFinite(warningTime) ||
        warningTime >= expirationTime
    ) {
        throw new ApiError("The API returned an invalid session", 500);
    }

    return candidate as AuthenticationSession;
}

/**
 * Provides verified authentication state and in-place reauthentication UI.
 */
export function AuthenticationProvider({
    children,
}: AuthenticationProviderProps) {
    const [status, setStatus] =
        useState<AuthenticationStatus>("loading");
    const [session, setSession] = useState<AuthenticationSession | null>(null);
    const [sessionInitializationError, setSessionInitializationError] =
        useState<string | null>(null);
    const [isExpirationWarningActive, setExpirationWarningActive] =
        useState(false);
    const [isSessionExpired, setSessionExpired] = useState(false);
    const [isReauthenticationOpen, setReauthenticationOpen] = useState(false);
    const [isReauthenticationRequired, setReauthenticationRequired] =
        useState(false);
    const pendingReauthentication = useRef<PendingReauthentication | null>(null);
    const authenticationOperationVersion = useRef(0);

    /** Applies one validated session consistently after every auth operation. */
    const applySession = useCallback((newSession: AuthenticationSession) => {
        setSession(validateAuthenticationSession(newSession));
        setStatus("authenticated");
        setSessionInitializationError(null);
        setExpirationWarningActive(false);
        setSessionExpired(false);
    }, []);

    /** Restores the server-verified session without treating outages as logout. */
    const refreshSession = useCallback(async () => {
        const operationVersion = ++authenticationOperationVersion.current;
        setStatus("loading");
        setSessionInitializationError(null);

        try {
            const response = await apiRequest<AuthenticationSession>(
                "/auth/session",
                { retryAfterReauthentication: false },
            );

            if (operationVersion !== authenticationOperationVersion.current) {
                return;
            }
            applySession(response);
        } catch (error) {
            if (operationVersion !== authenticationOperationVersion.current) {
                return;
            }

            if (error instanceof ApiError && error.status === 401) {
                setSession(null);
                setStatus("anonymous");
                setExpirationWarningActive(false);
                setSessionExpired(false);
                return;
            }

            setSessionInitializationError(
                "Unable to verify your session. Check the API connection and try again.",
            );
            // Keep `loading` so protected routes never misclassify an API
            // outage as a confirmed anonymous response.
            setStatus("loading");
        }
    }, [applySession]);

    /** Authenticates through Node and replaces all public session state. */
    const login = useCallback(
        async (email: string, password: string) => {
            const response = await apiRequest<AuthenticationSession>(
                "/auth/login",
                {
                    method: "POST",
                    body: { email, password },
                    retryAfterReauthentication: false,
                },
            );
            // Supersede an older startup/session request so its late response
            // cannot overwrite this newly authenticated state.
            authenticationOperationVersion.current += 1;
            invalidateCsrfToken();
            applySession(response);
        },
        [applySession],
    );

    /** Registers through Node without creating any browser-side password hash. */
    const register = useCallback(
        async (name: string, email: string, password: string) => {
            const response = await apiRequest<AuthenticationSession>(
                "/auth/register",
                {
                    method: "POST",
                    body: { name, email, password },
                    retryAfterReauthentication: false,
                },
            );
            authenticationOperationVersion.current += 1;
            invalidateCsrfToken();
            applySession(response);
        },
        [applySession],
    );

    /** Clears the current browser session through the protected logout route. */
    const logout = useCallback(async () => {
        await apiRequest("/auth/logout", {
            method: "POST",
            retryAfterReauthentication: false,
        });
        authenticationOperationVersion.current += 1;
        invalidateCsrfToken();
        setSession(null);
        setStatus("anonymous");
        setExpirationWarningActive(false);
        setSessionExpired(false);

        if (pendingReauthentication.current) {
            pendingReauthentication.current.resolve(false);
            pendingReauthentication.current = null;
        }
        setReauthenticationOpen(false);
        setReauthenticationRequired(false);
    }, []);

    /**
     * Opens or joins a single reauthentication prompt.
     *
     * Multiple requests can receive 401 together. Sharing one promise prevents
     * stacked modals and lets every waiting request continue after one login.
     */
    const requestReauthentication = useCallback(
        (required = false): Promise<boolean> => {
            if (pendingReauthentication.current) {
                if (required) {
                    setReauthenticationRequired(true);
                }
                return pendingReauthentication.current.promise;
            }

            let resolveReauthentication!: (authenticated: boolean) => void;
            const promise = new Promise<boolean>((resolve) => {
                resolveReauthentication = resolve;
            });

            pendingReauthentication.current = {
                promise,
                resolve: resolveReauthentication,
            };
            setReauthenticationRequired(required);
            setReauthenticationOpen(true);
            return promise;
        },
        [],
    );

    /** Completes the modal login and releases all requests waiting on it. */
    const submitReauthentication = useCallback(
        async (email: string, password: string) => {
            await login(email, password);
            pendingReauthentication.current?.resolve(true);
            pendingReauthentication.current = null;
            setReauthenticationOpen(false);
            setReauthenticationRequired(false);
        },
        [login],
    );

    /** Cancels an optional warning-time prompt without changing form state. */
    const cancelReauthentication = useCallback(() => {
        if (isReauthenticationRequired) {
            return;
        }

        pendingReauthentication.current?.resolve(false);
        pendingReauthentication.current = null;
        setReauthenticationOpen(false);
    }, [isReauthenticationRequired]);

    /** Requires a fresh login before a warned scout starts another form. */
    const requireFreshSession = useCallback(async (): Promise<boolean> => {
        if (!isExpirationWarningActive && !isSessionExpired) {
            return true;
        }

        return requestReauthentication(isSessionExpired);
    }, [
        isExpirationWarningActive,
        isSessionExpired,
        requestReauthentication,
    ]);

    useEffect(() => {
        let isMounted = true;
        const operationVersion = authenticationOperationVersion.current;

        // Startup restoration intentionally performs no synchronous state
        // transition: the provider already begins in `loading`. Only the
        // asynchronous server result may classify the browser session.
        void apiRequest<AuthenticationSession>("/auth/session", {
            retryAfterReauthentication: false,
        })
            .then((response) => {
                if (
                    isMounted &&
                    operationVersion === authenticationOperationVersion.current
                ) {
                    applySession(response);
                }
            })
            .catch((error: unknown) => {
                if (
                    !isMounted ||
                    operationVersion !== authenticationOperationVersion.current
                ) {
                    return;
                }

                if (error instanceof ApiError && error.status === 401) {
                    setSession(null);
                    setStatus("anonymous");
                    setExpirationWarningActive(false);
                    setSessionExpired(false);
                    return;
                }

                setSessionInitializationError(
                    "Unable to verify your session. Check the API connection and try again.",
                );
                setStatus("loading");
            });

        return () => {
            isMounted = false;
        };
    }, [applySession]);

    useEffect(() => {
        const removeHandler = setReauthenticationHandler(() =>
            requestReauthentication(true),
        );

        return () => {
            removeHandler();
            pendingReauthentication.current?.resolve(false);
            pendingReauthentication.current = null;
        };
    }, [requestReauthentication]);

    useEffect(() => {
        if (!session || status !== "authenticated") {
            return undefined;
        }

        const now = Date.now();
        const warningDelay =
            Date.parse(session.sessionExpirationWarningAt) - now;
        const expirationDelay = Date.parse(session.sessionExpiresAt) - now;

        const warningTimer = window.setTimeout(
            () => setExpirationWarningActive(true),
            Math.max(0, warningDelay),
        );
        const expirationTimer = window.setTimeout(() => {
            setSessionExpired(true);
            setExpirationWarningActive(true);
            void requestReauthentication(true);
        }, Math.max(0, expirationDelay));

        return () => {
            window.clearTimeout(warningTimer);
            window.clearTimeout(expirationTimer);
        };
    }, [requestReauthentication, session, status]);

    const contextValue = useMemo<AuthenticationContextValue>(
        () => ({
            status,
            user: session?.user || null,
            sessionExpiresAt: session?.sessionExpiresAt || null,
            sessionExpirationWarningAt:
                session?.sessionExpirationWarningAt || null,
            sessionInitializationError,
            isExpirationWarningActive,
            isSessionExpired,
            login,
            register,
            logout,
            refreshSession,
            requestReauthentication,
            requireFreshSession,
        }),
        [
            isExpirationWarningActive,
            isSessionExpired,
            login,
            logout,
            refreshSession,
            register,
            requestReauthentication,
            requireFreshSession,
            session,
            sessionInitializationError,
            status,
        ],
    );

    return (
        <AuthenticationContext.Provider value={contextValue}>
            {children}
            <SessionExpirationWarning
                isVisible={
                    status === "authenticated" &&
                    isExpirationWarningActive &&
                    !isReauthenticationOpen
                }
                onReauthenticate={() => {
                    void requestReauthentication(false);
                }}
            />
            <ReauthenticationModal
                email={session?.user.email || ""}
                isOpen={isReauthenticationOpen}
                isRequired={isReauthenticationRequired}
                onCancel={cancelReauthentication}
                onSubmit={submitReauthentication}
            />
        </AuthenticationContext.Provider>
    );
}
