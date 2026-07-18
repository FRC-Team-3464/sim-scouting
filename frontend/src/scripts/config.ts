const configuredApiUrl = import.meta.env.VITE_API_BASE_URL;

if (!configuredApiUrl) {
    throw new Error("VITE_API_BASE_URL is not configured");
}

// Normalize the value so callers can safely append endpoint paths.
export const API_BASE_URL = configuredApiUrl.replace(/\/$/, "");
