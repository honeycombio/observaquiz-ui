import React from "react";
import { ApiKeyInput, ApiKeyInputSuccess } from "./ApiKeyInput";
import { QuestionSetRetrieval } from "./QuestionSetRetrieval";
import { ComponentLifecycleTracing, ActiveLifecycleSpan } from "../tracing/ComponentLifecycleTracing";
import { HowToReset } from "../resetQuiz";
import { Hello } from "./Hello";
import { QuestionSet, Quiz } from "./Quiz";
import { TrackedSteps, advance } from "../Tracker/trackedSteps";
import { TracedState } from "../tracing/TracedState";
import { TracingTeam } from "../tracing/TracingDestination";
import { Attributes } from "@opentelemetry/api";
import { AnalyzeData } from "./AnalyzeData";
import { useLocalTracedState } from "../tracing/LocalTracedState";

type QuizState =
  | { name: "hello" }
  | { name: "collect email" }
  | { name: "get api key" }
  | { name: "load question set" }
  | { name: "ask questions"; questionSet: QuestionSet }
  | { name: "analyze data" };

function BoothGameInternal(props: BoothGameProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);

  const [currentState, setCurrentState] = useLocalTracedState<QuizState>({ name: "hello" });

  function helloBegin() {
    setCurrentState(
      { name: "get api key" },
      {
        action: () => props.advanceTrackedSteps(),
      }
    );
  }

  function acceptApiKey(news: ApiKeyInputSuccess) {
    setCurrentState({ name: "load question set" }, { action: () => props.setTracingTeam(news) });
  }

  function acceptQuestionSet(questionSet: QuestionSet) {
    setCurrentState({ name: "ask questions", questionSet });
  }

  function moveOnToDataAnalysis() {
    setCurrentState(
      { name: "analyze data" },
      {
        action: () => props.advanceTrackedSteps(),
      }
    );
  }

  var content = null;
  switch (currentState.name) {
    case "hello":
      content = <Hello moveForward={helloBegin} />;
      break;
    case "collect email":
      content = <div> collect email goes here </div>;
      break;
    case "get api key":
      content = <ApiKeyInput moveForward={acceptApiKey} />;
      break;
    case "load question set":
      content = <QuestionSetRetrieval moveForward={acceptQuestionSet} />;
      break;
    case "ask questions":
      content = (
        <Quiz questionSet={currentState.questionSet} howToReset={props.howToReset} moveOn={moveOnToDataAnalysis} />
      );
      break;
    case "analyze data":
      content = <AnalyzeData />;
      break;
    default:
      activeLifecycleSpan.addLog("Unhandled state", { "app.state.unhandled": currentState });
      content = <div>FAILURE</div>;
      break;
  }

  return <div className="booth-game-portion">{content}</div>;
}

export type BoothGameProps = {
  resetCount: number;
  advanceTrackedSteps: () => void;
  setTracingTeam: (tracingTeam: Omit<TracingTeam, "observaquizStartTime">) => void;
} & HowToReset;

export function BoothGame(props: BoothGameProps) {
  return (
    <ComponentLifecycleTracing
      componentName="BoothGame"
      team="QuizWhizzes"
      attributes={{ "app.resetCount": props.resetCount }}
    >
      <BoothGameInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
