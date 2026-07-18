import app from "../backend/app.js";

/**
 * Vercel Function entry point for every request below /api.
 *
 * The catch-all filename preserves the complete request path, allowing the
 * existing Express routes (for example, /api/auth/login and /api/write) to run
 * unchanged. Express owns request validation, authentication, CSRF checks,
 * safe operational logging, and API response headers.
 */
export default app;
