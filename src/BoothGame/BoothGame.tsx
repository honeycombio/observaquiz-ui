import React from "react";
import { ApiKeyInput, ApiKeyInputSuccess } from "./ApiKeyInput";
import { QuestionSetRetrieval } from "./QuestionSetRetrieval";
import SessionGateway from "../tracing/SessionGateway";
import { ComponentLifecycleTracing, ActiveLifecycleSpan } from "../tracing/ComponentLifecycleTracing";
import { HowToReset } from "../resetQuiz";
import { Hello } from "./Hello";
import { QuestionSet, Quiz } from "./Quiz";
import { TrackedSteps, advance } from "../Tracker/trackedSteps";
import { TracedState } from "../tracing/TracedState";
import { TracingTeam } from "../tracing/TracingDestination";
import { HoneycombTeamContext } from "./HoneycombTeamContext";

type QuizState =
  | { name: "hello" }
  | { name: "collect email" }
  | { name: "get api key" }
  | { name: "load question set" }
  | { name: "ask questions"; questionSet: QuestionSet };

function BoothGameInternal(props: BoothGameProps) {
  const boothGameLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const { trackedSteps, setTrackedSteps } = props;

  const [currentState, setCurrentState] = React.useState<QuizState>({ name: "hello" });

  function helloBegin() {
    console.log("Let us begin");
    setCurrentState({ name: "get api key" });
    boothGameLifecycleSpan.withLog(
      "change state",
      {
        "app.boothGame.state": "get api key",
        "app.boothGame.previousState": "hello",
      },
      () => {
        setTrackedSteps(advance(trackedSteps.value));
      }
    );
  }

  function acceptApiKey(news: ApiKeyInputSuccess) {
    console.log("Thank you for the api key", news.apiKey);
    boothGameLifecycleSpan.withLog("change state", {
      "app.boothGame.state": "ask questions",
      "app.boothGame.previousState": "get api key",
    }, () => {

      // This will put it on any _new_ spans created. But not span events, and not open spans.
      // TODO: replace this with a processor that retains old spans to dual-send.
      SessionGateway.setSessionValue("apiKey", news.apiKey);
      SessionGateway.setSessionValue("teamSlug", news.team.slug);
      SessionGateway.setSessionValue("environmentSlug", news.environment.slug);

      props.setTracingTeam(news);
      
      setCurrentState({ name: "load question set" });
    });
  }

  function acceptQuestionSet(questionSet: QuestionSet) {
    console.log("Thank you for the question set", questionSet);
    setCurrentState({ name: "ask questions", questionSet });
    boothGameLifecycleSpan.addLog("change state", {
      "app.boothGame.state": "ask questions",
      "app.boothGame.previousState": "load question set",
    });
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
      content = <Quiz questionSet={currentState.questionSet} howToReset={props.howToReset}/>;
      break;
    default:
      boothGameLifecycleSpan.addLog("Unhandled state", { "app.state.unhandled": currentState });
      content = <div>FAILURE</div>;
      break;
  }

  return <div className="booth-game-portion">{content}</div>;
}

export type BoothGameProps = {
  resetCount: number;
  trackedSteps: TracedState<TrackedSteps>;
  setTrackedSteps: (trackedSteps: TrackedSteps) => void;
  setTracingTeam: (tracingTeam: TracingTeam) => void;
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
