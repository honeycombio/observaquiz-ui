import React from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { HoneycombTeamContext } from "./HoneycombTeamContext";

function WinInternal(props: WinProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const tracingTeam = React.useContext(HoneycombTeamContext);

  React.useEffect(() => {
    const moniker = tracingTeam.populated ? tracingTeam.protagonist?.moniker : "anonymous";
    console.log("Posting to leaderboard: " + moniker + " " + props.score);
    activeLifecycleSpan.addLog("Leaderboard", {
      "app.leaderboard.moniker": moniker,
      "app.leaderboard.score": props.score,
    });
  }, []);

  const postSuggestion = (input: string) => {
    console.log("Posting suggestion", input);
    activeLifecycleSpan.addLog("Prize Suggestion", {
      "app.boothGame.suggested_prize": input,
    });
  };

  return (
    <div>
      <h1>You win!</h1>
      <p>
        Congratulations on completing the Observaquiz!
      </p>
      <p className="score-report">Your score is: {props.score}</p>
      <p>Come by the Honeycomb booth to see the leaderboard and collect your prize!</p>
    </div>
  );
}

type DoStuffWithInputProps = {
  report: (input: string) => void;
};

const NoInput = { name: "no moniker yet", buttonEnabled: false, inputEnabled: true, message: "" };
const EnteringInput = { name: "some moniker entered", buttonEnabled: true, inputEnabled: true, message: "" };
const InputSubmitted = { name: "moniker accepted", buttonEnabled: false, inputEnabled: false, message: "Woot!" };

type InputState = typeof NoInput | typeof EnteringInput | typeof InputSubmitted;

function AskThemAboutPrizes(props: DoStuffWithInputProps) {
  const [suggestion, setSuggestion] = React.useState("");
  const [state, setState] = React.useState<InputState>(NoInput);

  const updateSuggestion = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSuggestion = event.target.value;
    if (!newSuggestion.trim()) {
      setState(NoInput);
    } else {
      setState(EnteringInput);
    }
    setSuggestion(newSuggestion);
  };

  const submit = () => {
    if (!state.buttonEnabled) {
      // they could hit enter on a blank input, for instance
      return;
    }
    setState(InputSubmitted);
    props.report(suggestion);
  };

  const submitOnEnter = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      submit();
    }
  };

  return (
    <p>
      <label htmlFor="suggestion">
        If this were a DevOpsDays, we would offer a toy to entice you to complete this quiz. In the $10-15 range, what's
        a toy that would make you want to do this? We don't plan on Honeycomb-branding this prize, you get plenty of
        that in the quiz itself. Please share suggestions here:
      </label>
      <input
        type="textarea"
        id="suggestion"
        value={suggestion}
        disabled={!state.inputEnabled}
        onChange={updateSuggestion}
        className="moniker-input"
        onKeyUp={submitOnEnter}
      ></input>
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
