import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthentication } from "../auth/use-authentication";

const SignupPage: React.FC = () => {
    const navigate = useNavigate();
    const { register, status } = useAuthentication();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (status === "authenticated") {
            navigate("/", { replace: true });
        }
    }, [navigate, status]);

    const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Preserve the existing client validations. Firebase and Node remain
        // authoritative for required fields, email format, and password rules.
        if (password.length <= 6) {
            alert("Password must be longer than 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setSubmitting(true);
        setErrorMessage(null);

        try {
            await register(name, email, password);
            navigate("/", { replace: true });
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Registration failed. Please try again.",
            );
            setPassword("");
            setConfirmPassword("");
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
                onClick={() => navigate("/")}
            >
                Back
            </button>
            <h1 className="font-bold text-white text-4xl">Sign Up</h1>
            <p className="font-bold text-white text-xl pl-4 pr-4">
                Use your REAL, FULL NAME. You cannot change your name after
                creating your account
            </p>
            <p className="font-bold text-white text-xl pl-4 pr-4">
                Submissions under a false name will not be counted
            </p>
            <form
                className="flex flex-col space-y-6 w-80"
                onSubmit={handleSignup}
            >
                <input
                    type="text"
                    aria-label="Name"
                    placeholder="Name"
                    autoComplete="name"
                    className="bg-gray-800 text-white px-4 py-3 rounded-2xl outline-none"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={isSubmitting}
                />
                <input
                    type="email"
                    aria-label="Email"
                    placeholder="Email"
                    autoComplete="username"
                    className="bg-gray-800 text-white px-4 py-3 rounded-2xl outline-none"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting}
                />
                <input
                    type="password"
                    aria-label="Password"
                    placeholder="Password"
                    autoComplete="new-password"
                    className="bg-gray-800 text-white px-4 py-3 rounded-2xl outline-none"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting}
                />
                <input
                    type="password"
                    aria-label="Confirm password"
                    placeholder="Confirm Password"
                    autoComplete="new-password"
                    className="bg-gray-800 text-white px-4 py-3 rounded-2xl outline-none"
                    value={confirmPassword}
                    onChange={(event) =>
                        setConfirmPassword(event.target.value)
                    }
                    disabled={isSubmitting}
                />

                <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-2xl shadow disabled:opacity-60"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Creating your account..." : "Create Account"}
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
                onClick={() => navigate("/login")}
            >
                Already have an account? Log in
            </button>
        </div>
    );
};

export default SignupPage;
