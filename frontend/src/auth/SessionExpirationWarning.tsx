interface SessionExpirationWarningProps {
    isVisible: boolean;
    onReauthenticate: () => void;
}

/** Non-blocking warning driven by the backend-configured warning timestamp. */
export function SessionExpirationWarning({
    isVisible,
    onReauthenticate,
}: SessionExpirationWarningProps) {
    if (!isVisible) {
        return null;
    }

    return (
        <aside
            className="fixed left-4 right-4 top-4 z-40 mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-2xl bg-amber-300 p-4 text-center text-gray-950 shadow-xl sm:flex-row sm:justify-between"
            role="status"
        >
            <p className="font-semibold">
                Your session will expire soon. Reauthenticate before starting
                another scouting form.
            </p>
            <button
                type="button"
                className="whitespace-nowrap rounded-xl bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800"
                onClick={onReauthenticate}
            >
                Reauthenticate now
            </button>
        </aside>
    );
}

