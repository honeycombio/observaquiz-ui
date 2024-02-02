import React from "react";
import { ComponentLifecycleTracing, ActiveLifecycleSpan } from "../../tracing/ComponentLifecycleTracing";
import { HowToReset } from "../../resetQuiz";

function MultipleChoiceInternal(props: HowToReset) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);

  const questionText = "Which question led to the slowest response?";

  function resetQuiz(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    // this will remove this component entirely
    activeLifecycleSpan.addLog("reset quiz");
    props.howToReset(activeLifecycleSpan);
  }

  return (
    <div id="multiple-choice">
      <p className="question-text">{questionText}</p>
      <p>
        <textarea name="answer" className="answer-goes-here" />
      </p>
      <p>
        <button id="question-go" type="submit">
          Submit
        </button>
        <button className="button clear pull-right" onClick={resetQuiz}>
          Reset quiz
        </button>
      </p>
    </div>
  );
}

type MultipleChoiceProps = {} & HowToReset;
export function MultipleChoice(props: MultipleChoiceProps) {
  return (
    <ComponentLifecycleTracing componentName="MultipleChoice">
      <MultipleChoiceInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
