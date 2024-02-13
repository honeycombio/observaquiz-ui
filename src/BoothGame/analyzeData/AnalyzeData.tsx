import React from "react";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { BACKEND_DATASET_NAME, getQueryTemplateLink } from "../../tracing/TracingDestination";
import { HoneycombTeamContext } from "../HoneycombTeamContext";
import { MultipleChoice, MultipleChoiceResult } from "./MultipleChoice";

const PleaseLookAtTheData = { questionVisible: false };
const LookedAtTheData = { questionVisible: true };

type AnalyzeDataState = typeof PleaseLookAtTheData | typeof LookedAtTheData;

function AnalyzeDataInternal(props: AnalyzeDataProps) {
  const team = React.useContext(HoneycombTeamContext);
  if (!team.populated) {
    throw new Error("Honeycomb team not populated, not ok");
  }

  const [state, setState] = useLocalTracedState<AnalyzeDataState>(PleaseLookAtTheData, {
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

  const queryDefinition = queryForLongestLLMResponse(team.execution.executionId);

  const queryLink = getQueryTemplateLink(team.auth!, queryDefinition, BACKEND_DATASET_NAME);

  function formatAnswer(row: DataFromLongestLLMResponse): string {
    return row["app.post_answer.question"];
  }
  function chooseCorrectAnswer(data: Array<DataFromLongestLLMResponse>): DataFromLongestLLMResponse {
    const maxDuration = Math.max(...data.map((row) => row["MAX(duration_ms)"] as number));
    const maxRow = data.find((row) => row["MAX(duration_ms)"] === maxDuration);
    // handle a tie? This one is extremely unlikely to tie
    return maxRow!;
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
      <p>
        Now it's time to look at the performance of this Observaquiz application. Your Honeycomb team has data about
        your experience answering those questions just now.
      </p>
      <p>
        We call out to OpenAI to get a response to your answers. In Honeycomb, we can run a query about how long those
        took.
      </p>
      <p>Please look at these results (hint: scroll down to see the table below the graph)</p>
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
export type AnalyzeDataProps = { moveForward: (result: MultipleChoiceResult) => void };
export function AnalyzeData(props: AnalyzeDataProps) {
  return (
    <ComponentLifecycleTracing componentName="analyze-data">
      <AnalyzeDataInternal {...props} />
    </ComponentLifecycleTracing>
  );
}

type DataFromLongestLLMResponse = {
  "MAX(duration_ms)": number;
  "app.post_answer.question": string;
};
/**
 * Run this in dataset 'observaquiz-bff'
 */
function queryForLongestLLMResponse(execution_id: string) {
  return {
    time_range: 600,
    granularity: 0,
    breakdowns: ["app.post_answer.question", "app.llm.input", "app.llm.output"],
    calculations: [
      {
        op: "MAX",
        column: "duration_ms",
      },
    ],
    filters: [
      {
        column: "name",
        op: "=",
        value: "Ask LLM for Response",
      },
      {
        column: "app.observaquiz.execution_id",
        op: "=",
        value: execution_id,
      },
    ],
    orders: [
      {
        column: "duration_ms",
        op: "MAX",
        order: "descending",
      },
    ],
    havings: [],
    limit: 1000,
  };
}
