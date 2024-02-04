import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { isComplete, TrackedSteps } from "./trackedSteps";
import { TracedState, useTracedState } from "../tracing/TracedState";

function BoothGameTrackerInternal(props: BoothGameTrackerProps) {
  const { trackedSteps } = props;
  const { steps, currentStepPath } = useTracedState(trackedSteps, (ts) => ({
    "app.tracker.currentStep": ts.currentStepPath,
  }));

  const paintedSteps = steps.map((step, index) => {
    const className =
      step.id === currentStepPath.split("/")[0] // for right now
        ? "you-are-here"
        : isComplete(step)
        ? "completed-step"
        : "incomplete-step";
    return <div key={step.id} title={step.name} className={className} />;
  });
  return <div id="booth-game-tracker">{paintedSteps}</div>;
}

export type BoothGameTrackerProps = { trackedSteps: TracedState<TrackedSteps> };

export function BoothGameTracker(props: BoothGameTrackerProps) {
  return (
    <ComponentLifecycleTracing
      componentName="BoothGameTracker"
      team="ObservaTrackers"
      attributes={{
        "app.tracker.fullState": JSON.stringify(props.trackedSteps),
        "app.tracker.currentStep": props.trackedSteps.value.currentStepPath,
      }}
    >
      <BoothGameTrackerInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
