import assert from "node:assert/strict";
import test from "node:test";

import { initializeFirebase } from "../firebase.js";

/**
 * Creates the smallest Firebase Admin test double needed by the initializer.
 * No real credentials, network calls, or Firebase projects are involved.
 *
 * @returns {{firebaseAdmin: object, calls: {cert: number, initializeApp: number}}}
 * Test SDK and observable initialization counts.
 */
function createFirebaseAdminTestDouble() {
    const calls = {
        cert: 0,
        initializeApp: 0,
    };
    const authService = { name: "authentication-test-service" };
    const firestoreService = { name: "firestore-test-service" };
    const firebaseAdmin = {
        apps: [],
        credential: {
            cert(serviceAccount) {
                calls.cert += 1;
                return { serviceAccount };
            },
        },
        initializeApp(options) {
            calls.initializeApp += 1;
            this.apps.push({ options });
        },
        auth() {
            return authService;
        },
        firestore() {
            return firestoreService;
        },
    };

    return { firebaseAdmin, calls, authService, firestoreService };
}

test("initializeFirebase initializes the Admin SDK only once", () => {
    const {
        firebaseAdmin,
        calls,
        authService,
        firestoreService,
    } = createFirebaseAdminTestDouble();
    const serviceAccountKey = JSON.stringify({
        project_id: "unit-test-project",
    });

    const firstServices = initializeFirebase(
        serviceAccountKey,
        firebaseAdmin,
    );
    const secondServices = initializeFirebase(
        serviceAccountKey,
        firebaseAdmin,
    );

    assert.equal(calls.cert, 1);
    assert.equal(calls.initializeApp, 1);
    assert.equal(firstServices.auth, authService);
    assert.equal(firstServices.db, firestoreService);
    assert.equal(secondServices.auth, authService);
    assert.equal(secondServices.db, firestoreService);
});

test("initializeFirebase rejects malformed service-account JSON", () => {
    const { firebaseAdmin } = createFirebaseAdminTestDouble();

    assert.throws(
        () => initializeFirebase("not-json", firebaseAdmin),
        SyntaxError,
    );
});
