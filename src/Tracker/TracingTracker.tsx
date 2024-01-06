// a component that displays where the traces are going
import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

function TracingTrackerInternal() {
  return (
    <div className="tracing-tracker">
      <h2>Tracing Tracker</h2>
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
