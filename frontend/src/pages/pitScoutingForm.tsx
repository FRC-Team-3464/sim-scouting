import { useState } from "react";
import { useNavigate } from "react-router-dom";
import IntegerInput from "../components/IntegerInput";
import AutoResizeTextarea from "../components/AutoResizeTextArea";
import { writeToDb } from "../api/scouting";
import Dropdown from "../components/Dropdown";
import BinaryChoice from "../components/BinaryChoice";
import { useAuthentication } from "../auth/use-authentication";


const PitScoutingForm: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthentication();
    const debug = user?.debug === true;
    const goBack = () => {
        navigate("/");
    };

const [sent, setSent] = useState<boolean>(true);

/*Setup values*/
const [scoutingTeam, setScoutingTeam] = useState(0);
const [eventName, setEventName] = useState<string>("");
const [matchNumber, setMatchNumber] = useState(0);
const [teamnum, setTeamnum] = useState(0);

/*Values*/
const [chassisSizew, setChassisSizew] = useState(0);
const [chassisSizel, setChassisSizel] = useState(0);
const [startingHeight, setStartingHeight] = useState<string>("");
const [maxHeight, setMaxHeight] = useState<string>("");
const [motorTypes, setMotorTypes] = useState<string>("");
const [outpost, setOutpost] = useState<boolean>(false);

const events = ["NE District Minuteman Event", "NE District URI Event"];
        


async function submitData() {
    //make sure certain fields are filled out
    let check: boolean =
        eventName !== "" && teamnum !== null && matchNumber !== null;

    const data = {
        teamNumber: teamnum,
        scoutingTeam: scoutingTeam,
        eventName: eventName,
        matchNumber: matchNumber,

        chassisSizel: chassisSizel,
        chassisSizew: chassisSizew,
        startingHeight: startingHeight,
        maxHeight: maxHeight,

        motorTypes: motorTypes,
        outpost: outpost

    };



    /*
    The path for block of data will be submitted as follows:
    /{eventName}/{teamnum}/{matchNumber}/{timestamp}, timestamp is not finished
    */
    if (!check && !debug) {
        alert("Please fill out all required fields before submitting.");
    } else {
        localStorage.setItem(
            `scoutData-${teamnum}-${matchNumber}`,
            JSON.stringify(data),
        );

        setSent(false);
        let val = await writeToDb(
            `${"pitScouting"}/${teamnum?.toString()}`,
            data,
        );

        if (!val) {
            setSent(true);
        } else {
            setSent(false);
        }

       setSent(false);

        const pathname = window.location.pathname;

        if (pathname === "/pitscouting") {
            goBack();
        }
    }
}


  
    const buttonStyle =
        "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded";
        
    return (
        
        <div className="overflow-x-auto flex flex-col items-center justify-start space-y-6 pt-12.5">
            <h1 className="text-4xl font-bold text-white">Pit Scouting Form</h1>

            <button className={buttonStyle} onClick={goBack}>
                Back
            </button>

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
                value={teamnum}
                onChange={setTeamnum}
                label={"Team Number"}
                max={99999}
            />
            <IntegerInput
                value={chassisSizel}
                onChange={setChassisSizel}
                label="Chassis size Length"
            />
            <IntegerInput
                value={chassisSizew}
                onChange={setChassisSizew}
                label="Chassis size Width"
            />
            <h1 className="text-white text-2xl font-semibold">
                chassis {chassisSizel}x{chassisSizew}
            </h1>
            <AutoResizeTextarea
                value={startingHeight}
                onChange={(val) => setStartingHeight(val.toString())}
                label="Starting Height (inches)"
            />
            <AutoResizeTextarea
                value={maxHeight}
                onChange={(val) => setMaxHeight(val.toString())}
                label="Max Height (inches)"
            />
            <AutoResizeTextarea
                value={motorTypes}
                onChange={(val) => setMotorTypes(val.toString())}
                label="Motor types"
            />
            <BinaryChoice 
                label={"Used Outpost"}
                options={["no", "yes"]}
                value={outpost}
                onChange={setOutpost}        
            />  
            <button className={buttonStyle} onClick={submitData}>
                Submit
            </button>
            {!sent ? (
                    <div className="flex flex-col items-center space-y-2 ">
                        <h3 className="font-semibold text-red-800 text-2xl pb-1">
                            If you are seeing this message, you either have poor
                            connectivity, or you have encountered an error. If
                            you encountered an error, a message should have
                            shown up stating you had an error. If no message
                            showed up, then you're connectivity is poor. If your
                            data gets sent, then this page will automatically
                            close. If you need to fill out another form, you may
                            press the back button, but remember to submit later
                            in the "view local storage" page.
                        </h3>
                        <button className={buttonStyle} onClick={goBack}>
                            Back
                        </button>
                    </div>
                ) : (
                    <></>
                )}
        </div>
    );
};

export default PitScoutingForm;
