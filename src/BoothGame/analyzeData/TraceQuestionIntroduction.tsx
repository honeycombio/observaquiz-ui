import React from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { BACKEND_DATASET_NAME, HONEYCOMB_DATASET_NAME, QueryObject, TracingTeam, secondsSinceTheExecutionBegan } from "../../tracing/TracingDestination";
import { HoneycombTeamContext, HoneycombTeamContextType } from "../HoneycombTeamContext";
import { AnswerOption, MultipleChoice, MultipleChoiceResult, Score, WhatMultipleChoiceNeedsToKnow } from "./MultipleChoice";
import { fetchFromBackend } from "../../tracing/fetchFromBackend";
import { ActiveLifecycleSpanType, getLinkToCurrentSpan } from "../../tracing/activeLifecycleSpan";
import { DataQuestion } from "./DataQuestion";
import { TraceQuestion } from "./TraceQuestion";

type TraceOfInterestData = {
  traceId: string,
  datasetSlug: string
}

const FindTheTraceOfInterest = { stateName: "findTheTrace", questionVisible: false };
type ShowTheQuestion = { stateName: "Show the question", questionVisible: true } & TraceOfInterestData

type TraceQuestionState = typeof FindTheTraceOfInterest | ShowTheQuestion;
function isReadyForQuestion(state: TraceQuestionState): state is ShowTheQuestion {
  return state.stateName === "Show the question"
}

function TraceQuestionIntroductionInternal<T>(props: TraceQuestionIntroductionProps<T>) {
  const team = React.useContext(HoneycombTeamContext);
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  if (!team.populated) { // make typescript happy
    throw new Error("Honeycomb team not populated, not ok");
  }

  const { introductoryText, queryDefinition, datasetSlug } = props;

  const [state, setState] = useLocalTracedState<TraceQuestionState>(FindTheTraceOfInterest, {
    componentName: "traceQuestionIntroduction",
  });

  console.log("Rendering trace question")
  React.useEffect(() => {
    console.log("Attempting to pick a trace")
    // use the QDAPI to find a trace of interest
    pickATrace(team, activeLifecycleSpan).then((traceId) => {
      console.log("Trace of interest ", traceId);
      setState({ stateName: "Show the question", questionVisible: true, traceId, datasetSlug, });
    })
  }, []);


  const questionAndAnswer = isReadyForQuestion(state) ? (
    <TraceQuestion<T>
      queryDefinition={queryDefinition(state.traceId)}
      traceId={state.traceId}
      datasetSlug={state.datasetSlug}
      interpretData={props.interpretData}
      moveForward={props.moveForward}
    />
  ) : null;

  return (
    <div>
      {introductoryText}
      {questionAndAnswer}
    </div >
  );
}


// Data Question 2 is a Trace Question
export const TheNextQuestionParameters: TraceQuestionParameters<CountTheSpansResponse> = {
  introductoryText: <>
    <p>
      This trace represents one call to our Observaquiz backend.
    </p><p className="fine-print">
      Each row in the trace is called a span; it represents some unit of work that was part of
      fulfilling the request. Each span has a name, and a portion of the timeline representing when it occurred
      and how long it took.
    </p>
  </>,
  queryDefinition: (traceId: string) => ({
    granularity: 0,
    calculations: [{ op: "COUNT" }],
    filters: [{ column: "trace.trace_id", op: "=", value: traceId }],
    breakdowns: ["name"]
  }),
  datasetSlug: BACKEND_DATASET_NAME,
  interpretData: dealWithData
}


/*
    {
      "COUNT": 2,
      "name": "HTTP POST"
    },
    */
type CountTheSpansResponse = {
  "COUNT": number;
  "name": string;
}

function dealWithData(data: CountTheSpansResponse[]): WhatMultipleChoiceNeedsToKnow {
  const howManyHttpPosts: CountTheSpansResponse | undefined = data.find((a: CountTheSpansResponse) => a.name === "HTTP POST")
  const correctNumber = howManyHttpPosts ? howManyHttpPosts.COUNT : 0;
  const someNumbers: number[] = [...new Set([0, 1, 3, 6, correctNumber])].sort();
  return {
    answers: someNumbers.map(n => ({ key: "" + n, text: "" + n })),
    scoreAnswer: (a) => {
      return a.key === "" + correctNumber ?
        { points: 300, remark: "Correct!! 300 points." } :
        { points: 0, remark: "Hmm, I saw " + correctNumber + ". 0 points" }
    }
  }
}



function pickATrace(honeycombTeam: HoneycombTeamContextType, activeLifecycleSpan: ActiveLifecycleSpanType) {
  if (!honeycombTeam.populated) {
    throw new Error("team not populated, not ok")
  }
  const queryDefinition = {
    "query_name": "count events by trace ID", // useful for faking
    "time_range": secondsSinceTheExecutionBegan(honeycombTeam),
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
        "app.traceQuestion.results": queryDataReturned.query_data.map(formatQueryData),
        "app.traceQuestion.traceWithMostSpans": traceId,
      },
      );
      return traceId;
    }
  });
}

export type TraceQuestionParameters<T> = {
  introductoryText: React.ReactNode
  queryDefinition: (traceId: string) => QueryObject
  datasetSlug: string
  interpretData: (data: T[]) => WhatMultipleChoiceNeedsToKnow;
};


export type TraceQuestionIntroductionProps<T> = { moveForward: (result: MultipleChoiceResult) => void } & TraceQuestionParameters<T>;
export function TraceQuestionIntroduction<T>(props: TraceQuestionIntroductionProps<T>) {
  return (
    <ComponentLifecycleTracing componentName="traceQuestionIntroduction">
      <TraceQuestionIntroductionInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
