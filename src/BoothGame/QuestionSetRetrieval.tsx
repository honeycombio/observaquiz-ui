import React from "react";
import { QuestionSet } from "./Quiz";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { HoneycombTeamContext } from "./HoneycombTeamContext";
import { fetchFromBackend } from "../tracing/fetchFromBackend";

type QuestionSetState = "loading" | "error";

type QuestionSetJson = {
  question_set: string;
  questions: Array<{
    question: string;
    id: string;
  }>;
};

export function QuestionSetRetrievalInternal(props: QuestionSetRetrievalProps) {
  const honeycombTeam = React.useContext(HoneycombTeamContext);
  const { moveForward } = props;
  const span = React.useContext(ActiveLifecycleSpan);

  const [questionSetState, setQuestionSetState] = React.useState<QuestionSetState>("loading");

  React.useEffect(() => {
    fetchFromBackend({ url: "/api/questions", honeycombTeam, span, method: "GET" })
      .then((json) => {
        /* Here, here is the movement */
        moveForward(json as QuestionSetJson);
      })
      .catch((e) => {
        setQuestionSetState("error");
        span.addError("error fetching questions", e);
        console.log("I don't know what to do here!");
      });
  }, [honeycombTeam, moveForward, span]);

  // note: right now QuestionSetJson and the expected QuestionSet type are the same.
  // That does not have to stay true. When the internal type changes, do a translation here.

  var content = null;
  if (questionSetState === "loading") {
    content = (
      <div className="loading">
        <progress>progress</progress>
      </div>
    );
  } else {
    span.addLog("Unhandled state", {
      "error.message": "trying to ask questions but there was an error loading them",
    });
    content = <div className="error">DOOOM</div>;
  }

  return content;
}

type QuestionSetRetrievalProps = { moveForward: (questionSet: QuestionSet) => void };

export function QuestionSetRetrieval(props: QuestionSetRetrievalProps) {
  return (
    <ComponentLifecycleTracing componentName="QuestionSetRetrieval">
      <QuestionSetRetrievalInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
