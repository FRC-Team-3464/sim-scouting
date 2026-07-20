/** Shared DOM assertions and cleanup for frontend tests. */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are intentionally disabled, so register cleanup explicitly
// and guarantee that no rendered authentication state leaks between tests.
afterEach(() => {
    cleanup();
});
