import React from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

const NoMoniker = { name: "no moniker yet", buttonEnabled: false, inputEnabled: true, message: "" };
const EnteringMoniker = { name: "some moniker entered", buttonEnabled: true, inputEnabled: true, message: "" };
const ScoreSubmitted = { name: "moniker accepted", buttonEnabled: false, inputEnabled: false, message: "Woot!" };

type MonikerState = typeof NoMoniker | typeof EnteringMoniker | typeof ScoreSubmitted;

function WinInternal(props: WinProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);

  const postToLeaderboard = (moniker: string) => {
    activeLifecycleSpan.addLog("Leaderboard", {
      "app.leaderboard.moniker": moniker,
      "app.leaderboard.score": props.score,
    });
  };

  const [moniker, setMoniker] = React.useState("");
  const [state, setState] = React.useState<MonikerState>(NoMoniker);

  const updateMoniker = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMoniker = event.target.value;
    if (!newMoniker) {
      setState(NoMoniker);
    } else {
      setState(EnteringMoniker);
    }
    setMoniker(newMoniker);
  };

  const submit = () => {
    setState(ScoreSubmitted);
    postToLeaderboard(moniker);
  };

  return (
    <div>
      <h1>You win!</h1>
      <p>
        Congratulation on completing the Observaquiz! Come by the Honeycomb booth at DevOpsDays Wherever to collect your
        prize.
      </p>
      <p className="score-report">Your score is: {props.score}</p>
      <p>
        <label htmlFor="moniker">
          Enter your name for the leaderboard:
          <input
            id="moniker"
            value={moniker}
            disabled={!state.inputEnabled}
            type="text"
            onChange={updateMoniker}
            className="moniker-input"
          ></input>
        </label>
        <button disabled={!state.buttonEnabled} type="submit" onClick={submit}>
          Submit
        </button>{" "}
        {state.message}
      </p>
    </div>
  );
}

export type WinProps = { score: number };
export function Win(props: WinProps) {
  return (
    <ComponentLifecycleTracing componentName="win">
      <WinInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
