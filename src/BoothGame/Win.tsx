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

  return (
    <div>
      <h1>Success!</h1>
      <p>
        Congratulations on completing the Observaquiz!
      </p>
      <p className="score-report">Your score is: {props.score}</p>
      <p>Come by the Honeycomb booth at Monitorama to see how this compares with other scores, and to collect your prize!</p>
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
