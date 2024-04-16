import React from "react";
import { ApiKeyInputSuccess } from "./connectToHoneycomb/ApiKeyInput";
import { QuestionSet, QuestionSetRetrieval } from "./QuestionSetRetrieval";
import { ComponentLifecycleTracing, ActiveLifecycleSpan } from "../tracing/ComponentLifecycleTracing";
import { Hello } from "./Hello";
import { TracingTeamFromAuth } from "../tracing/TracingDestination";
import { AnalyzeData } from "./analyzeData/AnalyzeData";
import { Event } from "./Event"
import {
  TopLevelSteps,
  TrackedStep,
  TrackedSteps,
  allCompletionResults,
  findCurrentStep,
} from "../Tracker/trackedSteps";
import { TracedState, useTracedState } from "../tracing/TracedState";
import { TextQuestion } from "./TextQuestion";
import { Win } from "./Win";
import { LeadThemToTheirApiKey } from "./connectToHoneycomb/LeadThemToTheirApiKey";
import { DataQuestion } from "./analyzeData/DataQuestion";
import { whichResponseTookTheLongestQuestionParameters } from "./analyzeData/DataQuestionParameters";
import { HoneycombTeamContext } from "./HoneycombTeamContext";
import { TheNextQuestionParameters, TraceQuestionIntroduction } from "./analyzeData/TraceQuestionIntroduction";

const HardCodedEvent = {
  eventName: "LLM Application Observability",
};

function BoothGameInternal(props: BoothGameProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const team = React.useContext(HoneycombTeamContext);
  const trackedSteps = useTracedState<TrackedSteps>(props.trackedSteps);
  const currentStep = findCurrentStep(trackedSteps);
  const { advanceTrackedSteps, advanceIntoNewSubsteps, addAuthToTracingTeam, addMonikerToTracingTeam } = props;

  React.useEffect(() => {
    // just once, go through completed steps and catch up our in-memory stuff
    allCompletionResults(trackedSteps.steps).forEach((completionResults) => {
      console.log("Processing completion results: ", completionResults);
      if (completionResults.tracingTeam?.moniker) {
        activeLifecycleSpan.withLog(
          "Begin has already completed",
          { "app.completionResults": JSON.stringify(completionResults) },
          () => addMonikerToTracingTeam(completionResults.tracingTeam)
        );
      }
      if (completionResults.tracingTeam?.apiKey) {
        activeLifecycleSpan.withLog(
          "ApiKeyInput has already completed",
          { "app.completionResults": JSON.stringify(completionResults) },
          () => addAuthToTracingTeam(completionResults.tracingTeam)
        );
      }
    });
  }, []);

  function helloBegin(result: { moniker: string }) {
    addMonikerToTracingTeam(result);
    advanceTrackedSteps({ tracingTeam: result });
  }

  function acceptApiKey(news: ApiKeyInputSuccess) {
    addAuthToTracingTeam(news);
    advanceTrackedSteps({ tracingTeam: news });
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
      content = <Hello eventName={HardCodedEvent.eventName} moveForward={helloBegin} />;
      break;
    case "begin-apikey":
      content = <LeadThemToTheirApiKey moveForward={acceptApiKey} />;
      break;
    case TopLevelSteps.PLAY:
      content = <QuestionSetRetrieval moveForward={acceptQuestionSet} />;
      break;
    case "question-1": // really, any question
    case "question-2":
    case "question-3":
      const questionParameters = currentStep.parameters! as QuestionParameters;
      content = (
        <TextQuestion
          key={questionParameters.questionNumber}
          questionNumber={questionParameters.questionNumber}
          questionId={questionParameters.questionId}
          questionText={questionParameters.questionText}
          moveForward={advanceTrackedSteps}
        />
      );
      break;
    case TopLevelSteps.LEARN:
      content = <AnalyzeData defineDataQuestions={advanceIntoNewSubsteps} />;
      break;
    case "data-question-1":
      if (!team.populated) {
        throw new Error("Honeycomb team not populated, not ok");
      }
      content = <DataQuestion key={currentStep.id} moveForward={advanceTrackedSteps} {...whichResponseTookTheLongestQuestionParameters(activeLifecycleSpan, team)} />;
      break;
    case "trace-question-2":
      content = <TraceQuestionIntroduction key={currentStep.id} moveForward={advanceTrackedSteps} {...TheNextQuestionParameters} />;
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
  addAuthToTracingTeam: (tracingTeam: TracingTeamFromAuth) => void;
  addMonikerToTracingTeam: (protagonist: { moniker: string }) => void;
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
