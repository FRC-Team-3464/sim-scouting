import app from "../backend/app.js";

/**
 * Concrete Vercel Function entry point for the Express API.
 *
 * Vercel rewrites every /api request to this function while preserving the
 * browser's original URL, allowing the existing Express routes (for example,
 * /api/auth/login and /api/write) to run unchanged. Express continues to own
 * validation, authentication, CSRF protection, and operational logging.
 */
export default app;
