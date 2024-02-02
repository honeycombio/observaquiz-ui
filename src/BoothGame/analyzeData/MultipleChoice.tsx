import React from "react";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";

function MultipleChoiceInternal() {
  return (
    <div id="multiple-choice">
        <p id="analysis-question">Which question took the longest?</p>
        <textarea id="analysis-answer"></textarea>
        <button>Submit</button>
      </div>
  );
}
export function MultipleChoice() {
  return <ComponentLifecycleTracing componentName="MultipleChoice" >
    <MultipleChoiceInternal />
    </ComponentLifecycleTracing>;
}
