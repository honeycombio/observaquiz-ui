import React from "react";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { BACKEND_DATASET_NAME, getQueryTemplateLink } from "../../tracing/TracingDestination";
import { HoneycombTeamContext } from "../HoneycombTeamContext";
import { MultipleChoice, MultipleChoiceResult } from "./MultipleChoice";
import { DataQuestionParameters } from "./DataQuestionParameters";

const PleaseLookAtTheData = { questionVisible: false };
const LookedAtTheData = { questionVisible: true };

type DataQuestionState = typeof PleaseLookAtTheData | typeof LookedAtTheData;

function DataQuestionInternal<T>(props: DataQuestionProps<T>) {
  const team = React.useContext(HoneycombTeamContext);
  if (!team.populated) { // make typescript happy
    throw new Error("Honeycomb team not populated, not ok");
  }

  const { prefaceText, queryDefinition, datasetSlug } = props;
  const queryLink = getQueryTemplateLink(team.auth!, queryDefinition, datasetSlug);

  const [state, setState] = useLocalTracedState<DataQuestionState>(PleaseLookAtTheData, {
    componentName: "analyzeData",
  });

  const linkButton = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    linkButton.current?.focus();
  }, [linkButton.current]);

  function lookAtResults() {
    // do not prevent default. It opens a link in a new tab
    setState(LookedAtTheData);
  }

  const questionAndAnswer = state.questionVisible ? (
    <MultipleChoice<T>
      questionText={<>Which question led to the slowest response?</>}
      queryDefinition={queryDefinition}
      queryName="Slowest response from LLM"
      dataset={BACKEND_DATASET_NAME}
      moveOn={props.moveForward}
      interpretData={props.interpretData}
    />
  ) : null;

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


export type DataQuestionProps<T> = { moveForward: (result: MultipleChoiceResult) => void } & DataQuestionParameters<T>;
export function DataQuestion<T>(props: DataQuestionProps<T>) {
  return (
    <ComponentLifecycleTracing componentName="analyze-data">
      <DataQuestionInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
