import React from "react";
import { Configuration } from "../Configuration";
import { QuestionSet } from "./Quiz";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

type QuestionSetState = "loading" | "error";

type QuestionSetJson = {
  question_set: string;
  questions: Array<{
    question: string;
    id: string;
  }>;
};

export function QuestionSetRetrievalInternal(props: QuestionSetRetrievalProps) {
  const config = React.useContext(Configuration);
  const span = React.useContext(ActiveLifecycleSpan);

  const [questionSetState, setQuestionSetState] = React.useState<QuestionSetState>("loading");

  React.useEffect(() => {
    // TODO: put this call in a span
    span
      .inSpanAsync("fetch questions", {}, () =>
        fetch("/api/questions")
          .then((response) => {
            span.setAttributes({ "app.questions.status": response.status });
            if (response.ok) {
              return response.json();
            } else {
              throw new Error(`Error fetching questions. Status: ${response.status}`);
            }
          })
          .then((json) => {
            span.setAttributes({ "app.questions.response": JSON.stringify(json) });
            /* Here, here is the movement */
            props.moveForward(json as QuestionSetJson);
          })
      )
      .catch((e) => {
        // enter error state?
        setQuestionSetState("error");
        // TODO: add an error method that adds the exception, and sets the span status
        span.addLog("error fetching questions", { "error.message": e.message });
        console.log("I don't know what to do here!");
      });
  }, []);

  // note: right now QuestionSetJson and the expected QuestionSet type are the same.
  // That does not have to stay true. When the internal type changes, do a translation here.

  var content = null;
  if (questionSetState === "loading") {
    content = <div className="loading">...</div>;
  } else {
    span.addLog("Unhandled state", {
      "error.message": "trying to ask questions but there was an error loading them",
    });
    content = <div className="loading error">"DOOOM";</div>;
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
