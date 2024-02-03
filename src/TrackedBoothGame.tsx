import { BoothGame } from "./BoothGame/BoothGame";
import React from "react";
import { BoothGameTracker } from "./Tracker/BoothGameTracker";
import { ComponentLifecycleTracing } from "./tracing/ComponentLifecycleTracing";
import { TrackedStep, TrackedSteps, advance, advanceIntoNewSubsteps, initialTrackedSteps } from "./Tracker/trackedSteps";
import { useDeclareTracedState } from "./tracing/TracedState";
import { TracingTracker } from "./Tracker/TracingTracker";
import { HowToReset } from "./resetQuiz";
import { HoneycombTeamContextProvider } from "./BoothGame/HoneycombTeamContext";
import { SecondsSinceEpoch, TracingTeam, TracingTeamFromAuth } from "./tracing/TracingDestination";
import { TracingErrorBoundary } from "./tracing/TracingErrorBoundary";

function TrackedBoothGameInternal(props: TrackedBoothGameProps) {
  const [trackedSteps, setTrackedSteps] = useDeclareTracedState<TrackedSteps>("tracked steps", initialTrackedSteps);
  const [tracingTeam, setTracingTeamInternal] = useDeclareTracedState<TracingTeam | undefined>(
    "tracing team",
    undefined
  );

  console.log(trackedSteps.value.currentStepPath);

  const setTracingTeam = (team: TracingTeamFromAuth) => {
    const fullTeam = {
      ...team,
      observaquizStartTime: props.observaquizExecution.startTime,
      observaquizExecutionId: props.observaquizExecution.executionId,
    };
    props.learnTeam(fullTeam);
    setTracingTeamInternal(fullTeam);
  };

  const advanceTrackedSteps = (completionResults?: object) => {
    setTrackedSteps(advance(trackedSteps.value, completionResults));
  };
  const advanceIntoNewSubstepsAndSet = (substeps: TrackedStep[]) => {
    setTrackedSteps(advanceIntoNewSubsteps(trackedSteps.value, substeps));
  };

  return (
    <HoneycombTeamContextProvider tracingTeam={tracingTeam}>
      <TracingErrorBoundary howToReset={props.howToReset}>
        <BoothGameTracker trackedSteps={trackedSteps} />
        <TracingTracker />
        <BoothGame
          {...props}
          advanceTrackedSteps={advanceTrackedSteps}
          advanceIntoNewSubsteps={advanceIntoNewSubstepsAndSet}
          resetCount={props.observaquizExecution.resetCount}
          trackedSteps={trackedSteps}
          setTracingTeam={setTracingTeam}
        />
      </TracingErrorBoundary>
    </HoneycombTeamContextProvider>
  );
}

type ObservaquizExecution = {
  resetCount: number;
  startTime: SecondsSinceEpoch;
  executionId: string;
};

export type TrackedBoothGameProps = {
  learnTeam: (team: TracingTeam) => void;
  observaquizExecution: ObservaquizExecution;
} & HowToReset;

export function TrackedBoothGame(props: TrackedBoothGameProps) {
  return (
    <ComponentLifecycleTracing
      team="shared"
      componentName="TrackedBoothGame"
      attributes={{
        "app.observaquiz.start_time": props.observaquizExecution.startTime,
      }}
      attributesForAllChildren={{
        "app.observaquiz.execution_id": props.observaquizExecution.executionId,
      }}
    >
      <TrackedBoothGameInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
