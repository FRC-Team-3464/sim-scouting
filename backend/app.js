import express from "express";
import cookieParser from "cookie-parser";
import { FieldValue } from "firebase-admin/firestore";
import { loadConfiguration } from "./config.js";
import { initializeFirebase } from "./firebase.js";
import {
    createAuthenticatedScoutingRecord,
    isSharedTeamIndexPath,
} from "./data/scouting-record.js";
import { createCsrfProtection } from "./middleware/csrf.js";
import { createRequireAuthentication } from "./middleware/require-authentication.js";
import { createAuthenticationRouter } from "./routes/auth.js";

const configuration = loadConfiguration();
const { auth, db } = initializeFirebase(configuration.serviceAccountKey);

const app = express();
const router = express.Router();
const authenticationRouter = createAuthenticationRouter({
    auth,
    configuration,
});
const csrfProtection = createCsrfProtection({ configuration });
const requireAuthentication = createRequireAuthentication({ auth });
const PORT = configuration.port;
const corsAllowedOrigin = configuration.corsAllowedOrigin;

app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
    res.setHeader(
        "Access-Control-Allow-Origin",
        corsAllowedOrigin,
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS",
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-CSRF-Token",
    );
    // Credentialed CORS is required during local development because Vite and
    // Express use different origins and the browser must include auth/CSRF
    // cookies. Production routes React and /api through one Vercel origin, so
    // browsers do not need cross-origin permission there.
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Handle the preflight request
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    next();
});

async function sha256(message) {
    // Encode the message as a Uint8Array (UTF-8 is standard)
    const msgBuffer = new TextEncoder().encode(message);

    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

    // Convert the ArrayBuffer to a hexadecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => ("00" + b.toString(16)).slice(-2))
        .join("");

    return hashHex;
}
const read = async (req, res) => {
    try {
        const { path } = req.body || {};

        if (!path) {
            return res.status(400).send("Missing required fields");
        }
        const pathSegments = path.split("/");
        const docRef = db.doc(pathSegments.join("/"));
        const snapshot = await docRef.get();

        if (!snapshot.exists) {
            return res.status(404).send("Document not found");
        }
        res.json(snapshot.data());
    } catch {
        console.error("Firestore read failed", {
            route: "POST /api/read",
            status: 500,
            category: "FIRESTORE_READ_FAILED",
            uid: req.user?.uid,
        });
        res.status(500).send("Unable to read data");
    }
};

router.post(
    "/write",
    requireAuthentication,
    csrfProtection.protectJsonRequest,
    async (req, res) => {
        try {
            const { path, data } = req.body || {};

            if (!path || !data) {
                return res.status(400).send("Missing required fields");
            }

            const pathSegments = path.split("/");
            const docRef = db.doc(pathSegments.join("/"));
            const documentData = isSharedTeamIndexPath(path)
                ? data
                : createAuthenticatedScoutingRecord(
                    data,
                    req.user,
                    () => FieldValue.serverTimestamp(),
                );
            await docRef.set(documentData, { merge: true });

            res.send("Data written successfully");
        } catch {
            console.error("Firestore write failed", {
                route: "POST /api/write",
                status: 500,
                category: "FIRESTORE_WRITE_FAILED",
                uid: req.user?.uid,
            });
            res.status(500).send("Unable to write data");
        }
    },
);

router.post("/read", requireAuthentication, read);

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send("Email and password are required");
        }

        const userRecord = await auth.getUserByEmail(email);

        const customToken = await auth.createCustomToken(userRecord.uid);

        const identifier = userRecord.displayName || userRecord.uid;

        const docRef = db.doc(`auth/${identifier}`);
        const snapshot = await docRef.get();

        let hashedData = null;
        if (snapshot.exists) {
            hashedData = snapshot.data();
        }
        hashedData = hashedData.hashed.trim();
        const hashpassword = await sha256(password.trim());
        if (hashpassword == hashedData) {
            res.status(200).json({
                message: "Login successful",
                customToken,
                uid: userRecord.uid,
                email: userRecord.email,
                name: userRecord.displayName,
            });
        } else {
            res.status(401).json({
                message: "invalid password"
            });
        }
    } catch (error) {
        console.error("Login Error:", error);
        if (error.code === "auth/user-not-found") {
            return res.status(401).send("Invalid email or password");
        }
        res.status(500).send(`Error: ${error.message}`);
    }
});

router.post("/register", async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).send("Email and password are required");
        }
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });
        res.status(201).json({
            message: "User created successfully",
            uid: userRecord.uid,
            email: userRecord.email,
            name: userRecord.displayName,
        });
    } catch (error) {
        console.error(error);
        if (error.code === "auth/email-already-exists") {
            return res.status(400).send("Email already in use");
        }
        if (error.code === "auth/invalid-email") {
            return res.status(400).send("Invalid email address");
        }
        if (error.code === "auth/weak-password") {
            return res.status(400).send("Password is too weak");
        }
        res.status(500).send(`Error: ${error.message}`);
    }
});

app.use("/api/auth", authenticationRouter);
app.use("/api", router); // floyd

// Vercel imports the Express application as a serverless request handler,
// while backend/server.js starts the same application for local development.
// Keeping app construction separate from app.listen() prevents a serverless
// function import from opening a second, long-running network listener.
export { app, PORT as port };
export default app;
