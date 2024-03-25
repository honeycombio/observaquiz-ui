import React from "react";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { BACKEND_DATASET_NAME, QueryObject, getTraceLink } from "../../tracing/TracingDestination";
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

  const { queryDefinition, datasetSlug, traceId, scoreAnswer, listAnswers } = props;
  const traceLink = getTraceLink(team, traceId, datasetSlug);

  const [state, setState] = useLocalTracedState<TraceQuestionState>(PleaseLookAtTheData, {
    componentName: "traceQuestion",
  });

  const linkButton = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    linkButton.current?.focus();
  }, [linkButton.current]);

  function lookAtResults() {
    // do not prevent default. It opens a link in a new tab
    setState(LookedAtTheData);
  }

  const formatAnswer = () => "six"
  const chooseCorrectAnswer = (a: any[]) => a[0]

  const questionAndAnswer = state.questionVisible ? (
    <MultipleChoice<T>
      questionText={<>How many spans in this trace are named 'HTTP POST'?</>}
      queryName="span count by name"
      queryDefinition={queryDefinition}
      dataset={BACKEND_DATASET_NAME}
      formatAnswer={formatAnswer}
      chooseCorrectAnswer={chooseCorrectAnswer}
      moveOn={props.moveForward}
    />
  ) : null;

  return (
    <div>
      <a
        id="see-query"
        className="button primary"
        target="_blank"
        href={traceLink}
        onClick={lookAtResults}
        ref={linkButton}
      >
        See the trace in Honeycomb
      </a>
      {questionAndAnswer}
    </div>
  );
}

type AnswerOption = {
  key: string;
  text: string;
};
type Score = {
  score: number,
  remark: string
}

export type TraceQuestionParameters<T> = {
  traceId: string
  queryDefinition: QueryObject
  datasetSlug: string
  scoreAnswer: (answer: AnswerOption) => Score
  listAnswers: (data: Array<T>) => AnswerOption
};

export type TraceQuestionProps<T> = { moveForward: (result: MultipleChoiceResult) => void } & TraceQuestionParameters<T>;
export function TraceQuestion<T>(props: TraceQuestionProps<T>) {
  return (
    <ComponentLifecycleTracing componentName="traceQuestion">
      <TraceQuestionInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
