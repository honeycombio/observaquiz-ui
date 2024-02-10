import { learnTeam } from "./tracing/tracing";
import React from "react";
import { createRoot } from "react-dom/client";
import { Configuration, RealHoneycomb } from "./Configuration.js";
import { ObservaquizExecution, TrackedBoothGame } from "./TrackedBoothGame.js";
import { v4 as uuidv4 } from "uuid"; // Import the 'uuidv4' function from the 'uuid' package
import { useLocalStorage } from "./tracing/useLocalStorage";

console.log("begin! ap");

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
    saveExecution(newExecution(execution.resetCount + 1));
  }

  return (
    <Configuration.Provider value={RealHoneycomb}>
      <TrackedBoothGame
        key={execution.resetCount}
        observaquizExecution={execution}
        howToReset={reset}
        learnTeam={learnTeam}
      />
    </Configuration.Provider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<QuizApp />);
