import { createContext } from "react";

import type { AuthenticationContextValue } from "./types";

/** Internal context; consumers use `useAuthentication` for a clear error. */
export const AuthenticationContext =
    createContext<AuthenticationContextValue | null>(null);

