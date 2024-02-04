import React from "react";
import { ApiKeyInput, ApiKeyInputSuccess } from "./ApiKeyInput";
import { QuestionSet, QuestionSetRetrieval } from "./QuestionSetRetrieval";
import { ComponentLifecycleTracing, ActiveLifecycleSpan } from "../tracing/ComponentLifecycleTracing";
import { Hello } from "./Hello";
import { TracingTeamFromAuth } from "../tracing/TracingDestination";
import { AnalyzeData } from "./analyzeData/AnalyzeData";
import {
  TopLevelSteps,
  TrackedStep,
  TrackedSteps,
  allCompletionResults,
  findCurrentStep,
} from "../Tracker/trackedSteps";
import { TracedState, useTracedState } from "../tracing/TracedState";
import { Question } from "./Question";
import { Win } from "./Win";

function BoothGameInternal(props: BoothGameProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const trackedSteps = useTracedState<TrackedSteps>(props.trackedSteps);
  const currentStep = findCurrentStep(trackedSteps);
  const { advanceTrackedSteps, advanceIntoNewSubsteps, setTracingTeam } = props;

  function helloBegin() {
    console.log("You pushed begin");
    advanceTrackedSteps();
  }

  function acceptApiKey(news: ApiKeyInputSuccess) {
    setTracingTeam(news);
    advanceTrackedSteps();
  }

  function acceptQuestionSet(questionSet: QuestionSet) {
    advanceIntoNewSubsteps([
      {
        id: "retrieve-questions",
        invisible: true,
        completionResults: { complete: true, questionSetId: questionSet.question_set },
      },
      ...questionSet.questions.map((q, i) => ({
        id: `question-${i + 1}`,
        name: "Question",
        parameters: { questionId: q.id, questionText: q.question, questionNumber: i + 1 },
      })),
    ]);
  }

  type QuestionParameters = {
    questionId: string;
    questionText: string;
    questionNumber: number;
  };

  var content = null;
  switch (currentStep.id) {
    case "begin-hello":
      content = <Hello moveForward={helloBegin} />;
      break;
    case "begin-apikey":
      content = <ApiKeyInput moveForward={acceptApiKey} />;
      break;
    case TopLevelSteps.PLAY:
      content = <QuestionSetRetrieval moveForward={acceptQuestionSet} />;
      break;
    case "question-1": // really, any question
    case "question-2":
    case "question-3":
      const parameters = currentStep.parameters! as QuestionParameters;
      content = (
        <Question
          key={parameters.questionNumber}
          questionNumber={parameters.questionNumber}
          questionId={parameters.questionId}
          questionText={parameters.questionText}
          moveForward={advanceTrackedSteps}
        />
      );
      break;
    case TopLevelSteps.LEARN:
      content = <AnalyzeData moveForward={advanceTrackedSteps} />;
      break;
    case TopLevelSteps.WIN:
      const accumulatedScore = countUpScores(trackedSteps);
      content = <Win score={accumulatedScore} />;
      break;
    default:
      activeLifecycleSpan.addLog("Unhandled state", { "app.state.unhandled": currentStep.id });
      console.log("Unhandled state", currentStep.id);
      content = <div>FAILURE</div>;
      break;
  }

  return <div className="booth-game-portion">{content}</div>;
}

export type BoothGameProps = {
  resetCount: number;
  advanceTrackedSteps: (completionResults?: any) => void;
  advanceIntoNewSubsteps: (substeps: TrackedStep[]) => void;
  trackedSteps: TracedState<TrackedSteps>;
  setTracingTeam: (tracingTeam: TracingTeamFromAuth) => void;
};

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

function countUpScores(trackedSteps: TrackedSteps) {
  return allCompletionResults(trackedSteps.steps)
    .map((c: any) => c?.score || 0)
    .reduce((a, b) => a + b, 0); // where is the sum function?
}
