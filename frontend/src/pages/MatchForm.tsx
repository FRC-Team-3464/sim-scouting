import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BinaryChoice from "../components/BinaryChoice";
import MultiCounterInput from "../components/MultiCounterInput";
import IntegerInput from "../components/IntegerInput";
import Dropdown from "../components/Dropdown";
import AutoResizeTextarea from "../components/AutoResizeTextArea";
import CheckboxDropdown from "../components/CheckboxDropdown";
import { writeToDb } from "../api/scouting";
import { useAuthentication } from "../auth/use-authentication";

const MatchForm: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthentication();
    const debug = user?.debug === true;
    const goBack = () => {
        navigate("/");
    };
    const [section, setSection] = useState<
        "setup" | "auto" | "teleop" | "endgame" | "errors"
    >("setup");

    type checkboxDropdownList = Record<string, boolean>;

    const [showCheckboxes, setShowCheckboxes] = useState<boolean>(false);
    // this boolean is used to show a message if the data was not sent
    const [sent, setSent] = useState<boolean>(true);
    // Setup values
    const [scoutingTeam, setScoutingTeam] = useState(0);
    const [eventName, setEventName] = useState<string>("");
    const [teamNumber, setTeamNumber] = useState(0);
    const [matchNumber, setMatchNumber] = useState(0);

    // Auto values
    const [autoFuel, setAutoFuel] = useState(0);
    const [autoClimbed, setAutoClimbed] = useState(false);
    const [autoHoardedFuel, setautoHoardedFuel] = useState(false);

    // Teleop values
    const [teleopShift, setTeleopShift] = useState(0);

    const [transitionFuel, setTransitionFuel] = useState(0);
    const [shift1HubActive, setShift1HubActive] = useState(false);
    const [shift2HubActive, setShift2HubActive] = useState(true);
    const [shift3HubActive, setShift3HubActive] = useState(false);
    const [shift4HubActive, setShift4HubActive] = useState(true);

    const [shift1Fuel, setShift1Fuel] = useState(0);
    const [shift2Fuel, setShift2Fuel] = useState(0);
    const [shift3Fuel, setShift3Fuel] = useState(0);
    const [shift4Fuel, setShift4Fuel] = useState(0);

    const [transitionCollected, setTransitionCollected] = useState(false);
    const [shift1Collected, setShift1Collected] = useState(false);
    const [shift2Collected, setShift2Collected] = useState(false);
    const [shift3Collected, setShift3Collected] = useState(false);
    const [shift4Collected, setShift4Collected] = useState(false);

    const [shift1Defense, setShift1Defense] = useState(false);
    const [shift2Defense, setShift2Defense] = useState(false);
    const [shift3Defense, setShift3Defense] = useState(false);
    const [shift4Defense, setShift4Defense] = useState(false);

    const [shift1HoardedFuel, setShift1HoardedFuel] = useState(false);
    const [shift2HoardedFuel, setShift2HoardedFuel] = useState(false);
    const [shift3HoardedFuel, setShift3HoardedFuel] = useState(false);
    const [shift4HoardedFuel, setShift4HoardedFuel] = useState(false);

    // Endgame values
    const [endgameFuel, setEndgameFuel] = useState(0);
    const [endgameClimbLevel, setEndgameClimbLevel] = useState("0");

    const [notes, setNotes] = useState<string>("");

    // finale  values

    const [robotErrorsCheck, setRobotErrorsCheck] =
        useState<checkboxDropdownList>({
            "Intake issues": false,
            "Climb Failed": false,
            "Robot unresponsive": false,
            "Robot part fell off": false,
            "Did not participate": false,
            "Auto stop": false,
            "Robot could not get off after climb": false,
            Other: false,
        });

    const [crossedBump, setCrossedBump] = useState(false);
    const [underTrench, setUnderTrench] = useState(false);

    const events = ["NE District Minuteman Event", "NE District URI Event"];

    const switchShifts = () => {
        setShift1HubActive(!shift1HubActive);
        setShift2HubActive(!shift2HubActive);
        setShift3HubActive(!shift3HubActive);
        setShift4HubActive(!shift4HubActive);
    };

    function switchShiftsBetter(buttonPressed: boolean) {
        if (buttonPressed) {
            if (!shift1HubActive) {
                switchShifts();
            }
        } else {
            if (shift1HubActive) {
                switchShifts();
            }
        }
    }
    function switchShiftsBetter2(buttonPressed: boolean) {
        if (buttonPressed) {
            if (!shift2HubActive) {
                switchShifts();
            }
        } else {
            if (shift2HubActive) {
                switchShifts();
            }
        }
    }
    function switchShiftsBetter3(buttonPressed: boolean) {
        if (buttonPressed) {
            if (!shift3HubActive) {
                switchShifts();
            }
        } else {
            if (shift3HubActive) {
                switchShifts();
            }
        }
    }
    function switchShiftsBetter4(buttonPressed: boolean) {
        if (buttonPressed) {
            if (!shift4HubActive) {
                switchShifts();
            }
        } else {
            if (shift4HubActive) {
                switchShifts();
            }
        }
    }

    const robotErrors = [
        "Intake issues",
        "Climb Failed",
        "Robot unresponsive",
        "Robot part fell off",
        "Did not participate",
        "Auto stop",
        "Robot could not get off after climb",
        "Other",
    ];

    let samjohn: Record<string, boolean> = {
        "Intake issues": false,
        "Climb Failed": false,
        "Robot unresponsive": false,
        "Robot part fell off": false,
        "Did not participate": false,
        "Auto stop": false,
        "Robot could not get off after climb": false,
        Other: false,
    };

    async function submitData() {
        //make sure certain fields are filled out
        let check: boolean =
            eventName !== "" && teamNumber !== null && matchNumber !== null;

        const data = {
            scoutingTeam: scoutingTeam,
            eventName: eventName,
            teamNumber: teamNumber,
            matchNumber: matchNumber,

            autoFuel: autoFuel,
            autoClimbed: autoClimbed,
            autoHoardedFuel: autoHoardedFuel,

            shift1HubActive: shift1HubActive,
            shift2HubActive: shift2HubActive,
            shift3HubActive: shift3HubActive,
            shift4HubActive: shift4HubActive,

            transitionCollected: transitionCollected,
            shift1Collected: shift1Collected,
            shift2Collected: shift2Collected,
            shift3Collected: shift3Collected,
            shift4Collected: shift4Collected,

            transitionFuel: transitionFuel,
            shift1Fuel: shift1Fuel,
            shift2Fuel: shift2Fuel,
            shift3Fuel: shift3Fuel,
            shift4Fuel: shift4Fuel,

            shift1Defense: shift1Defense,
            shift2Defense: shift2Defense,
            shift3Defense: shift3Defense,
            shift4Defense: shift4Defense,

            shift1HoardedFuel: shift1HoardedFuel,
            shift2HoardedFuel: shift2HoardedFuel,
            shift3HoardedFuel: shift3HoardedFuel,
            shift4HoardedFuel: shift4HoardedFuel,

            endgameFuel: endgameFuel,
            endgameClimbLevel: endgameClimbLevel,

            crossedBump: crossedBump,
            underTrench: underTrench,
            notes: notes,
            robotError: robotErrorsCheck,
        };

        /*
        The path for block of data will be submitted as follows:
        /{eventName}/{teamNumber}/{matchNumber}/{timestamp}, timestamp is not finished
        */
        if (!check && !debug) {
            alert("Please fill out all required fields before submitting.");
        } else {
            localStorage.setItem(
                `scoutData-${teamNumber}-${matchNumber}`,
                JSON.stringify(data),
            );
            setSent(false);
            let val = await writeToDb(
                `${teamNumber?.toString()}/${matchNumber?.toString()}`,
                data,
            );
            if (!val) {
                setSent(true);
            } else {
                setSent(false);
            }
            const pathname = window.location.pathname;
            if (pathname === "/match") {
                goBack();
            }
        }
    }

    const tab = (name: string) =>
        `px-5 py-2 rounded-full font-semibold transition-colors ${
            section === name
                ? "bg-sky-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`;
    const tab2 = (name: number) =>
        `px-5 py-2 rounded-full font-semibold transition-colors ${
            teleopShift === name
                ? "bg-sky-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`;

    let content = null;

    const buttonStyle: string =
        "bg-sky-600 text-white font-semibold text-xl px-2 py-2 rounded-full hover:bg-sky-700 transition-colors h-15 w-35";

    if (section === "setup") {
        content = (
            <>
                <Dropdown
                    label="Event"
                    placeholder={"Select event"}
                    value={eventName}
                    onChange={setEventName}
                    options={events}
                />
                <IntegerInput
                    value={scoutingTeam}
                    onChange={setScoutingTeam}
                    label={"Your team number"}
                    placeholder="e.g. 3464"
                    min={1}
                    max={99999}
                />
                <IntegerInput
                    value={matchNumber}
                    onChange={setMatchNumber}
                    label={"Match Number"}
                    placeholder="e.g. 42"
                    min={1}
                    max={99999}
                />
                <IntegerInput
                    value={teamNumber}
                    onChange={setTeamNumber}
                    label={"Team Number"}
                    placeholder="e.g. 3464"
                    min={1}
                    max={99999}
                />
            </>
        );
    } else if (section === "auto") {
        content = (
            <>
                <MultiCounterInput
                    min={0}
                    max={999}
                    value={autoFuel}
                    onChange={setAutoFuel}
                    label={"Auto fuel"}
                />
                <BinaryChoice
                    label={"Auto climb succeed?"}
                    options={["yes", "no"]}
                    value={autoClimbed}
                    onChange={setAutoClimbed}
                />
                <BinaryChoice
                    label={"Hoarded Fuel?"}
                    options={["yes", "no"]}
                    onChange={setautoHoardedFuel}
                    value={autoHoardedFuel}
                />
            </>
        );
    } else if (section === "teleop") {
        let shiftcontent = null;
        if (teleopShift === 0) {
            shiftcontent = (
                <>
                    <MultiCounterInput
                        min={0}
                        max={999}
                        value={transitionFuel}
                        onChange={setTransitionFuel}
                        label={"Transition Fuel"}
                    />
                    <p className="font-bold text-white text-l pb-1">
                        If the robot failed to lower from climb, state that in
                        the errors tab
                    </p>
                </>
            );
        } else if (teleopShift === 1) {
            shiftcontent = (
                <>
                    <BinaryChoice
                        label={"Hub Active?"}
                        options={["yes", "no"]}
                        onChange={switchShiftsBetter}
                        value={shift1HubActive}
                    />
                    <MultiCounterInput
                        min={0}
                        max={999}
                        value={shift1Fuel}
                        onChange={setShift1Fuel}
                        label={"Fuel"}
                    />
                    <BinaryChoice
                        label={"Collected from Neutral"}
                        options={["yes", "no"]}
                        value={shift1Collected}
                        onChange={setShift1Collected}
                    />
                    <BinaryChoice
                        label={"Played Defense?"}
                        options={["yes", "no"]}
                        onChange={setShift1Defense}
                        value={shift1Defense}
                    />
                    <BinaryChoice
                        label={"Hoarded Fuel?"}
                        options={["yes", "no"]}
                        onChange={setShift1HoardedFuel}
                        value={shift1HoardedFuel}
                    />
                </>
            );
        } else if (teleopShift === 2) {
            shiftcontent = (
                <>
                    <BinaryChoice
                        label={"Hub Active?"}
                        options={["yes", "no"]}
                        onChange={switchShiftsBetter2}
                        value={shift2HubActive}
                    />
                    <MultiCounterInput
                        min={0}
                        max={999}
                        value={shift2Fuel}
                        onChange={setShift2Fuel}
                        label={"Fuel"}
                    />
                    <BinaryChoice
                        label={"Collected from Neutral"}
                        options={["yes", "no"]}
                        value={shift2Collected}
                        onChange={setShift2Collected}
                    />
                    <BinaryChoice
                        label={"Played Defense?"}
                        options={["yes", "no"]}
                        onChange={setShift2Defense}
                        value={shift2Defense}
                    />
                    <BinaryChoice
                        label={"Hoarded Fuel?"}
                        options={["yes", "no"]}
                        onChange={setShift2HoardedFuel}
                        value={shift2HoardedFuel}
                    />
                </>
            );
        } else if (teleopShift === 3) {
            shiftcontent = (
                <>
                    <BinaryChoice
                        label={"Hub Active?"}
                        options={["yes", "no"]}
                        onChange={switchShiftsBetter3}
                        value={shift3HubActive}
                    />
                    <MultiCounterInput
                        min={0}
                        max={999}
                        value={shift3Fuel}
                        onChange={setShift3Fuel}
                        label={"Fuel"}
                    />
                    <BinaryChoice
                        label={"Collected from Neutral"}
                        options={["yes", "no"]}
                        value={shift3Collected}
                        onChange={setShift3Collected}
                    />
                    <BinaryChoice
                        label={"Played Defense?"}
                        options={["yes", "no"]}
                        onChange={setShift3Defense}
                        value={shift3Defense}
                    />
                    <BinaryChoice
                        label={"Hoarded Fuel?"}
                        options={["yes", "no"]}
                        onChange={setShift3HoardedFuel}
                        value={shift3HoardedFuel}
                    />
                </>
            );
        } else if (teleopShift === 4) {
            shiftcontent = (
                <>
                    <BinaryChoice
                        label={"Hub Active?"}
                        options={["yes", "no"]}
                        onChange={switchShiftsBetter4}
                        value={shift4HubActive}
                    />
                    <MultiCounterInput
                        min={0}
                        max={999}
                        value={shift4Fuel}
                        onChange={setShift4Fuel}
                        label={"Fuel"}
                    />
                    <BinaryChoice
                        label={"Collected from Neutral"}
                        options={["yes", "no"]}
                        value={shift4Collected}
                        onChange={setShift4Collected}
                    />
                    <BinaryChoice
                        label={"Played Defense?"}
                        options={["yes", "no"]}
                        onChange={setShift4Defense}
                        value={shift4Defense}
                    />
                    <BinaryChoice
                        label={"Hoarded Fuel?"}
                        options={["yes", "no"]}
                        onChange={setShift4HoardedFuel}
                        value={shift4HoardedFuel}
                    />
                </>
            );
        }
        content = (
            <div className="flex flex-col items-center justify-start pt-2.5 w-full">
                {/* Main Button Container */}
                <div className="flex flex-row flex-wrap justify-center gap-4 pb-5 max-w-[400px]">
                    <button
                        className={tab2(0)}
                        onClick={() => setTeleopShift(0)}
                    >
                        Tran
                    </button>
                    <button
                        className={tab2(1)}
                        onClick={() => setTeleopShift(1)}
                    >
                        Shift 1
                    </button>
                    <button
                        className={tab2(2)}
                        onClick={() => setTeleopShift(2)}
                    >
                        Shift 2
                    </button>
                    <button
                        className={tab2(3)}
                        onClick={() => setTeleopShift(3)}
                    >
                        Shift 3
                    </button>
                    <button
                        className={tab2(4)}
                        onClick={() => setTeleopShift(4)}
                    >
                        Shift 4
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex flex-col items-center justify-center">
                    {shiftcontent}
                </div>
            </div>
        );
    } else if (section === "endgame") {
        content = (
            <>
                <MultiCounterInput
                    min={0}
                    max={999}
                    value={endgameFuel}
                    onChange={setEndgameFuel}
                    label={"Endgame fuel scored"}
                />
                <Dropdown
                    value={endgameClimbLevel}
                    options={["Didn't climb", "Level 1", "Level 2", "Level 3"]}
                    label={"Endgame Climb Level"}
                    onChange={setEndgameClimbLevel}
                />
            </>
        );
    } else if (section === "errors") {
        content = (
            <>
                <div className="flex flex-col items-center space-y-2">
                    <BinaryChoice
                        label={"Over Bump?"}
                        options={["yes", "no"]}
                        value={crossedBump}
                        onChange={setCrossedBump}
                    />
                    <BinaryChoice
                        label={"Under Trench?"}
                        options={["yes", "no"]}
                        value={underTrench}
                        onChange={setUnderTrench}
                    />

                    <CheckboxDropdown
                        label={"Select Robot Errors"}
                        optionList={robotErrors}
                        optionCheck={robotErrorsCheck}
                        onChange={setRobotErrorsCheck}
                    />

                    <AutoResizeTextarea
                        value={notes}
                        onChange={setNotes}
                        placeholder="Other notes about robot"
                    />
                    <button className={buttonStyle} onClick={submitData}>
                        Submit
                    </button>
                    {!sent ? (
                        <div className="flex flex-col items-center space-y-2 ">
                            <h3 className="font-semibold text-red-800 text-2xl pb-1">
                                If you are seeing this message, you either have
                                poor connectivity, or you have encountered an
                                error. If you encountered an error, a message
                                should have shown up stating you had an error.
                                If no message showed up, then you're
                                connectivity is poor. If your data gets sent,
                                then this page will automatically close. If you
                                need to fill out another form, you may press the
                                back button, but remember to submit later in the
                                "view local storage" page.
                            </h3>
                            <button className={buttonStyle} onClick={goBack}>
                                Back
                            </button>
                        </div>
                    ) : (
                        <></>
                    )}
                </div>
            </>
        );
    }

    return (
        <div className="overflow-x-auto flex flex-col items-center justify-start space-y-6 pt-12.5">
            <button className={buttonStyle} onClick={goBack}>
                Back
            </button>
            <h1 className="font-bold text-white text-4xl pb-1">
                Scouting Match
            </h1>
            <div className="flex flex-col items-center justify-start pt-2.5 w-full">
                {/* Main Button Container */}
                <div className="flex flex-row flex-wrap justify-center gap-4 pb-5 max-w-[400px]">
                        <button
                            className={tab("setup")}
                            onClick={() => setSection("setup")}
                        >
                            Setup
                        </button>
                        <button
                            className={tab("auto")}
                            onClick={() => setSection("auto")}
                        >
                            Auto
                        </button>
                        <button
                            className={tab("teleop")}
                            onClick={() => setSection("teleop")}
                        >
                            Teleop
                        </button>
                    </div>

                    <div className="flex flex-row space-x-4">
                        <button
                            className={tab("endgame")}
                            onClick={() => setSection("endgame")}
                        >
                            Endgame
                        </button>
                        <button
                            className={tab("errors")}
                            onClick={() => setSection("errors")}
                        >
                            Finale
                        </button>
                    
                </div>
            </div>
            {content}
        </div>
    );
};

export default MatchForm;
