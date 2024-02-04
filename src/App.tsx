import { learnTeam } from "./tracing/tracing";
import React from "react";
import { createRoot } from "react-dom/client";
import { Configuration, FakeHoneycomb, RealHoneycomb } from "./Configuration.js";
import { ObservaquizExecution, TrackedBoothGame } from "./TrackedBoothGame.js";
import { v4 as uuidv4 } from "uuid"; // Import the 'uuidv4' function from the 'uuid' package
import { useLocalStorage } from "@uidotdev/usehooks";

console.log("begin! an");

function newExecution(resets: number): ObservaquizExecution {
  return {
    resetCount: resets,
    executionId: uuidv4(),
    startTime: Date.now() / 1000, // unix timestamp
  };
}
function QuizApp() {
  const [resets, setResets] = React.useState(0);
  const [execution, saveExecution] = useLocalStorage<ObservaquizExecution>("execution", newExecution(resets));

  function reset() {
    console.log("Resetting");
    saveExecution(newExecution(resets + 1));
    setResets(resets + 1);
  }

  return (
    <Configuration.Provider value={RealHoneycomb}>
      <TrackedBoothGame key={resets} observaquizExecution={execution} howToReset={reset} learnTeam={learnTeam} />
    </Configuration.Provider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<QuizApp />);
