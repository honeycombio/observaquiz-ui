import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { TrackedSteps } from "./trackedSteps";
import { TracedState, useTracedState } from "../tracing/TracedState";

function BoothGameTrackerInternal(props: BoothGameTrackerProps) {
  const { trackedSteps } = props;
  const { steps, completedSteps, currentStep } = useTracedState(trackedSteps, (ts) => ({
    "app.tracker.currentStep": ts.currentStep,
  }));

  const paintedSteps = steps.map((step, index) => {
    const className =
      step.id === currentStep
        ? "you-are-here"
        : completedSteps.includes(step.id)
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
        "app.tracker.currentStep": props.trackedSteps.value.currentStep,
      }}
    >
      <BoothGameTrackerInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
