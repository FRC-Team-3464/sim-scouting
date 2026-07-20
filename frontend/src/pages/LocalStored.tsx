import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { writeToDb } from "../api/scouting";
import ReactJsonView from "@microlink/react-json-view";
import seedDataBase from "../scripts/seed";
import IntegerInput from "../components/IntegerInput";
import { useAuthentication } from "../auth/use-authentication";
import { APP_ROUTES } from "../routes";

interface ActionComponentProps {
    onSubmit: () => void;
    onDelete: () => void;
    clear: () => void;
}

const ActionComponent: React.FC<ActionComponentProps> = ({
    onSubmit,
    onDelete,
    clear,
}) => {
    const navigate = useNavigate();
    const goBack = () => {
        navigate(APP_ROUTES.home);
    };

    return (
        <div className="flex flex-col justify-center items-center">
            <div className="flex flex-row justify-center items-center h-1/1 space-x-32 pt-6">
                <button
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-2xl shadow w-19/100"
                    onClick={onSubmit}
                >
                    Submit
                </button>

                <button
                    className="bg-red-600 hover:bg-red-700 text-white font-bold w-2/5 py-2 px-6 rounded-2xl shadow w-19/100"
                    onClick={onDelete}
                >
                    Delete
                </button>
                <button
                    className="bg-blue-600 text-white font-bold py-2 px-6 rounded-2xl shadow w-19/100"
                    onClick={goBack}
                >
                    Back
                </button>
            </div>

            <div className="w-full flex justify-center items-center">
                            <div className="w-1/38">
            </div>
                <button
                    className="bg-red-800 text-white font-bold w-5/5 py-2 px-6 rounded-2xl shadow w-37/200"
                    onClick={clear}
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

const LocalStorageView: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthentication();
    const debug = user?.debug === true;
    const goBack = () => {
        navigate(APP_ROUTES.home);
    };

    const [seedNumber, setSeedNumber] = useState(1);

    const [show, setShow] = React.useState<boolean>(true);
    const [keys, setKeys] = React.useState<string[]>([]);
    const [selectedKey, setSelectedKey] = React.useState<string>("");
    const [value, setValue] = React.useState<string>("");

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            setKeys(Object.keys(localStorage));
        }
    }, []);

    const loadItem = () => {
        if (!selectedKey) return;
        const v = localStorage.getItem(selectedKey);
        setValue(v ?? "");
    };

    const deleteItem = () => {
        if (!selectedKey) return;
        localStorage.removeItem(selectedKey);
        setValue("");
        setKeys(Object.keys(localStorage));
    };
    
    const clear = () => {
        if (window.confirm("Are you sure you want to clear local storage?")){
            for (let i = 0; i<localStorage.length; i++){
                setSelectedKey
                localStorage.removeItem(keys[i]);
                setValue("");
                setKeys(Object.keys(localStorage));
            }
        }
    }

    const submitItem = () => {
        if (!selectedKey) return;
        let json = JSON.parse(value);
        writeToDb(
            `${json.teamNumber?.toString()}/${json.matchNumber?.toString()}`,
            json,
        );
    };

    const seed = () => {
        const seedJson = seedDataBase();
        console.log(seedJson);
        writeToDb(
            `${seedNumber.toString()}/${seedJson.matchNumber?.toString()}`,
            seedJson,
        );
        console.log("Attemped to seed.");
    }


    const buttonStyle: string =
        "bg-sky-600 text-white font-semibold text-xl px-2 py-2 rounded-full hover:bg-sky-700 transition-colors h-15 w-35";


    return (
        <div className="flex flex-col items-center justify-start space-y-6 pt-12">
            
            <button className={buttonStyle} onClick={goBack}>
                Back
            </button>

            <h1 className="font-bold text-white text-4xl">
                LocalStorage Viewer{" "}
            </h1>
            <p className="font-bold text-white">
                scoutData-(teamNumber)-(matchNumber)
            </p>
            <div className="flex flex-col items-center space-y-4 pb-8">
                <h2 className="text-white text-xl">
                    Select a key to view/edit
                </h2>

                <select
                    className="bg-gray-800 text-white px-4 py-2 rounded-xl"
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                >
                    <option value="">-- Select Key --</option>
                    {keys.map((k) => (
                        <option key={k} value={k}>
                            {k}
                        </option>
                    ))}
                </select>

                <button
                    onClick={loadItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
                >
                    Load from localStorage
                </button>

                {show ? (
                    <ReactJsonView
                        src={(() => {
                            try {
                                return JSON.parse(value) || {};
                            } catch (e) {
                                return {};
                            }
                        })()}
                        theme={"monokai"}
                    />
                ) : null}
                <p className="text-white">
                    Make sure the textbox above has a value before submitting or
                    deleting
                </p>
            </div>

            <ActionComponent onSubmit={submitItem} onDelete={deleteItem} clear={clear} />

            {debug ? (
                <div>
                    <IntegerInput
                        min={0}
                        max={9999}
                        placeholder="9999"
                        label="Seed number"
                        onChange={setSeedNumber}
                        value={seedNumber}
                    />

                    <button
                        onClick={seed}
                        className="bg-violet-600 hover:bg-violet-800 text-white px-4 py-2 rounded-xl"
                    >
                        Seed, DO NOT SPAM!!
                    </button>
                </div>
            ) : null}
            {/*<button
                onClick={seedMulti}
                className="bg-pink-700 hover:bg-pink-900 text-white px-4 py-2 rounded-xl"
            >
                 Seed 20 ⚠️⚠️⚠️DO NOT SPAM ⚠️⚠️⚠️
            </button>*/}
        </div>
    );
};

export default LocalStorageView;
