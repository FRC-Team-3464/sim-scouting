import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import {
    MemoryRouter,
    Route,
    Routes,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError, apiRequest } from "../api/client";
import { AuthenticationProvider } from "./AuthenticationProvider";
import { ProtectedRoute } from "./ProtectedRoute";
import type { AuthenticationSession } from "./types";
import { useAuthentication } from "./use-authentication";

vi.mock("../api/client", () => {
    class MockApiError extends Error {
        readonly status: number | null;
        readonly responseBody: unknown;

        constructor(
            message: string,
            status: number | null,
            responseBody?: unknown,
        ) {
            super(message);
            this.name = "ApiError";
            this.status = status;
            this.responseBody = responseBody;
        }
    }

    return {
        ApiError: MockApiError,
        apiRequest: vi.fn(),
        invalidateCsrfToken: vi.fn(),
        setReauthenticationHandler: vi.fn(() => () => undefined),
    };
});

const session: AuthenticationSession = {
    user: {
        uid: "scout-uid",
        email: "scout@example.com",
        name: "Scout Name",
        debug: false,
    },
    sessionExpiresAt: "2026-07-18T12:00:00.000Z",
    sessionExpirationWarningAt: "2026-07-18T11:30:00.000Z",
};

function ProtectedTestApplication() {
    return (
        <MemoryRouter initialEntries={["/match"]}>
            <AuthenticationProvider>
                <Routes>
                    <Route path="/login" element={<p>Login page</p>} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/match" element={<p>Match form</p>} />
                    </Route>
                </Routes>
            </AuthenticationProvider>
        </MemoryRouter>
    );
}

function DraftHarness() {
    const { requestReauthentication } = useAuthentication();
    const [draft, setDraft] = useState("");

    return (
        <>
            <label>
                Draft notes
                <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                />
            </label>
            <button
                type="button"
                onClick={() => void requestReauthentication(false)}
            >
                Reauthenticate
            </button>
        </>
    );
}

describe("AuthenticationProvider", () => {
    beforeEach(() => {
        vi.mocked(apiRequest).mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test("shows loading until startup session restoration succeeds", async () => {
        let resolveSession!: (value: AuthenticationSession) => void;
        vi.mocked(apiRequest).mockReturnValueOnce(
            new Promise((resolve) => {
                resolveSession = resolve;
            }),
        );

        render(<ProtectedTestApplication />);
        expect(screen.getByText("Checking your session...")).toBeInTheDocument();
        expect(screen.queryByText("Match form")).not.toBeInTheDocument();

        resolveSession(session);
        expect(await screen.findByText("Match form")).toBeInTheDocument();
    });

    test("redirects only after the session endpoint confirms 401", async () => {
        vi.mocked(apiRequest).mockRejectedValueOnce(
            new ApiError("Authentication required", 401),
        );

        render(<ProtectedTestApplication />);

        expect(await screen.findByText("Login page")).toBeInTheDocument();
        expect(screen.queryByText("Match form")).not.toBeInTheDocument();
    });

    test("keeps an API outage distinct from an anonymous response", async () => {
        vi.mocked(apiRequest).mockRejectedValueOnce(
            new ApiError("Unable to contact the API", null),
        );

        render(<ProtectedTestApplication />);

        expect(
            await screen.findByText(/Unable to verify your session/),
        ).toBeInTheDocument();
        expect(screen.queryByText("Login page")).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Retry session check" }),
        ).toBeInTheDocument();
    });

    test("reauthenticates without unmounting or clearing an active draft", async () => {
        const user = userEvent.setup();
        vi.mocked(apiRequest)
            .mockResolvedValueOnce(session)
            .mockResolvedValueOnce(session);

        render(
            <AuthenticationProvider>
                <DraftHarness />
            </AuthenticationProvider>,
        );
        const draftInput = screen.getByRole("textbox", {
            name: "Draft notes",
        });
        await user.type(draftInput, "Keep this scouting note");
        await user.click(
            screen.getByRole("button", { name: "Reauthenticate" }),
        );

        expect(
            screen.getByRole("dialog", { name: "Reauthentication required" }),
        ).toBeInTheDocument();
        expect(draftInput).toHaveValue("Keep this scouting note");

        await user.clear(screen.getByLabelText("Email"));
        await user.type(screen.getByLabelText("Email"), "scout@example.com");
        await user.type(screen.getByLabelText("Password"), "private-password");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
        expect(draftInput).toHaveValue("Keep this scouting note");
        expect(apiRequest).toHaveBeenLastCalledWith("/auth/login", {
            method: "POST",
            body: {
                email: "scout@example.com",
                password: "private-password",
            },
            retryAfterReauthentication: false,
        });
    });

    test("shows the warning and makes reauthentication mandatory at expiration", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-18T11:29:59.000Z"));
        vi.mocked(apiRequest).mockResolvedValueOnce(session);

        render(
            <AuthenticationProvider>
                <p>Active form</p>
            </AuthenticationProvider>,
        );
        await act(async () => Promise.resolve());

        act(() => {
            vi.advanceTimersByTime(1_000);
        });
        expect(
            screen.getByText(/Your session will expire soon/),
        ).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(30 * 60 * 1000);
        });
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Not now" }),
        ).not.toBeInTheDocument();
        expect(screen.getByText("Active form")).toBeInTheDocument();
    });
});

