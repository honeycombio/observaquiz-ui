import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

function WinInternal(props: WinProps) {
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
          <input id="moniker" type="text" className="moniker-input"></input>
        </label>
        <button type="submit">Submit</button>
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
