import React from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { HoneycombTeamContext } from "./HoneycombTeamContext";

function WinInternal(props: WinProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const tracingTeam = React.useContext(HoneycombTeamContext);

  React.useEffect(() => {
    const moniker = tracingTeam.populated ? tracingTeam.protagonist?.moniker : "anonymous";
    console.log("Posting to leaderboard: " + moniker + " " + props.score);
    activeLifecycleSpan.setAttributes({
      "app.leaderboard.moniker": moniker,
      "app.leaderboard.score": props.score,
    });
    activeLifecycleSpan.addLog("Leaderboard", {
      "app.leaderboard.moniker": moniker,
      "app.leaderboard.score": props.score,
    });
  }, []);

  return (
    <div>
      <h1>Success!</h1>
      <p>
        Congratulations on completing the Observaquiz!
      </p>
      <p className="score-report">Your score is: {props.score}</p>
      <p>Come by the Honeycomb booth at DevOpsDays Denver 2024 to see how this compares with other scores, and to collect your prize!</p>
      <hr />
      <p>If you'd like to talk more about this quiz, or observability, or OpenTelemetry: chat with Jessitron (or Martin) in 
        {" "}<a href="https://honeycomb.io/office-hours">Office Hours</a>.</p>
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
