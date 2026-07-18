import admin from "firebase-admin";

/**
 * Initializes Firebase Admin once and returns the services used by the API.
 *
 * Development reloaders and serverless runtimes can evaluate application code
 * more than once in the same process. Checking the Admin SDK's app collection
 * prevents a duplicate-app error while ensuring every caller receives the same
 * Firebase services. The service-account value must never be logged because it
 * contains private credentials.
 *
 * The optional SDK argument is used only by unit tests so they never connect to
 * a real Firebase project.
 *
 * @param {string | undefined} serviceAccountKey JSON service-account configuration.
 * @param {typeof admin} [firebaseAdmin=admin] Firebase Admin SDK implementation.
 * @returns {{auth: ReturnType<typeof admin.auth>, db: ReturnType<typeof admin.firestore>}}
 * Firebase Authentication and Firestore services.
 * @throws {SyntaxError} When the service-account value is not valid JSON.
 */
export function initializeFirebase(
    serviceAccountKey,
    firebaseAdmin = admin,
) {
    if (firebaseAdmin.apps.length === 0) {
        const serviceAccount = JSON.parse(serviceAccountKey);

        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount),
        });
    }

    return {
        auth: firebaseAdmin.auth(),
        db: firebaseAdmin.firestore(),
    };
}
