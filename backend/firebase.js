import {
    cert,
    getApps,
    initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Modular Firebase Admin functions used by the application.
 *
 * Keeping these functions in one small object lets unit tests supply local
 * test doubles without loading credentials or contacting Firebase.
 */
const firebaseAdminSdk = {
    cert,
    getApps,
    getAuth,
    getFirestore,
    initializeApp,
};

/**
 * Initializes Firebase Admin once and returns the services used by the API.
 *
 * Development reloaders and serverless runtimes can evaluate application code
 * more than once in the same process. Checking the Admin SDK's app collection
 * prevents a duplicate-app error while ensuring every caller receives the same
 * Firebase services. The service-account value must never be logged because it
 * contains private credentials.
 *
 * Firebase Admin 14 exposes service-specific module functions instead of the
 * older shared namespace. The optional SDK-functions argument is used only by
 * unit tests so they never connect to a real Firebase project.
 *
 * @param {string | undefined} serviceAccountKey JSON service-account configuration.
 * @param {typeof firebaseAdminSdk} [sdk=firebaseAdminSdk] Modular Firebase Admin functions.
 * @returns {{
 *   auth: import("firebase-admin/auth").Auth,
 *   db: import("firebase-admin/firestore").Firestore,
 * }}
 * Firebase Authentication and Firestore services.
 * @throws {SyntaxError} When the service-account value is not valid JSON.
 */
export function initializeFirebase(
    serviceAccountKey,
    sdk = firebaseAdminSdk,
) {
    if (sdk.getApps().length === 0) {
        const serviceAccount = JSON.parse(serviceAccountKey);

        sdk.initializeApp({
            credential: sdk.cert(serviceAccount),
        });
    }

    return {
        auth: sdk.getAuth(),
        db: sdk.getFirestore(),
    };
}
