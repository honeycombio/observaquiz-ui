import { BoothGame } from "./BoothGame/BoothGame";
import React from "react";
import { BoothGameTracker } from "./Tracker/BoothGameTracker";
import { ComponentLifecycleTracing } from "./tracing/ComponentLifecycleTracing";
import {
  TrackedStep,
  TrackedSteps,
  advance,
  advanceIntoNewSubsteps,
  initialTrackedSteps,
} from "./Tracker/trackedSteps";
import { useDeclareTracedState } from "./tracing/TracedState";
import { TracingTracker } from "./Tracker/TracingTracker";
import { HoneycombTeamContextProvider } from "./BoothGame/HoneycombTeamContext";
import { SecondsSinceEpoch, TracingTeam, TracingTeamFromAuth } from "./tracing/TracingDestination";
import { TracingErrorBoundary } from "./tracing/TracingErrorBoundary";
import { HowToReset } from "./resetQuiz";

function TrackedBoothGameInternal(props: TrackedBoothGameProps) {
  const [trackedSteps, setTrackedSteps] = useDeclareTracedState<TrackedSteps>("tracked steps", initialTrackedSteps);
  const [tracingTeam, setTracingTeamInternal] = useDeclareTracedState<TracingTeam | undefined>(
    "tracing team",
    undefined
  );
  React.useEffect(() => {
    // just once at the beginning. This is a special case for loading state and being later in the
    // observaquiz, so that 'setTracingTeam' below doesn't get called.
    // This is a super special case and icky. But I want it to work now please
    if (tracingTeam.value !== undefined) {
      console.log("Learning tracing team from local storage");
      props.learnTeam(tracingTeam.value);
    }
  }, []);

  function howToReset() {
    console.log("Resetting tracked steps");
    setTrackedSteps(initialTrackedSteps);
    setTracingTeamInternal(undefined);
    props.howToReset();
  }

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

  const resetButton = (
    <p>
      <button className="button clear pull-right" onClick={howToReset}>
        Reset quiz
      </button>
    </p>
  );
  return (
    <HoneycombTeamContextProvider tracingTeam={tracingTeam}>
      <TracingErrorBoundary howToReset={props.howToReset}>
        <BoothGameTracker trackedSteps={trackedSteps} />
        <TracingTracker />
        <BoothGame
          advanceTrackedSteps={advanceTrackedSteps}
          advanceIntoNewSubsteps={advanceIntoNewSubstepsAndSet}
          resetCount={props.observaquizExecution.resetCount}
          trackedSteps={trackedSteps}
          setTracingTeam={setTracingTeam}
        />
        {resetButton}
      </TracingErrorBoundary>
    </HoneycombTeamContextProvider>
  );
}

export type ObservaquizExecution = {
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
