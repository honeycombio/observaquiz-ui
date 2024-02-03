import React from "react";
import { ApiKeyInput, ApiKeyInputSuccess } from "./ApiKeyInput";
import { QuestionSetRetrieval } from "./QuestionSetRetrieval";
import { ComponentLifecycleTracing, ActiveLifecycleSpan } from "../tracing/ComponentLifecycleTracing";
import { HowToReset } from "../resetQuiz";
import { Hello } from "./Hello";
import { QuestionSet, Quiz } from "./Quiz";
import { TracingTeamFromAuth } from "../tracing/TracingDestination";
import { AnalyzeData } from "./analyzeData/AnalyzeData";
import { TopLevelSteps, TrackedSteps, findCurrentStep } from "../Tracker/trackedSteps";

function BoothGameInternal(props: BoothGameProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const { trackedSteps, advanceTrackedSteps } = props;
  const currentStep = findCurrentStep(trackedSteps);

  function helloBegin() {
    // expand the "Begin step to include collecting the API key. Make that the current step.
    console.log("You pushed begin");
  }

  function acceptApiKey(news: ApiKeyInputSuccess) {
    advanceTrackedSteps();
  }

  function acceptQuestionSet(questionSet: QuestionSet) {
    advanceTrackedSteps(); //{ questionSet });
  }

  function moveOnToDataAnalysis() {
    advanceTrackedSteps();
  }

  var content = null;
  switch (currentStep.id) {
    case TopLevelSteps.BEGIN:
      content = <Hello moveForward={helloBegin} />;
      break;
    case "get api key":
      content = <ApiKeyInput moveForward={acceptApiKey} />;
      break;
    case "load question set":
      content = <QuestionSetRetrieval moveForward={acceptQuestionSet} />;
      break;
    case "ask questions":
      content = <Quiz questionSet={{} as any} howToReset={props.howToReset} moveOn={moveOnToDataAnalysis} />;
      break;
    case "analyze data":
      content = <AnalyzeData howToReset={props.howToReset} />;
      break;
    default:
      activeLifecycleSpan.addLog("Unhandled state", { "app.state.unhandled": currentStep.id });
      content = <div>FAILURE</div>;
      break;
  }

  return <div className="booth-game-portion">{content}</div>;
}

export type BoothGameProps = {
  resetCount: number;
  advanceTrackedSteps: () => void;
  trackedSteps: TrackedSteps;
  setTracingTeam: (tracingTeam: TracingTeamFromAuth) => void;
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
