import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { TrackedSteps } from "./trackedSteps";
import { TracedState, useTracedState } from "../tracing/TracedState";

function BoothGameTrackerInternal(props: BoothGameTrackerProps) {
  const { trackedSteps } = props;
  const { steps, currentStep } = useTracedState(trackedSteps, (ts) => ({
    "app.tracker.currentStep": ts.currentStep,
  }));

  // minimal change to derive completedSteps from the rest of the data structure.
  // When we start marking steps as completed, we won't need this, we can check that instead.
  var completedSteps: string[] = [];
  for (const s of steps) {
    if (s.id === currentStep) {
      break;
    }
    completedSteps.push(s.id);
  }

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
