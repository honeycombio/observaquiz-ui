// a component that displays where the traces are going
import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { HoneycombRegion } from "../tracing/TracingDestination";

function TracingTrackerInternal() {
  return (
    <div id="tracing-tracker">
      <div>(tracing tracker)</div>
    </div>
  );
}

// move to TracingDestination?
export type TracingTeam = {
  region: HoneycombRegion;
  team: { name: string; slug: string };
  environment: { name: string; slug: string };
};

export type TracingTeamAware = {
  tracingTeam: TracingTeam | undefined;
};

export type TracingTrackerProps = {
  tracingTeam: TracingTeam | undefined;
};

export function TracingTracker(props: TracingTrackerProps) {
  if (!props.tracingTeam) {
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
