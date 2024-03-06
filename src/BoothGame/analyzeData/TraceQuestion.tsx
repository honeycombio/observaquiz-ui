import React from "react";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { BACKEND_DATASET_NAME, QueryObject, getQueryTemplateLink } from "../../tracing/TracingDestination";
import { HoneycombTeamContext } from "../HoneycombTeamContext";
import { MultipleChoice, MultipleChoiceResult } from "./MultipleChoice";

const PleaseLookAtTheData = { questionVisible: false };
const LookedAtTheData = { questionVisible: true };

type TraceQuestionState = typeof PleaseLookAtTheData | typeof LookedAtTheData;

function TraceQuestionInternal<T>(props: TraceQuestionProps<T>) {
  const team = React.useContext(HoneycombTeamContext);
  if (!team.populated) { // make typescript happy
    throw new Error("Honeycomb team not populated, not ok");
  }

  const { prefaceText, queryDefinition, datasetSlug, chooseCorrectAnswer, formatAnswer } = props;
  const queryLink = getQueryTemplateLink(team.auth!, queryDefinition, datasetSlug);

  const [state, setState] = useLocalTracedState<TraceQuestionState>(PleaseLookAtTheData, {
    componentName: "analyzeData",
  });

  const linkButton = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    console.log("Focus on link, please", linkButton);
    linkButton.current?.focus();
  }, [linkButton.current]);

  function lookAtResults() {
    // do not prevent default. It opens a link in a new tab
    setState(LookedAtTheData);
  }

  const questionAndAnswer = state.questionVisible ? (
    <MultipleChoice<T>
      queryDefinition={queryDefinition}
      dataset={BACKEND_DATASET_NAME}
      formatAnswer={formatAnswer}
      chooseCorrectAnswer={chooseCorrectAnswer}
      moveOn={props.moveForward}
    />
  ) : null;

  console.log("Is it the prefaceText? ", prefaceText)


  return (
    <div>
      {prefaceText}
      <a
        id="see-query"
        className="button primary"
        target="_blank"
        href={queryLink}
        onClick={lookAtResults}
        ref={linkButton}
      >
        See query results in Honeycomb
      </a>
      {questionAndAnswer}
    </div>
  );
}

export type TraceQuestionParameters<T> = {
  prefaceText: React.ReactNode
  queryDefinition: QueryObject
  datasetSlug: string
  chooseCorrectAnswer: (data: Array<T>) => T
  formatAnswer: (row: T) => string
};

export type TraceQuestionProps<T> = { moveForward: (result: MultipleChoiceResult) => void } & TraceQuestionParameters<T>;
export function TraceQuestion<T>(props: TraceQuestionProps<T>) {
  return (
    <ComponentLifecycleTracing componentName="analyze-trace">
      <TraceQuestionInternal {...props} />
    </ComponentLifecycleTracing>
  );
}


// Data Question 2 is a Trace Question
export const TheNextQuestionParameters: TraceQuestionParameters<CountTheSpansResponse> = {
  prefaceText: <>
      <p>
          This trace represents one call to our Observaquiz backend.
      </p><p className="fine-print">
          Each row in the trace is called a span; it represents some unit of work that was part of
          fulfilling the request. Each span has a name, and a portion of the timeline representing when it occurred
          and how long it took.
      </p>
      <p>
          How many spans in this trace are called `HTTP POST`?
      </p>
  </>,
  queryDefinition: { // TODO: define
      time_range: 0,
      granularity: 0,
      calculations: []
  },
  datasetSlug: BACKEND_DATASET_NAME,
  chooseCorrectAnswer: (data: Array<CountTheSpansResponse>) => ({} as CountTheSpansResponse)
  , formatAnswer: (row: CountTheSpansResponse) => "Wow look at this amazing choice, definitely"
}

export type CountTheSpansResponse = {}
