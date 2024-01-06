import { BoothGame, BoothGameProps } from "./BoothGame/BoothGame";
import React from "react";
import { BoothGameTracker } from "./Tracker/BoothGameTracker";
import { ComponentLifecycleTracing } from "./tracing/ComponentLifecycleTracing";
import { TrackedSteps, initialTrackedSteps } from "./Tracker/trackedSteps";
import { useDeclareTracedState } from "./tracing/TracedState";
import { TracingTracker } from "./Tracker/TracingTracker";

function TrackedBoothGameInternal(props: BoothGameProps) {
  const [trackedSteps, setTrackedSteps] = useDeclareTracedState<TrackedSteps>("tracked steps", initialTrackedSteps);
  return (
    <div id="tracked-booth-game">
      <BoothGameTracker trackedSteps={trackedSteps} />
      <TracingTracker />
      <BoothGame {...props} trackedSteps={trackedSteps} setTrackedSteps={setTrackedSteps} />
    </div>
  );
}
export type TrackedBoothGameProps = BoothGameProps;
export function TrackedBoothGame(props: TrackedBoothGameProps) {
  return (
    <ComponentLifecycleTracing team="shared" componentName="TrackedBoothGame">
      <TrackedBoothGameInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
