import { generateCookie } from "./user";
import { API_BASE_URL } from "./config";

const LINK = API_BASE_URL;

async function sha256(message: string) {
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

async function writeData(path: string, data: any) {
    // mustard
    try {
        let body = {
            path: path,
            data: data,
        };
        const response = await fetch(LINK + "/write", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        return true;
    } catch (err) {
        console.error("Error writing document:", err);
        alert(
            "An error occured: your data has been saved locally but not uploaded.",
        );
        return false;
    }
}
export async function writeToDb(path: string, data: any) {
    let p = await readDoc("/datas/data");
    p = p.team;
    if (p && !p.includes(data.teamNumber)) {
        p.push(data.teamNumber);
        await writeData("datas/data", {
            team: p,
        });
    }
    return await writeData(path, data);
}
export async function readDoc(path: string): Promise<any> {
    try {
        const response = await fetch(LINK + "/read", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: path }),
        });
        // Check if the server actually responded successfully
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        return data; // This sends the data back to whoever called readDoc()
    } catch (error) {
        console.error("Error reading document:", error);
        throw error;
    }
}

export async function registerUser(
    email: string,
    password: string,
    name: string,
) {
    try {
        const response = await fetch(LINK + "/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: email,
                password: password,
                name: name,
            }),
        });
        if (!response.ok) {
            alert(`error: ${response.status}`);
            window.location.href = "/signup"
        }
        const data = await response.json();
        const hashed = await sha256(password);
        writeData(`auth/${name}`, { hashed: hashed });
        generateCookie("user", data.name, 7);
        
        window.location.href = "/";
    } catch (error) {
        console.error("Error registering user:", error);
        alert("Registration failed. Please try again.");
    }
}

export async function loginUser(email: string, password: string) {
    try {
        const response = await fetch(LINK + "/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: email,
                password: password,
            }),
        });
        let res = response.status;
        if (res == 200) {
            let data = await response.json();
            generateCookie("user", data.name, 7);
            generateCookie("uid", data.uid, 7);
            window.location.href = "/";
        } else {
            if (res == 401) {
                alert("Password or email invalid");
            } else {
                alert("not good");
                window.location.href = "/login";
            }
        }
    } catch (err) {
        console.error(err);
    }
}
