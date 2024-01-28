import { BoothGame } from "./BoothGame/BoothGame";
import React from "react";
import { BoothGameTracker } from "./Tracker/BoothGameTracker";
import { ComponentLifecycleTracing } from "./tracing/ComponentLifecycleTracing";
import { TrackedSteps, advance, initialTrackedSteps } from "./Tracker/trackedSteps";
import { useDeclareTracedState } from "./tracing/TracedState";
import { TracingTracker } from "./Tracker/TracingTracker";
import { HowToReset } from "./resetQuiz";
import { HoneycombTeamContextProvider } from "./BoothGame/HoneycombTeamContext";
import { SecondsSinceEpoch, TracingTeam, TracingTeamFromAuth } from "./tracing/TracingDestination";

function TrackedBoothGameInternal(props: TrackedBoothGameProps) {
  const [trackedSteps, setTrackedSteps] = useDeclareTracedState<TrackedSteps>("tracked steps", initialTrackedSteps);
  const [tracingTeam, setTracingTeamInternal] = useDeclareTracedState<TracingTeam | undefined>(
    "tracing team",
    undefined
  );

  const setTracingTeam = (team: TracingTeamFromAuth) => {
    const fullTeam = {
      ...team,
      observaquizStartTime: props.observaquizExecution.startTime,
      observaquizExecutionId: props.observaquizExecution.executionId,
    };
    props.learnTeam(fullTeam);
    setTracingTeamInternal(fullTeam);
  };

  const advanceTrackedSteps = () => {
    setTrackedSteps(advance(trackedSteps.value));
  };

  return (
    <HoneycombTeamContextProvider tracingTeam={tracingTeam}>
      <BoothGameTracker trackedSteps={trackedSteps} />
      <TracingTracker />
      <BoothGame
        {...props}
        resetCount={props.observaquizExecution.resetCount}
        advanceTrackedSteps={advanceTrackedSteps}
        setTracingTeam={setTracingTeam}
      />
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
