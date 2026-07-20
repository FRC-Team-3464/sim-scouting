import app, { port } from "./app.js";

/**
 * Starts the long-running HTTP listener used by local development and by
 * traditional Node hosting. Vercel does not execute this file; its function
 * entry point imports backend/app.js and invokes Express per request.
 */
app.listen(port, () => {
    console.log(`Sim City Scouting API running on http://localhost:${port}`);
});
