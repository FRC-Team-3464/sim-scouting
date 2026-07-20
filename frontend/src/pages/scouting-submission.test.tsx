import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { writeToDb } from "../api/scouting";
import { APP_ROUTES } from "../routes";
import MatchForm from "./MatchForm";
import PitScoutingForm from "./pitScoutingForm";

vi.mock("../api/scouting", () => ({
    writeToDb: vi.fn(),
}));

// Debug access bypasses only the legacy form-required-field checks, allowing
// these tests to focus narrowly on submission and navigation behavior.
vi.mock("../auth/use-authentication", () => ({
    useAuthentication: () => ({ user: { debug: true } }),
}));

function renderForm(path: string, form: ReactNode) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path={path} element={form} />
                <Route path={APP_ROUTES.home} element={<p>Home page</p>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe("scouting submission state", () => {
    beforeEach(() => {
        vi.mocked(writeToDb).mockReset();
        window.localStorage.clear();
    });

    test("pit scouting returns home after a confirmed upload", async () => {
        const user = userEvent.setup();
        vi.mocked(writeToDb).mockResolvedValueOnce(true);
        renderForm(APP_ROUTES.pit, <PitScoutingForm />);

        await user.click(screen.getByRole("button", { name: "Submit" }));

        expect(await screen.findByText("Home page")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(window.localStorage.length).toBe(1);
    });

    test("pit scouting stays available when the upload is rejected", async () => {
        const user = userEvent.setup();
        vi.mocked(writeToDb).mockResolvedValueOnce(false);
        renderForm(APP_ROUTES.pit, <PitScoutingForm />);

        await user.click(screen.getByRole("button", { name: "Submit" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Upload failed",
        );
        expect(screen.queryByText("Home page")).not.toBeInTheDocument();
        expect(window.localStorage.length).toBe(1);
    });

    test("match scouting returns home after a confirmed upload", async () => {
        const user = userEvent.setup();
        vi.mocked(writeToDb).mockResolvedValueOnce(true);
        renderForm(APP_ROUTES.match, <MatchForm />);
        await user.click(screen.getByRole("button", { name: "Finale" }));

        await user.click(screen.getByRole("button", { name: "Submit" }));

        expect(await screen.findByText("Home page")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(window.localStorage.length).toBe(1);
    });

    test("match scouting handles a thrown upload failure", async () => {
        const user = userEvent.setup();
        vi.mocked(writeToDb).mockRejectedValueOnce(new Error("API unavailable"));
        renderForm(APP_ROUTES.match, <MatchForm />);
        await user.click(screen.getByRole("button", { name: "Finale" }));

        await user.click(screen.getByRole("button", { name: "Submit" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Upload failed",
        );
        expect(screen.queryByText("Home page")).not.toBeInTheDocument();
        expect(window.localStorage.length).toBe(1);
    });
});
