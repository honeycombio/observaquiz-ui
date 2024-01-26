import { BoothGame } from "./BoothGame/BoothGame";
import React from "react";
import { BoothGameTracker } from "./Tracker/BoothGameTracker";
import { ComponentLifecycleTracing } from "./tracing/ComponentLifecycleTracing";
import { TrackedSteps, initialTrackedSteps } from "./Tracker/trackedSteps";
import { useDeclareTracedState } from "./tracing/TracedState";
import { TracingTracker } from "./Tracker/TracingTracker";
import { HowToReset } from "./resetQuiz";
import { HoneycombTeamContextProvider } from "./BoothGame/HoneycombTeamContext";
import { SecondsSinceEpoch, TracingTeam } from "./tracing/TracingDestination";

function TrackedBoothGameInternal(props: TrackedBoothGameProps) {
  const [trackedSteps, setTrackedSteps] = useDeclareTracedState<TrackedSteps>("tracked steps", initialTrackedSteps);
  const [tracingTeam, setTracingTeamInternal] = useDeclareTracedState<TracingTeam | undefined>(
    "tracing team",
    undefined
  );

  const setTracingTeam = (team: Omit<TracingTeam, "observaquizStartTime">) => {
    const fullTeam = { ...team, observaquizStartTime: props.observaquizExecution.startTime };
    props.learnTeam(fullTeam);
    setTracingTeamInternal(fullTeam);
  };

  // there will be a useEffect dependent on tracingTeam that updates the fields in the special SPanProcessor

  return (
    <HoneycombTeamContextProvider tracingTeam={tracingTeam}>
      <BoothGameTracker trackedSteps={trackedSteps} />
      <TracingTracker />
      <BoothGame
        {...props}
        resetCount={props.observaquizExecution.resetCount}
        trackedSteps={trackedSteps}
        setTrackedSteps={setTrackedSteps}
        setTracingTeam={setTracingTeam}
      />
    </HoneycombTeamContextProvider>
  );
}

type ObservaquizExecution = {
  resetCount: number;
  startTime: SecondsSinceEpoch;
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
      attributes={{ "app.boothGame.startTime": props.observaquizExecution.startTime }}
    >
      <TrackedBoothGameInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
