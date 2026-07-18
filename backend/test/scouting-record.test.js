import assert from "node:assert/strict";
import test from "node:test";

import {
    createAuthenticatedScoutingRecord,
    isSharedTeamIndexPath,
} from "../data/scouting-record.js";

test("scouting records discard spoofed identity and role fields", () => {
    const timestamp = { serverTimestamp: true };
    const record = createAuthenticatedScoutingRecord(
        {
            teamNumber: 3464,
            matchNumber: 12,
            notes: "Strong defense",
            name: "Spoofed Name",
            uid: "spoofed-uid",
            scoutName: "Another Scout",
            scoutUid: "another-uid",
            submittedAt: "browser timestamp",
            debug: true,
            role: "administrator",
            roles: ["administrator"],
        },
        {
            uid: "verified-uid",
            email: "verified@example.com",
            name: "Verified Scout",
        },
        () => timestamp,
    );

    assert.deepEqual(record, {
        teamNumber: 3464,
        matchNumber: 12,
        notes: "Strong defense",
        scoutUid: "verified-uid",
        scoutName: "Verified Scout",
        submittedAt: timestamp,
    });
});

test("scouting attribution falls back to verified email and then UID", () => {
    const emailRecord = createAuthenticatedScoutingRecord(
        { teamNumber: 1 },
        { uid: "email-uid", email: "scout@example.com" },
        () => "timestamp",
    );
    const uidRecord = createAuthenticatedScoutingRecord(
        { teamNumber: 2 },
        { uid: "uid-only" },
        () => "timestamp",
    );

    assert.equal(emailRecord.scoutName, "scout@example.com");
    assert.equal(uidRecord.scoutName, "uid-only");
});

test("only the exact shared team index path skips scouting attribution", () => {
    assert.equal(isSharedTeamIndexPath("datas/data"), true);
    assert.equal(isSharedTeamIndexPath("3464/12"), false);
    assert.equal(isSharedTeamIndexPath("pitScouting/3464"), false);
});
