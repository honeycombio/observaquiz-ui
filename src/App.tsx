import { learnTeam } from "./tracing/tracing";
import React from "react";
import { createRoot } from "react-dom/client";
import { Configuration, FakeHoneycomb, RealHoneycomb } from "./Configuration.js";
import { TrackedBoothGame } from "./TrackedBoothGame.js";
import { v4 as uuidv4 } from "uuid"; // Import the 'uuidv4' function from the 'uuid' package

console.log("begin! an");

function QuizApp() {
  const [resets, setResets] = React.useState(0);

  function reset() {
    console.log("Resetting");
    setResets(resets + 1);
  }

  const execution = {
    resetCount: resets,
    executionId: uuidv4(),
    startTime: Date.now() / 1000, // unix timestamp
  };

  return (
    <Configuration.Provider value={RealHoneycomb}>
      <TrackedBoothGame key={resets} observaquizExecution={execution} howToReset={reset} learnTeam={learnTeam} />
    </Configuration.Provider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<QuizApp />);
