import { learnTeam } from "./tracing/tracing";
import React from "react";
import { createRoot } from "react-dom/client";
import { Configuration, Local, LocalButRealHoneycomb, Production } from "./Configuration.js";
import { TrackedBoothGame } from "./TrackedBoothGame.js";

console.log("begin! ag");

function QuizApp() {
  const [resets, setResets] = React.useState(0);

  function reset() {
    console.log("Resetting");
    setResets(resets + 1);
  }

  return (
    <Configuration.Provider value={LocalButRealHoneycomb}>
      <TrackedBoothGame key={resets} resetCount={resets} howToReset={reset} learnTeam={learnTeam} />
    </Configuration.Provider>
  ); 
}

const root = createRoot(document.getElementById("root")!);
root.render(<QuizApp />);
