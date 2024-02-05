import React from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

const NoMoniker = { name: "no moniker yet", buttonEnabled: false, inputEnabled: true, message: "" };
const EnteringMoniker = { name: "some moniker entered", buttonEnabled: true, inputEnabled: true, message: "" };
const ScoreSubmitted = { name: "moniker accepted", buttonEnabled: false, inputEnabled: false, message: "Woot!" };

type MonikerState = typeof NoMoniker | typeof EnteringMoniker | typeof ScoreSubmitted;

function WinInternal(props: WinProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);

  const postToLeaderboard = (moniker: string) => {
    console.log("Posting to leaderboard: " + moniker + " " + props.score);
    activeLifecycleSpan.addLog("Leaderboard", {
      "app.leaderboard.moniker": moniker,
      "app.leaderboard.score": props.score,
    });
  };

  return (
    <div>
      <h1>You win!</h1>
      <p>
        Congratulation on completing the Observaquiz! Come by the Honeycomb booth at DevOpsDays Wherever to collect your
        prize.
      </p>
      <p className="score-report">Your score is: {props.score}</p>
      <MonikerForLeaderboard report={postToLeaderboard} />
    </div>
  );
}

type MonikerForLeaderboardProps = {
  report: (moniker: string) => void;
};
function MonikerForLeaderboard(props: MonikerForLeaderboardProps) {
  const [moniker, setMoniker] = React.useState("");
  const [state, setState] = React.useState<MonikerState>(NoMoniker);

  const updateMoniker = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMoniker = event.target.value;
    if (!newMoniker.trim()) {
      setState(NoMoniker);
    } else {
      setState(EnteringMoniker);
    }
    setMoniker(newMoniker);
  };

  const submit = () => {
    if (!state.buttonEnabled) {
      // they could hit enter on a blank input, for instance
      return;
    }
    setState(ScoreSubmitted);
    props.report(moniker);
  };

  const submitOnEnter = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      submit();
    }
  };

  return (
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
          onKeyUp={submitOnEnter}
        ></input>
      </label>
      <button disabled={!state.buttonEnabled} type="submit" onClick={submit}>
        Submit
      </button>{" "}
      {state.message}
    </p>
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
