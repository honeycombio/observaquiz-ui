import { initializeTelemetry } from "./tracing/tracing"; // TODO: pass configuration to initialization
import { Configuration, Airplane, Production, Test } from "./Configuration";
const configuration = Test;
const learnTeam = initializeTelemetry(configuration);
import React from "react";
import { createRoot } from "react-dom/client";
import { ObservaquizExecution, TrackedBoothGame } from "./TrackedBoothGame";
import { v4 as uuidv4 } from "uuid"; // Import the 'uuidv4' function from the 'uuid' package
import { useLocalStorage } from "./tracing/useLocalStorage";

console.log("begin! at");


function newExecution(resets: number): ObservaquizExecution {
  return {
    resetCount: resets,
    executionId: uuidv4(),
    startTime: Date.now() / 1000, // unix timestamp
  };
}
function QuizApp() {
  const [execution, saveExecution] = useLocalStorage<ObservaquizExecution>("execution", newExecution(0));

  function reset() {
    console.log("Resetting");
    learnTeam.reset()
    saveExecution(newExecution(execution.resetCount + 1));
  }

  return (
    <Configuration.Provider value={configuration}>
      <TrackedBoothGame
        key={execution.resetCount}
        observaquizExecution={execution}
        howToReset={reset}
        learnTeam={learnTeam.learnParticipantTeam}
      />
    </Configuration.Provider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<QuizApp />);
