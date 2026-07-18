import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";

const environment = process.env.NODE_ENV || "development";

// Load the selected environment first, then use .env as an optional fallback.
// Existing shell/hosting environment variables always take precedence.
dotenv.config({
    path: [`.env.${environment}`, ".env"],
});

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
const router = express.Router();
const PORT = Number(process.env.PORT);
const corsAllowedOrigin = process.env.CORS_ALLOWED_ORIGIN;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error(
        "PORT must be configured as an integer between 1 and 65535",
    );
}

if (!corsAllowedOrigin) {
    throw new Error("CORS_ALLOWED_ORIGIN must be configured");
}

app.use(express.json());
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
        "Content-Type, Authorization",
    );

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
    const { path } = req.body;
    try {
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
    } catch (error) {
        console.error(error);
        res.status(500).send(`Error: ${error.message}`);
    }
};

router.get("/debug", async (req, res) => {
    res.status(200).json({
        value: "2tjqIwBuqNdsptLzSysO8wq0WUB3,ShL4NcaaGMNWxbvyIx8he1g5N5E2",
    });
});

router.post("/write", async (req, res) => {
    try {
        const { path, data } = req.body;

        if (!path || !data) {
            return res.status(400).send("Missing required fields");
        }

        const pathSegments = path.split("/");
        const docRef = db.doc(pathSegments.join("/"));
        await docRef.set(data, { merge: true });

        res.send("Data written successfully");
    } catch (error) {
        console.error(`Error writing data: ${error.message}`);
        res.status(500).send(`Error: ${error.message}`);
    }
});

router.post("/read", read);

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send("Email and password are required");
        }

        const userRecord = await admin.auth().getUserByEmail(email);

        const customToken = await admin
            .auth()
            .createCustomToken(userRecord.uid);

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
        const userRecord = await admin.auth().createUser({
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

app.use("/api", router); // floyd

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
