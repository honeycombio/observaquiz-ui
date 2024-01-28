import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

// TODO: JESS: when online, download the css from the framework, so I have it on airplanes

function AnalyzeDataInternal() {
  const queryLink = "https://honeycomb";
  return (
    <div>
      <p>
        Now it's time to look at the performance of this Observaquiz application. Your Honeycomb team has data about
        your experience answering those questions just now.
      </p>
      <p>We call out to OpenAI to get a response to your answers. Which question took the longest?</p>
      <a id="see-query" className="button" target="_blank" href={queryLink}>
        See query results in Honeycomb
      </a>
    </div>
  );
}

export function AnalyzeData() {
  return (
    <ComponentLifecycleTracing componentName="analyze-data">
      <AnalyzeDataInternal />
    </ComponentLifecycleTracing>
  );
}

/**
 * Run this in dataset 'observaquiz-bff'
 *
 */
function queryForLongestLLMReponse(trace_id: string) {
  return {
    time_range: 600,
    granularity: 0,
    breakdowns: ["app.post_answer.question"],
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
        column: "trace.trace_id",
        op: "=",
        value: "${trace_id}",
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
