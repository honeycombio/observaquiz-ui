import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { isComplete, isCurrentStep, TrackedStep, TrackedSteps } from "./trackedSteps";
import { TracedState, useTracedState } from "../tracing/TracedState";

function paintSteps(steps: TrackedStep[], currentStepPath: string): React.ReactNode {
  return steps.map((step, index) => {
    if (step.invisible) {
      return <></>
    }
    const className =
      isCurrentStep(step, currentStepPath)
        ? "you-are-here"
        : isComplete(step)
          ? "completed-step"
          : "incomplete-step";
    if (step.substeps) {
      return paintSteps(step.substeps, currentStepPath);
    }
   return <div key={step.id} title={step.name} className={className} >
    </div>;
  });
}

function BoothGameTrackerInternal(props: BoothGameTrackerProps) {
  const { trackedSteps } = props;
  const { steps, currentStepPath } = useTracedState(trackedSteps, (ts) => ({
    "app.tracker.currentStep": ts.currentStepPath,
  }));

  const paintedSteps = paintSteps(steps, currentStepPath)
  return <div id="booth-game-tracker" className="booth-game-tracker">{paintedSteps}</div>;
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
