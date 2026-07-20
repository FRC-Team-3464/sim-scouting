import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AuthenticationContext } from "../auth/auth-context";
import { FreshSessionRoute } from "../auth/FreshSessionRoute";
import type { AuthenticationContextValue } from "../auth/types";
import Home from "./Home";
import LoginPage from "./Login";
import SignupPage from "./Signup";

const authenticatedUser = {
    uid: "scout-uid",
    email: "scout@example.com",
    name: "Scout Name",
    debug: true,
};

function createAuthenticationValue(
    overrides: Partial<AuthenticationContextValue> = {},
): AuthenticationContextValue {
    return {
        status: "anonymous",
        user: null,
        sessionExpiresAt: null,
        sessionExpirationWarningAt: null,
        sessionInitializationError: null,
        isExpirationWarningActive: false,
        isSessionExpired: false,
        login: vi.fn(async () => undefined),
        register: vi.fn(async () => undefined),
        logout: vi.fn(async () => undefined),
        refreshSession: vi.fn(async () => undefined),
        requestReauthentication: vi.fn(async () => true),
        requireFreshSession: vi.fn(async () => true),
        ...overrides,
    };
}

function renderWithAuthentication(
    element: ReactElement,
    authentication: AuthenticationContextValue,
    initialEntries: Parameters<typeof MemoryRouter>[0]["initialEntries"] = [
        "/",
    ],
) {
    return render(
        <AuthenticationContext.Provider value={authentication}>
            <MemoryRouter initialEntries={initialEntries}>
                {element}
            </MemoryRouter>
        </AuthenticationContext.Provider>,
    );
}

describe("session-authentication pages", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("login uses the backend session operation and restores the requested route", async () => {
        const user = userEvent.setup();
        const login = vi.fn(async () => undefined);
        const authentication = createAuthenticationValue({ login });

        renderWithAuthentication(
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/match" element={<p>Requested match form</p>} />
            </Routes>,
            authentication,
            [
                {
                    pathname: "/login",
                    state: { returnTo: "/match" },
                },
            ],
        );

        await user.type(screen.getByLabelText("Email"), "scout@example.com");
        await user.type(screen.getByLabelText("Password"), "private-password");
        await user.click(screen.getByRole("button", { name: "Log In" }));

        expect(login).toHaveBeenCalledWith(
            "scout@example.com",
            "private-password",
        );
        expect(
            await screen.findByText("Requested match form"),
        ).toBeInTheDocument();
    });

    test("registration preserves the existing password validations", async () => {
        const user = userEvent.setup();
        const register = vi.fn(async () => undefined);
        const alertMock = vi.fn();
        vi.stubGlobal("alert", alertMock);
        const authentication = createAuthenticationValue({ register });

        renderWithAuthentication(<SignupPage />, authentication, ["/signup"]);

        await user.type(screen.getByLabelText("Name"), "Scout Name");
        await user.type(screen.getByLabelText("Email"), "scout@example.com");
        await user.type(screen.getByLabelText("Password"), "short");
        await user.type(screen.getByLabelText("Confirm password"), "short");
        await user.click(
            screen.getByRole("button", { name: "Create Account" }),
        );

        expect(alertMock).toHaveBeenCalledWith(
            "Password must be longer than 6 characters.",
        );
        expect(register).not.toHaveBeenCalled();

        await user.clear(screen.getByLabelText("Password"));
        await user.clear(screen.getByLabelText("Confirm password"));
        await user.type(screen.getByLabelText("Password"), "long-password");
        await user.type(
            screen.getByLabelText("Confirm password"),
            "different-password",
        );
        await user.click(
            screen.getByRole("button", { name: "Create Account" }),
        );

        expect(alertMock).toHaveBeenLastCalledWith("Passwords do not match!");
        expect(register).not.toHaveBeenCalled();
    });

    test("registration creates the backend session and navigates home", async () => {
        const user = userEvent.setup();
        const register = vi.fn(async () => undefined);
        const authentication = createAuthenticationValue({ register });

        renderWithAuthentication(
            <Routes>
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/" element={<p>Authenticated home</p>} />
            </Routes>,
            authentication,
            ["/signup"],
        );

        await user.type(screen.getByLabelText("Name"), "Scout Name");
        await user.type(screen.getByLabelText("Email"), "scout@example.com");
        await user.type(
            screen.getByLabelText("Password"),
            "private-password",
        );
        await user.type(
            screen.getByLabelText("Confirm password"),
            "private-password",
        );
        await user.click(
            screen.getByRole("button", { name: "Create Account" }),
        );

        expect(register).toHaveBeenCalledWith(
            "Scout Name",
            "scout@example.com",
            "private-password",
        );
        expect(
            await screen.findByText("Authenticated home"),
        ).toBeInTheDocument();
    });

    test("login displays safe failures and clears the password field", async () => {
        const user = userEvent.setup();
        const login = vi.fn(async () => {
            throw new Error("Invalid email or password");
        });
        const authentication = createAuthenticationValue({ login });

        renderWithAuthentication(<LoginPage />, authentication, ["/login"]);

        await user.type(screen.getByLabelText("Email"), "scout@example.com");
        const passwordInput = screen.getByLabelText("Password");
        await user.type(passwordInput, "private-password");
        await user.click(screen.getByRole("button", { name: "Log In" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Invalid email or password",
        );
        expect(passwordInput).toHaveValue("");
    });

    test("home uses verified identity and requires freshness before new forms", async () => {
        const user = userEvent.setup();
        const requireFreshSession = vi
            .fn()
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true);
        const authentication = createAuthenticationValue({
            status: "authenticated",
            user: authenticatedUser,
            requireFreshSession,
        });

        renderWithAuthentication(
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/match" element={<p>Match workflow</p>} />
            </Routes>,
            authentication,
        );

        expect(
            screen.getByText("Welcome to Sim-scouting, Scout Name"),
        ).toBeInTheDocument();
        expect(screen.getByText("⚠ debug mode on ⚠")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Scout!" }));
        expect(screen.queryByText("Match workflow")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Scout!" }));
        expect(await screen.findByText("Match workflow")).toBeInTheDocument();
        expect(requireFreshSession).toHaveBeenCalledTimes(2);
    });

    test("home signs out through Node rather than deleting readable cookies", async () => {
        const user = userEvent.setup();
        const logout = vi.fn(async () => undefined);
        const authentication = createAuthenticationValue({
            status: "authenticated",
            user: authenticatedUser,
            logout,
        });

        renderWithAuthentication(
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<p>Signed out</p>} />
            </Routes>,
            authentication,
        );

        await user.click(screen.getByRole("button", { name: "Sign out" }));

        expect(logout).toHaveBeenCalledOnce();
        expect(await screen.findByText("Signed out")).toBeInTheDocument();
    });

    test("direct form routes require freshness after the warning threshold", async () => {
        const user = userEvent.setup();
        const requireFreshSession = vi.fn(async () => true);
        const authentication = createAuthenticationValue({
            status: "authenticated",
            user: authenticatedUser,
            isExpirationWarningActive: true,
            requireFreshSession,
        });

        renderWithAuthentication(
            <Routes>
                <Route element={<FreshSessionRoute />}>
                    <Route path="/match" element={<p>New match draft</p>} />
                </Route>
            </Routes>,
            authentication,
            ["/match"],
        );

        expect(
            screen.getByText("Reauthenticate to continue"),
        ).toBeInTheDocument();
        expect(screen.queryByText("New match draft")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Log in again" }));
        expect(requireFreshSession).toHaveBeenCalledOnce();
    });
});
