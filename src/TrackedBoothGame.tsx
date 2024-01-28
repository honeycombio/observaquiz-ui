import { BoothGame } from "./BoothGame/BoothGame";
import React from "react";
import { BoothGameTracker } from "./Tracker/BoothGameTracker";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "./tracing/ComponentLifecycleTracing";
import { TrackedSteps, advance, initialTrackedSteps } from "./Tracker/trackedSteps";
import { useDeclareTracedState } from "./tracing/TracedState";
import { TracingTracker } from "./Tracker/TracingTracker";
import { HowToReset } from "./resetQuiz";
import { HoneycombTeamContextProvider } from "./BoothGame/HoneycombTeamContext";
import { SecondsSinceEpoch, TracingTeam, TracingTeamFromAuth } from "./tracing/TracingDestination";
import { TracingErrorBoundary } from "./tracing/TracingErrorBoundary";
import { ActiveLifecycleSpanType } from "./tracing/activeLifecycleSpan";

function TrackedBoothGameInternal(props: TrackedBoothGameProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const [trackedSteps, setTrackedSteps] = useDeclareTracedState<TrackedSteps>("tracked steps", initialTrackedSteps);
  const [tracingTeam, setTracingTeamInternal] = useDeclareTracedState<TracingTeam | undefined>(
    "tracing team",
    undefined
  );

  React.useEffect(() => {
    // look for a saved state on startup
    const savedState = retrieveTrackedStateFromLocalStorage(activeLifecycleSpan);
    if (savedState) {
      console.log("Using saved state");
      setTrackedSteps(savedState.steps);
      if (savedState.team) {
        setTracingTeam(savedState.team);
      }
    }
  }, []);

  React.useEffect(() => {
    // save state on change
    if (allowedToSaveState()) {
      saveStateToLocalStorage(trackedSteps.value, tracingTeam.value);
    }
  }, [trackedSteps.value, tracingTeam.value]);

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
      <TracingErrorBoundary howToReset={props.howToReset}>
        <TrackedBoothGameInternal {...props} />
      </TracingErrorBoundary>
    </ComponentLifecycleTracing>
  );
}

function retrieveTrackedStateFromLocalStorage(span: ActiveLifecycleSpanType): SavedState | undefined {
  const localStorageStringValue = window.localStorage.getItem("TrackedBoothGameState");
  if (!localStorageStringValue) {
    return undefined;
  }

  const [parsed, err] = deserializeTrackedSteps(localStorageStringValue);
  if (err) {
    span.addError("no stored state for you", err, {
      "app.localStorage.trackedState": localStorageStringValue || "undefined",
    });
  } else {
    span.addLog("localStorage GET", {
      "app.localStorage.trackedState": localStorageStringValue || "undefined",
    });
  }

  return parsed;
}

function allowedToSaveState(): boolean {
  // this is cheaty. If they said not to save their API key, we can't save their state.
  return window.localStorage.getItem("saveApiKeyToLocalStorage") !== "false";
}

function saveStateToLocalStorage(steps: TrackedSteps, team?: TracingTeam) {
  const savedState = {
    serializationVersionNumber: SerializationVersionNumber,
    steps,
    team,
  };
  window.localStorage.setItem("TrackedBoothGameState", JSON.stringify(savedState));
}

const SerializationVersionNumber: "1" = "1";
type SavedState = {
  serializationVersionNumber: typeof SerializationVersionNumber; // update this if any types under this change!
  steps: TrackedSteps;
  team?: TracingTeam;
};

export function deserializeSavedState(jsonString: string): [SavedState, undefined] | [undefined, Error] {
  try {
    const result = JSON.parse(jsonString) as SavedState;
    if (result.serializationVersionNumber === SerializationVersionNumber) {
      return [result, undefined];
    } else {
      return [
        undefined,
        new Error(
          `SavedState is out of date or garbage. Looking for version ${SerializationVersionNumber}, got ${result.serializationVersionNumber}`
        ),
      ];
    }
  } catch (e) {
    return [undefined, new Error("JSON parse error")];
  }
}
