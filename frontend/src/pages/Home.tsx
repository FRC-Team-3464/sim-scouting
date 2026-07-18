import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthentication } from "../auth/use-authentication";

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout, requireFreshSession } = useAuthentication();
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [isLoggingOut, setLoggingOut] = useState(false);

    /**
     * Starts a new scouting workflow only after warning-time reauthentication.
     * Existing drafts are unaffected because this check runs before navigation.
     */
    const openScoutingForm = async (path: string) => {
        if (await requireFreshSession()) {
            navigate(path);
        }
    };

    const signOut = async () => {
        setLoggingOut(true);
        setLogoutError(null);

        try {
            await logout();
            navigate("/login", { replace: true });
        } catch (error) {
            setLogoutError(
                error instanceof Error
                    ? error.message
                    : "Sign out failed. Please try again.",
            );
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-6">
            <h1 className="font-bold text-white text-4xl underline">
                Welcome to Sim-scouting, {user?.name}
            </h1>

            <p className="text-gray-200 text-center w-full max-w-xl">
                At Sim-City, we realized effective scouting requires simple
                technology, which is why we created Sim-Scouting to simplify the
                scouting experience.
            </p>

            {user?.debug && (
                <p className="font-small text-red-500 text-2xl px-4 py-3 rounded-2xl">
                    ⚠ debug mode on ⚠
                </p>
            )}

            <button
                type="button"
                className="bg-sky-600 font-medium text-white text-3xl px-4 py-3 rounded-2xl hover:bg-sky-700 transition-colors"
                onClick={() => void openScoutingForm("/match")}
            >
                Scout!
            </button>
            <button
                type="button"
                className="bg-green-600 font-medium text-white text-3xl px-4 py-3 rounded-2xl hover:bg-green-700 transition-colors"
                onClick={() => navigate("/stored")}
            >
                View Local Data
            </button>
            <button
                type="button"
                className="bg-rose-600 font-medium text-white text-3xl px-4 py-3 rounded-2xl hover:bg-rose-700 transition-colors"
                onClick={() => void openScoutingForm("/pitScouting")}
            >
                Pit scouting
            </button>
            <button
                type="button"
                className="bg-slate-600 font-medium text-white text-3xl px-4 py-3 rounded-2xl hover:bg-slate-700 transition-colors disabled:opacity-60"
                onClick={() => void signOut()}
                disabled={isLoggingOut}
            >
                {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>

            {logoutError && (
                <p role="alert" className="text-red-300">
                    {logoutError}
                </p>
            )}
        </div>
    );
};

export default Home;
