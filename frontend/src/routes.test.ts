import { describe, expect, test } from "vitest";

import { APP_ROUTES, LEGACY_APP_ROUTES } from "./routes";

describe("browser route configuration", () => {
    test("uses the approved simple canonical paths", () => {
        expect(APP_ROUTES).toEqual({
            home: "/",
            localData: "/local-data",
            login: "/login",
            match: "/match",
            pit: "/pit",
            signup: "/signup",
        });
    });

    test("retains only the superseded paths needed for redirects", () => {
        expect(LEGACY_APP_ROUTES).toEqual({
            localData: "/stored",
            pit: "/pitScouting",
        });
    });
});
