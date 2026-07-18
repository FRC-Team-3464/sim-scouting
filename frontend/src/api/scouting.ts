/**
 * Existing Firestore read/write workflows expressed through the shared client.
 *
 * The generic paths and team-index behavior are intentionally preserved until
 * a later backend chunk introduces protected, purpose-specific data routes.
 */

import { ApiError, apiRequest } from "./client";

type ScoutingRecord = Record<string, unknown> & {
    teamNumber?: number;
};

/**
 * Logs a safe operational category without serializing data or API responses.
 *
 * @param operation Human-readable operation category.
 * @param error Request failure.
 */
function logScoutingFailure(operation: string, error: unknown): void {
    console.error(operation, {
        status: error instanceof ApiError ? error.status : null,
        category: error instanceof ApiError ? error.name : "UNEXPECTED_ERROR",
    });
}

/**
 * Writes one document through the legacy generic backend endpoint.
 *
 * @param path Existing caller-selected Firestore document path.
 * @param data Existing scouting document fields.
 * @returns Whether the backend confirmed the write.
 */
async function writeData(
    path: string,
    data: Record<string, unknown>,
): Promise<boolean> {
    try {
        await apiRequest<string>("/write", {
            method: "POST",
            body: { path, data },
        });
        return true;
    } catch (error) {
        logScoutingFailure("Scouting write failed", error);
        alert(
            "An error occurred: your data has been saved locally but not uploaded.",
        );
        return false;
    }
}

/**
 * Preserves the existing team-index update before writing a scouting record.
 *
 * @param path Existing destination document path.
 * @param data Scouting data already saved locally by the form.
 * @returns Whether the final scouting document write succeeded.
 */
export async function writeToDb(
    path: string,
    data: ScoutingRecord,
): Promise<boolean> {
    const teamIndex = await readDoc<{ team?: number[] }>("/datas/data");
    const teams = teamIndex.team;

    if (
        teams &&
        data.teamNumber !== undefined &&
        !teams.includes(data.teamNumber)
    ) {
        teams.push(data.teamNumber);
        await writeData("datas/data", { team: teams });
    }

    return writeData(path, data);
}

/**
 * Reads one document through the unchanged generic backend endpoint.
 *
 * Safe GET-style retry is not available because the legacy endpoint itself is
 * POST. The request can still be replayed after a successful reauthentication.
 *
 * @template T Expected document representation.
 * @param path Existing caller-selected Firestore document path.
 * @returns Parsed Firestore document.
 * @throws {ApiError} When the backend rejects or cannot complete the read.
 */
export async function readDoc<T = unknown>(path: string): Promise<T> {
    try {
        return await apiRequest<T>("/read", {
            method: "POST",
            body: { path },
        });
    } catch (error) {
        logScoutingFailure("Scouting read failed", error);
        throw error;
    }
}

