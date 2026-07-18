import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const API_BASE_URL = "http://localhost:3000/api";
const SIGNED_CSRF_TOKEN = `${"a".repeat(64)}.${"b".repeat(64)}`;

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

async function loadFreshClient() {
    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", API_BASE_URL);
    return import("./client");
}

describe("central API client", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    test("includes credentials and a signed CSRF token on mutations", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ csrfToken: SIGNED_CSRF_TOKEN }))
            .mockResolvedValueOnce(jsonResponse({ saved: true }));
        const { apiRequest } = await loadFreshClient();

        await apiRequest("/write", {
            method: "POST",
            body: { path: "123/1", data: { teamNumber: 123 } },
        });

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            `${API_BASE_URL}/auth/csrf`,
            { credentials: "include" },
        );
        const mutationOptions = fetchMock.mock.calls[1]?.[1];
        const headers = new Headers(mutationOptions?.headers);
        expect(mutationOptions?.credentials).toBe("include");
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(headers.get("X-CSRF-Token")).toBe(SIGNED_CSRF_TOKEN);
    });

    test("refreshes the CSRF token after its authentication binding changes", async () => {
        const replacementToken = `${"c".repeat(64)}.${"d".repeat(64)}`;
        const fetchMock = vi.mocked(fetch);
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ csrfToken: SIGNED_CSRF_TOKEN }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }))
            .mockResolvedValueOnce(jsonResponse({ csrfToken: replacementToken }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        const { apiRequest, invalidateCsrfToken } = await loadFreshClient();

        await apiRequest("/auth/logout", { method: "POST" });
        invalidateCsrfToken();
        await apiRequest("/auth/logout", { method: "POST" });

        expect(fetchMock).toHaveBeenCalledTimes(4);
        const secondMutationHeaders = new Headers(
            fetchMock.mock.calls[3]?.[1]?.headers,
        );
        expect(secondMutationHeaders.get("X-CSRF-Token")).toBe(
            replacementToken,
        );
    });

    test("retries a 401 at most twice and only after reauthentication", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
            .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
            .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401));
        const reauthenticate = vi.fn().mockResolvedValue(true);
        const { apiRequest, setReauthenticationHandler } =
            await loadFreshClient();
        setReauthenticationHandler(reauthenticate);

        await expect(apiRequest("/auth/session")).rejects.toMatchObject({
            status: 401,
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(reauthenticate).toHaveBeenCalledTimes(2);
    });

    test("replays the unchanged scouting mutation after reauthentication", async () => {
        const scoutingBody = {
            path: "3464/12",
            data: { teamNumber: 3464, matchNumber: 12 },
        };
        const fetchMock = vi.mocked(fetch);
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ csrfToken: SIGNED_CSRF_TOKEN }))
            .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
            .mockResolvedValueOnce(jsonResponse({ saved: true }));
        const reauthenticate = vi.fn().mockResolvedValue(true);
        const { apiRequest, setReauthenticationHandler } =
            await loadFreshClient();
        setReauthenticationHandler(reauthenticate);

        await expect(
            apiRequest("/write", {
                method: "POST",
                body: scoutingBody,
            }),
        ).resolves.toEqual({ saved: true });

        expect(reauthenticate).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
            JSON.stringify(scoutingBody),
        );
        expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(
            JSON.stringify(scoutingBody),
        );
    });

    test("does not reauthenticate credential failures when disabled", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(
            jsonResponse({ message: "Invalid email or password" }, 401),
        );
        const reauthenticate = vi.fn().mockResolvedValue(true);
        const { apiRequest, setReauthenticationHandler } =
            await loadFreshClient();
        setReauthenticationHandler(reauthenticate);

        await expect(
            apiRequest("/auth/login", {
                method: "POST",
                body: { email: "scout@example.com", password: "private" },
                retryAfterReauthentication: false,
            }),
        ).rejects.toMatchObject({ status: 401 });
        expect(reauthenticate).not.toHaveBeenCalled();
    });

    test("retries transient GET failures twice", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock
            .mockRejectedValueOnce(new TypeError("network unavailable"))
            .mockResolvedValueOnce(jsonResponse({ message: "unavailable" }, 503))
            .mockResolvedValueOnce(jsonResponse({ ok: true }));
        const { apiRequest } = await loadFreshClient();

        await expect(apiRequest("/health")).resolves.toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    test("does not retry mutation network failures", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ csrfToken: SIGNED_CSRF_TOKEN }))
            .mockRejectedValueOnce(new TypeError("response lost"));
        const { apiRequest } = await loadFreshClient();

        await expect(
            apiRequest("/write", {
                method: "POST",
                body: { path: "123/1", data: {} },
            }),
        ).rejects.toMatchObject({ status: null });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
