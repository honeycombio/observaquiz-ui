import React from "react";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { BACKEND_DATASET_NAME, getQueryTemplateLink } from "../../tracing/TracingDestination";
import { HoneycombTeamContext } from "../HoneycombTeamContext";
import { MultipleChoice, MultipleChoiceResult } from "./MultipleChoice";
import { DataFromLongestLLMResponse, DataQuestionParameters } from "./DataQuestionParameters";

const PleaseLookAtTheData = { questionVisible: false };
const LookedAtTheData = { questionVisible: true };

type DataQuestionState = typeof PleaseLookAtTheData | typeof LookedAtTheData;

function DataQuestionInternal(props: DataQuestionProps) {
  const team = React.useContext(HoneycombTeamContext);
  if (!team.populated) { // make typescript happy
    throw new Error("Honeycomb team not populated, not ok");
  }

  const { prefaceText, queryDefinition, datasetSlug } = props;
  const queryLink = getQueryTemplateLink(team.auth!, queryDefinition, datasetSlug );
  function chooseCorrectAnswer(data: Array<DataFromLongestLLMResponse>): DataFromLongestLLMResponse {
    const maxDuration = Math.max(...data.map((row) => row["MAX(duration_ms)"] as number));
    const maxRow = data.find((row) => row["MAX(duration_ms)"] === maxDuration);
    // handle a tie? This one is extremely unlikely to tie
    return maxRow!;
  }
  function formatAnswer(row: DataFromLongestLLMResponse): string {
    return row["app.post_answer.question"];
  }

  const [state, setState] = useLocalTracedState<DataQuestionState>(PleaseLookAtTheData, {
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
    <MultipleChoice<DataFromLongestLLMResponse>
      queryDefinition={queryDefinition}
      dataset={BACKEND_DATASET_NAME}
      formatAnswer={formatAnswer}
      chooseCorrectAnswer={chooseCorrectAnswer}
      moveOn={props.moveForward}
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


export type DataQuestionProps = { moveForward: (result: MultipleChoiceResult) => void } & DataQuestionParameters;
export function DataQuestion(props: DataQuestionProps) {
  return (
    <ComponentLifecycleTracing componentName="analyze-data">
      <DataQuestionInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
