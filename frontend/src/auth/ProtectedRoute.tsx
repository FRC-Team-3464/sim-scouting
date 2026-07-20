import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthentication } from "./use-authentication";
import { APP_ROUTES } from "../routes";

/**
 * Prevents protected pages from rendering until Node confirms authentication.
 *
 * API outages keep a retry screen instead of redirecting to login because only
 * a 401 is authoritative evidence that the browser is anonymous.
 */
export function ProtectedRoute() {
    const location = useLocation();
    const { status, sessionInitializationError, refreshSession } =
        useAuthentication();

    if (status === "loading") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-white">
                {sessionInitializationError ? (
                    <>
                        <p role="alert">{sessionInitializationError}</p>
                        <button
                            type="button"
                            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700"
                            onClick={() => void refreshSession()}
                        >
                            Retry session check
                        </button>
                    </>
                ) : (
                    <p>Checking your session...</p>
                )}
            </div>
        );
    }

    if (status === "anonymous") {
        return (
            <Navigate
                to={APP_ROUTES.login}
                replace
                state={{ returnTo: location.pathname }}
            />
        );
    }

    return <Outlet />;
}
