import { BoothGame } from "./BoothGame/BoothGame";
import React from "react";
import { BoothGameTracker } from "./Tracker/BoothGameTracker";
import { ComponentLifecycleTracing } from "./tracing/ComponentLifecycleTracing";
import { TrackedSteps, initialTrackedSteps } from "./Tracker/trackedSteps";
import { useDeclareTracedState } from "./tracing/TracedState";
import { TracingTracker } from "./Tracker/TracingTracker";
import { HowToReset } from "./resetQuiz";
import { HoneycombTeamContextProvider } from "./BoothGame/HoneycombTeamContext";
import { TracingTeam } from "./tracing/TracingDestination";

function TrackedBoothGameInternal(props: TrackedBoothGameProps) {
  const [trackedSteps, setTrackedSteps] = useDeclareTracedState<TrackedSteps>("tracked steps", initialTrackedSteps);
  const [tracingTeam, setTracingTeam] = useDeclareTracedState<TracingTeam | undefined>("tracing team", undefined);

  // there will be a useEffect dependent on tracingTeam that updates the fields in the special SPanProcessor

  return (
    <HoneycombTeamContextProvider tracingTeam={tracingTeam}>
      <BoothGameTracker trackedSteps={trackedSteps} />
      <TracingTracker/>
      <BoothGame
        {...props}
        trackedSteps={trackedSteps}
        setTrackedSteps={setTrackedSteps}
        setTracingTeam={setTracingTeam}
      />
    </HoneycombTeamContextProvider>
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
