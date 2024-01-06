// a component that displays where the traces are going
import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

function TracingTrackerInternal() {
  return (
    <div id="tracing-tracker">
      <div>(tracing tracker)</div>
    </div>
  );
}

export function TracingTracker() {
  return (
    <ComponentLifecycleTracing componentName="TracingTracker">
      <TracingTrackerInternal />
    </ComponentLifecycleTracing>
  );
}
