/** Verified user information returned by the Node session API. */
export interface AuthenticatedUser {
    uid: string;
    email: string;
    name: string;
    debug: boolean;
}

/** Stable public session representation shared by all auth endpoints. */
export interface AuthenticationSession {
    user: AuthenticatedUser;
    sessionExpiresAt: string;
    sessionExpirationWarningAt: string;
}

export type AuthenticationStatus =
    | "loading"
    | "authenticated"
    | "anonymous";

/** Operations and verified state exposed to React pages. */
export interface AuthenticationContextValue {
    status: AuthenticationStatus;
    user: AuthenticatedUser | null;
    sessionExpiresAt: string | null;
    sessionExpirationWarningAt: string | null;
    sessionInitializationError: string | null;
    isExpirationWarningActive: boolean;
    isSessionExpired: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
    requestReauthentication: (required?: boolean) => Promise<boolean>;
    requireFreshSession: () => Promise<boolean>;
}

