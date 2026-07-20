import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuthentication } from "../auth/use-authentication";
import { APP_ROUTES } from "../routes";

interface LoginLocationState {
    returnTo?: string;
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, status } = useAuthentication();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const returnTo =
        (location.state as LoginLocationState | null)?.returnTo ||
        APP_ROUTES.home;

    useEffect(() => {
        if (status === "authenticated") {
            navigate(returnTo, { replace: true });
        }
    }, [navigate, returnTo, status]);

    const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setErrorMessage(null);

        try {
            await login(email, password);
            navigate(returnTo, { replace: true });
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Login failed. Please try again.",
            );
            setPassword("");
        } finally {
            setSubmitting(false);
        }
    };

    const buttonStyle =
        "bg-sky-600 text-white font-semibold text-xl px-2 py-2 rounded-full hover:bg-sky-700 transition-colors h-15 w-35";

    return (
        <div className="flex flex-col items-center justify-start space-y-8 pt-20 min-h-screen">
            <button
                type="button"
                className={buttonStyle}
                onClick={() => navigate(APP_ROUTES.home)}
            >
                Back
            </button>
            <h1 className="font-bold text-white text-4xl">Login</h1>
            <p className="font-bold text-white text-xl">
                For security reasons, all users must log in
            </p>
            <form
                className="flex flex-col space-y-6 w-80"
                onSubmit={handleLogin}
            >
                <label className="sr-only" htmlFor="login-email">
                    Email
                </label>
                <input
                    id="login-email"
                    type="email"
                    placeholder="Email"
                    autoComplete="username"
                    className="bg-gray-800 text-white px-4 py-3 rounded-2xl outline-none"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting}
                />

                <label className="sr-only" htmlFor="login-password">
                    Password
                </label>
                <input
                    id="login-password"
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    className="bg-gray-800 text-white px-4 py-3 rounded-2xl outline-none"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting}
                />

                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow disabled:opacity-60"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Logging you in..." : "Log In"}
                </button>
            </form>

            {errorMessage && (
                <p role="alert" className="text-red-300">
                    {errorMessage}
                </p>
            )}

            <button
                type="button"
                className="text-blue-400 hover:text-blue-300 text-sm pt-2"
                onClick={() => navigate(APP_ROUTES.signup)}
            >
                No account? Sign up
            </button>
        </div>
    );
};

export default LoginPage;
