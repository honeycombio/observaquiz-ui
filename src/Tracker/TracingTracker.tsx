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

export type TracingDestination = {
  team: { name: string; slug: string };
  environment: { name: string; slug: string };
  dataset: string;
};

export type TracingTrackerProps = {
  tracingDestination: TracingDestination | undefined;
};

export function TracingTracker(props: TracingTrackerProps) {
  if (!props.tracingDestination) {
    return <div id="tracing-tracker-placeholder"></div>;
  }
  return (
    <ComponentLifecycleTracing componentName="TracingTracker">
      <div id="tracing-tracker-placeholder">
        <TracingTrackerInternal />
      </div>
    </ComponentLifecycleTracing>
  );
}
