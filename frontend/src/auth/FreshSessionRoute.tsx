import { Outlet } from "react-router-dom";

import { useAuthentication } from "./use-authentication";

/**
 * Prevents a warned session from starting a new Match or Pit scouting form.
 *
 * Home normally opens the reauthentication modal before navigation. This gate
 * also covers direct URLs and bookmarks without mounting a new empty draft
 * behind the prompt. Forms that were already mounted when the warning appeared
 * are unaffected and remain preserved by the global provider.
 */
export function FreshSessionRoute() {
    const {
        isExpirationWarningActive,
        isSessionExpired,
        requireFreshSession,
    } = useAuthentication();

    if (!isExpirationWarningActive && !isSessionExpired) {
        return <Outlet />;
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center text-white">
            <h1 className="text-2xl font-bold">Reauthenticate to continue</h1>
            <p>
                Your session is close to expiration. Log in again before
                starting a new scouting form.
            </p>
            <button
                type="button"
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700"
                onClick={() => void requireFreshSession()}
            >
                Log in again
            </button>
        </div>
    );
}

