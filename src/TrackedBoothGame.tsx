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
import {
  SecondsSinceEpoch,
  TRACING_TEAM_VERSION,
  TracingTeam,
  TracingTeamFromAuth,
} from "./tracing/TracingDestination";
import { TracingErrorBoundary } from "./tracing/TracingErrorBoundary";
import { HowToReset } from "./resetQuiz";

function TrackedBoothGameInternal(props: TrackedBoothGameProps) {
  const [trackedSteps, setTrackedSteps] = useDeclareTracedState<TrackedSteps>(
    "tracked steps",
    initialTrackedSteps
  );
  const [tracingTeamWithTracking, setTracingTeamInternal] =
    useDeclareTracedState<TracingTeam>("tracing team", {
      version: TRACING_TEAM_VERSION,
      execution: props.observaquizExecution,
    });
  const tracingTeam = tracingTeamWithTracking.value;

  React.useEffect(() => {
    // on refresh, check for outdated
    if (tracingTeam.version !== TRACING_TEAM_VERSION) {
      console.log("Tracing team out of date, reset everything");
      setTrackedSteps(initialTrackedSteps);
      setTracingTeamInternal({
        version: TRACING_TEAM_VERSION,
        execution: props.observaquizExecution,
      });
    }
  }, []);

  React.useEffect(() => {
    if (
      props.observaquizExecution.executionId !==
      tracingTeam.execution.executionId
    ) {
      console.log("New execution ID, resetting tracked steps");
      setTrackedSteps(initialTrackedSteps);
      setTracingTeamInternal({
        version: TRACING_TEAM_VERSION,
        execution: props.observaquizExecution,
      });
    }
  }, [props.observaquizExecution]);

  function howToReset() {
    // The execution ID will change, triggering a reset of tracked steps and tracing team.
    props.howToReset();
  }

  console.log(trackedSteps.value.currentStepPath);

  const addAuthToTracingTeam = (team: TracingTeamFromAuth) => {
    const fullTeam: TracingTeam = {
      ...tracingTeam,
      auth: team,
    };
    props.learnTeam(fullTeam);
    setTracingTeamInternal(fullTeam);
  };

  const addMonikerToTracingTeam = (protagonist: { moniker: string }) => {
    setTracingTeamInternal({
      ...tracingTeam,
      protagonist,
    });
    // TODO: teach this to the span processor chain, to add the moniker to everything from now on
  };

  const advanceTrackedSteps = (completionResults?: object) => {
    setTrackedSteps(advance(trackedSteps.value, completionResults));
  };
  const advanceIntoNewSubstepsAndSet = (substeps: TrackedStep[]) => {
    setTrackedSteps(advanceIntoNewSubsteps(trackedSteps.value, substeps));
  };

  const resetButton = (
    <button className="button clear pull-right" onClick={howToReset}>
      Reset quiz
    </button>
  );
  return (
    <HoneycombTeamContextProvider tracingTeam={tracingTeamWithTracking}>
      <TracingErrorBoundary howToReset={props.howToReset}>
        <BoothGameTracker trackedSteps={trackedSteps} />
        <BoothGame
          advanceTrackedSteps={advanceTrackedSteps}
          advanceIntoNewSubsteps={advanceIntoNewSubstepsAndSet}
          resetCount={props.observaquizExecution.resetCount}
          trackedSteps={trackedSteps}
          addAuthToTracingTeam={addAuthToTracingTeam}
          addMonikerToTracingTeam={addMonikerToTracingTeam}
        />
        <div className="in-case-of-emergency">
          {resetButton}
          <TracingTracker />
        </div>
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
        "app.observaquiz.resetCount": props.observaquizExecution.resetCount,
      }}
    >
      <TrackedBoothGameInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
