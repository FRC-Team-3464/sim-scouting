import React, {useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { readCookie, deleteCookie } from "../scripts/user";
import { API_BASE_URL } from "../scripts/config";

// Debug mode
const de = async (): Promise<boolean> => {
    const user = readCookie("uid");
    const response = await fetch(`${API_BASE_URL}/debug`, {
        method: "GET",
    });
    let rawWhiteList = await response.json();

    let whiteList = rawWhiteList.value.split(",").map((s: string) => s.trim());
    return whiteList.includes(user);
};


let debug = await de();

export { debug };


const signedIn = readCookie("user");


const Home: React.FC = () => {

    const navigate = useNavigate();

    const goToMatchForm = () => {
        navigate("/match");
    };
    const goToLocalStorage = () => {
        navigate("/stored");
    };
    const goToPitScoutingForm = () => {
        navigate("/pitscouting");
    };
    const signOut = () => {
        deleteCookie("user");
        navigate("/login");
    };
    useEffect(() => {
        // useEffect to run after component mounts
        if (readCookie("user") == undefined) {
            navigate("/login");
        }
    }, []);
    return (
        <div className="flex flex-col items-center justify-center space-y-6">
            <h1 className="font-bold text-white text-4xl underline">
                {readCookie("user") === undefined
                    ? "Welcome to Sim-scouting!"
                    : "Welcome to Sim-scouting, " + readCookie("user")}
            </h1>

            <p className="text-gray-200 text-center w-full max-w-xl">
                At Sim-City, we realized effective scouting requires simple
                technology, which is why we created Sim-Scouting to simplify the
                scouting experience.
            </p>

            <div>
                {debug && (
                    <a className="font-small text-red-500 text-2xl px-4 py-3 rounded-2xl">
                        ⚠ debug mode on ⚠
                    </a>
                )}
            </div>

            <button
                className="bg-sky-600 font-medium text-white text-3xl px-4 py-3 rounded-2xl hover:bg-sky-700 transition-colors"
                onClick={goToMatchForm}
            >
                Scout!
            </button>
            <button
                className="bg-green-600 font-medium text-white text-3xl px-4 py-3 rounded-2xl hover:bg-green-700 transition-colors"
                onClick={goToLocalStorage}
            >
                View Local Data
            </button>
            <button
                className="bg-rose-600 font-medium text-white text-3xl px-4 py-3 rounded-2xl hover:bg-rose-700 transition-colors"
                onClick={goToPitScoutingForm}
            >
                Pit scouting
            </button>
            {signedIn && (
                <button
                    className="bg-slate-600 font-medium text-white text-3xl px-4 py-3 rounded-2xl hover:bg-slate-700 transition-colors"
                    onClick={signOut}
                >
                    Sign out
                </button>
            )}
        </div>
    );
};

export default Home;
