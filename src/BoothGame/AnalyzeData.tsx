import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

function AnalyzeDataInternal() {
  return (
    <div>
      <p>Now I shall ask you a question about your data</p>
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

function queryDefinition(trace_id: string) {
  return `{
  "time_range": 600,
  "granularity": 0,
  "breakdowns": [
      "app.post_answer.question"
  ],
  "calculations": [
      {
          "op": "MAX",
          "column": "duration_ms"
      }
  ],
  "filters": [
      {
          "column": "name",
          "op": "=",
          "value": "Ask LLM for Response"
      },
      {
          "column": "trace.trace_id",
          "op": "=",
          "value": "${trace_id}"
      }
  ],
  "orders": [
      {
          "column": "duration_ms",
          "op": "MAX",
          "order": "descending"
      }
  ],
  "havings": [],
  "limit": 1000
}`;
}
