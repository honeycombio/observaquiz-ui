// a component that displays where the traces are going
import React from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { HoneycombRegion } from "../tracing/TracingDestination";
import { getLinkToCurrentSpan } from "../tracing/activeLifecycleSpan";

function TracingTrackerInternal(props: TracingTrackerProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const { tracingTeam } = props;
  if (!tracingTeam) {
    return <div id="tracing-tracker-placeholder"></div>;
  }
  return (
    <div id="tracing-tracker">
      <p>Honeycomb team: {tracingTeam.team.name}</p>
      <p>Environment: {tracingTeam.environment.name}</p>
      <p>
        <a target="_blank" href={getLinkToCurrentSpan(tracingTeam, activeLifecycleSpan)}>
          See current trace
        </a>
      </p>
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
  return (
    <ComponentLifecycleTracing componentName="TracingTracker">
      <div id="tracing-tracker-placeholder">
        <TracingTrackerInternal {...props} />
      </div>
    </ComponentLifecycleTracing>
  );
}
