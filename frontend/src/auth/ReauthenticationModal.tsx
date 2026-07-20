import { useEffect, useState, type FormEvent } from "react";

interface ReauthenticationModalProps {
    email: string;
    isOpen: boolean;
    isRequired: boolean;
    onCancel: () => void;
    onSubmit: (email: string, password: string) => Promise<void>;
}

/**
 * Collects credentials without navigating away from the active scouting page.
 *
 * The modal becomes non-dismissible after expiration or an API 401. Keeping it
 * beside the current page leaves every form component and its React state
 * mounted while the Firebase session is replaced.
 */
export function ReauthenticationModal({
    email,
    isOpen,
    isRequired,
    onCancel,
    onSubmit,
}: ReauthenticationModalProps) {
    const [submittedEmail, setSubmittedEmail] = useState(email);
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSubmittedEmail(email);
            setPassword("");
            setErrorMessage(null);
        }
    }, [email, isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!submittedEmail.trim() || !password) {
            setErrorMessage("Email and password are required");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await onSubmit(submittedEmail, password);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Reauthentication failed. Please try again.",
            );
            // A failed password should not remain in component state longer
            // than necessary or be resubmitted accidentally.
            setPassword("");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reauthentication-title"
        >
            <form
                className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-gray-900 p-6 text-white shadow-2xl"
                onSubmit={handleSubmit}
            >
                <h2
                    id="reauthentication-title"
                    className="text-2xl font-bold"
                >
                    Reauthentication required
                </h2>
                <p className="text-gray-200">
                    Log in again to continue. Your current scouting form will
                    remain open.
                </p>

                <label className="flex flex-col gap-2">
                    <span>Email</span>
                    <input
                        type="email"
                        value={submittedEmail}
                        autoComplete="username"
                        onChange={(event) =>
                            setSubmittedEmail(event.target.value)
                        }
                        className="rounded-xl bg-gray-800 px-4 py-3"
                        disabled={isSubmitting}
                    />
                </label>

                <label className="flex flex-col gap-2">
                    <span>Password</span>
                    <input
                        type="password"
                        value={password}
                        autoComplete="current-password"
                        onChange={(event) => setPassword(event.target.value)}
                        className="rounded-xl bg-gray-800 px-4 py-3"
                        disabled={isSubmitting}
                        autoFocus
                    />
                </label>

                {errorMessage && (
                    <p role="alert" className="text-red-300">
                        {errorMessage}
                    </p>
                )}

                <div className="flex justify-end gap-3">
                    {!isRequired && (
                        <button
                            type="button"
                            className="rounded-xl bg-gray-700 px-4 py-2 hover:bg-gray-600"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Not now
                        </button>
                    )}
                    <button
                        type="submit"
                        className="rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Logging in..." : "Log in"}
                    </button>
                </div>
            </form>
        </div>
    );
}

