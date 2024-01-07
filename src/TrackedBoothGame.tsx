import { BoothGame } from "./BoothGame/BoothGame";
import React from "react";
import { BoothGameTracker } from "./Tracker/BoothGameTracker";
import { ComponentLifecycleTracing } from "./tracing/ComponentLifecycleTracing";
import { TrackedSteps, initialTrackedSteps } from "./Tracker/trackedSteps";
import { useDeclareTracedState } from "./tracing/TracedState";
import { TracingTeam, TracingTracker } from "./Tracker/TracingTracker";
import { HowToReset } from "./resetQuiz";

function TrackedBoothGameInternal(props: TrackedBoothGameProps) {
  const [trackedSteps, setTrackedSteps] = useDeclareTracedState<TrackedSteps>("tracked steps", initialTrackedSteps);
  const [tracingTeam, setTracingTeam] = React.useState<TracingTeam | undefined>(undefined);

// there will be a useEffect dependent on tracingTeam that updates the fields in the special SPanProcessor


  return (
    <div id="tracked-booth-game">
      <BoothGameTracker trackedSteps={trackedSteps} />
      <TracingTracker tracingTeam={tracingTeam} />
      <BoothGame
        {...props}
        trackedSteps={trackedSteps}
        setTrackedSteps={setTrackedSteps}
        setTracingTeam={setTracingTeam}
        tracingTeam={tracingTeam}
      />
    </div>
  );
}
export type TrackedBoothGameProps = {
  resetCount: number;
} & HowToReset;

export function TrackedBoothGame(props: TrackedBoothGameProps) {
  return (
    <ComponentLifecycleTracing team="shared" componentName="TrackedBoothGame">
      <TrackedBoothGameInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
