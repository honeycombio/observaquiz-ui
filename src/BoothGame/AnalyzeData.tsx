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
