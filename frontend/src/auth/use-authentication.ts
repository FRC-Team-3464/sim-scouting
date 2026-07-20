import { useContext } from "react";

import { AuthenticationContext } from "./auth-context";
import type { AuthenticationContextValue } from "./types";

/**
 * Returns the application authentication state and operations.
 *
 * @returns Current verified session state and authentication actions.
 * @throws {Error} When used outside `AuthenticationProvider`.
 */
export function useAuthentication(): AuthenticationContextValue {
    const authentication = useContext(AuthenticationContext);

    if (!authentication) {
        throw new Error(
            "useAuthentication must be used inside AuthenticationProvider",
        );
    }

    return authentication;
}

