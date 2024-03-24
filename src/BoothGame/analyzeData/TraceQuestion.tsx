import React from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { BACKEND_DATASET_NAME, HONEYCOMB_DATASET_NAME, QueryObject, getQueryTemplateLink } from "../../tracing/TracingDestination";
import { HoneycombTeamContext, HoneycombTeamContextType } from "../HoneycombTeamContext";
import { MultipleChoice, MultipleChoiceResult } from "./MultipleChoice";
import { fetchFromBackend } from "../../tracing/fetchFromBackend";
import { ActiveLifecycleSpanType, getLinkToCurrentSpan } from "../../tracing/activeLifecycleSpan";

type PleaseLookAtTheData = { stateName: "pleaseLookAtData", questionVisible: false, traceId: string, datasetSlug: string, loading: false };
type LookedAtTheData = { stateName: "lookedAtData", questionVisible: true, loading: false };
const stateLookedAtTheData: LookedAtTheData = { stateName: "lookedAtData", questionVisible: true, loading: false };
type FindTheTraceOfInterest = { stateName: "findTheTrace", questionVisible: false, loading: true };
const stateFindTheTraceOfInterest: FindTheTraceOfInterest = { stateName: "findTheTrace", questionVisible: false, loading: true };

type TraceQuestionState = FindTheTraceOfInterest | PleaseLookAtTheData | LookedAtTheData;

function TraceQuestionInternal<T>(props: TraceQuestionProps<T>) {
  const team = React.useContext(HoneycombTeamContext);
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  if (!team.populated) { // make typescript happy
    throw new Error("Honeycomb team not populated, not ok");
  }

  const { prefaceText, queryDefinition, datasetSlug, chooseCorrectAnswer, formatAnswer } = props;
  const queryLink = getLinkToCurrentSpan(team, activeLifecycleSpan);

  const [state, setState] = useLocalTracedState<TraceQuestionState>(stateFindTheTraceOfInterest, {
    componentName: "analyzeTrace",
  });

  console.log("Rendering trace question")
  React.useEffect(() => {
    console.log("Attempting to pick a trace")
    pickATrace(team, activeLifecycleSpan).then((traceId) => {
      console.log("Trace of interest ", traceId);
      setState({ stateName: "pleaseLookAtData", questionVisible: false, traceId, datasetSlug, loading: false });
      // use the QDAPI to find the trace of interest
    })
  }, []);

  const linkButton = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    linkButton.current?.focus();
  }, [linkButton.current]);

  function lookAtResults() {
    // do not prevent default. It opens a link in a new tab
    setState(stateLookedAtTheData);
  }

  const questionAndAnswer = state.stateName === "pleaseLookAtData" ? (
    <MultipleChoice<T>
      queryDefinition={queryDefinitionFromTrace(state.traceId)}
      dataset={BACKEND_DATASET_NAME}
      formatAnswer={formatAnswer}
      chooseCorrectAnswer={chooseCorrectAnswer}
      moveOn={props.moveForward}
    />
  ) : null;

  const button = state.loading ? <div className="loading"></div> : <a
    id="see-query"
    className="button primary"
    target="_blank"
    href={queryLink}
    onClick={lookAtResults}
    ref={linkButton}
  > See the trace in Honeycomb
  </a>;

  return (
    <div>
      {prefaceText}
      {button}
      {questionAndAnswer}
    </div >
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
  queryDefinition: { // CANT: need trace id
    time_range: 7200,
    granularity: 0,
    calculations: [{ op: "COUNT" }],
    filters: [{ column: "trace.traceId", op: "=", value: "HTTP POST" }],
  },
  datasetSlug: HONEYCOMB_DATASET_NAME, //BACKEND_DATASET_NAME,
  chooseCorrectAnswer: (data: Array<CountTheSpansResponse>) => ({} as CountTheSpansResponse)
  , formatAnswer: (row: CountTheSpansResponse) => "Wow look at this amazing choice, definitely"
}

function queryDefinitionFromTrace(traceId: string) {
  return {
    time_range: 7200,
    granularity: 0,
    calculations: [{ op: "COUNT" }],
    filters: [{ column: "trace.traceId", op: "=", value: traceId }],
    group_by: ["trace.traceId"]
  }
}

export type CountTheSpansResponse = {}


function pickATrace(honeycombTeam: HoneycombTeamContextType, activeLifecycleSpan: ActiveLifecycleSpanType) {
  if (!honeycombTeam.populated) {
    throw new Error("team not populated, not ok")
  }
  const queryDefinition = {
    "query_name": "count events by trace ID", // useful for faking
    "time_range": 7200, // TODO: get this to the beginning of the execution
    "breakdowns": [
      "trace.trace_id"
    ],
    "calculations": [
      {
        "op": "COUNT"
      }
    ],
    "filters": [
      {
        "column": "app.observaquiz.execution_id",
        "op": "=",
        "value": honeycombTeam.execution.executionId
      }
    ],
    "orders": [
      {
        "op": "COUNT",
        "order": "descending"
      }
    ],
    "limit": 10
  }

  const queryDataRequestBody = {
    query: queryDefinition,
    query_name: "Trace with the most spans",
    dataset_slug: BACKEND_DATASET_NAME,
    attendee_api_key: honeycombTeam.auth!.apiKey,
  };

  type ParticularQueryData = {
    "trace.trace_id": string,
    "COUNT": number
  }
  const formatQueryData = (data: ParticularQueryData) => `Trace ${data["trace.trace_id"]} has ${data["COUNT"]} spans`;

  type QueryDataResult<ParticularQueryData> = {
    query_id: string;
    result_id: string;
    error: string;
    query_data: ParticularQueryData[];
  };

  return fetchFromBackend({
    url: "/api/queryData",
    honeycombTeam: honeycombTeam,
    span: activeLifecycleSpan,
    method: "POST",
    body: JSON.stringify(queryDataRequestBody),
    attributesFromJson: (json: QueryDataResult<ParticularQueryData>) => {
      return {
        "app.result.queryId": json.query_id,
        "app.result.resultId": json.result_id,
        "app.result.error": json.error,
      };
    },
  }).then((json) => {
    console.log("Answers retrieved", json);
    const queryDataReturned = json as QueryDataResult<ParticularQueryData>;
    if (queryDataReturned.error) {
      throw new Error("failed to fetch query data: " + queryDataReturned.error)
    } else {
      if (!queryDataReturned.query_data) {
        throw new Error("what even is in here: " + JSON.stringify(queryDataReturned))
      }
      const traceId = queryDataReturned.query_data[0]["trace.trace_id"];
      activeLifecycleSpan.addLog("have answers", {
        "app.traceQuestion.trace_query_id": queryDataReturned.query_id,
        "app.traceQuestion.trace_query_full_result": JSON.stringify(queryDataReturned.query_data),
        "app.traceQuestios.results": queryDataReturned.query_data.map(formatQueryData),
        "app.tracequestions.traceWithMostSpans": traceId,
      },
      );
      return traceId;
    }
  });
}