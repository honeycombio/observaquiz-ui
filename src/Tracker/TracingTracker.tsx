// a component that displays where the traces are going
import React from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { getLinkToCurrentSpan } from "../tracing/activeLifecycleSpan";
import { HoneycombTeamContext } from "../BoothGame/HoneycombTeamContext";

function TracingTrackerInternal(props: TracingTrackerProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const honeycombTeam = React.useContext(HoneycombTeamContext);
  if (!honeycombTeam.populated) {
    return <div id="tracing-tracker-placeholder"></div>;
  }
  return (
    <div id="tracing-tracker">
      <p>Honeycomb team: {honeycombTeam.team.name}</p>
      <p>Environment: {honeycombTeam.environment.name}</p>
      <p>
        <a target="_blank" href={getLinkToCurrentSpan(honeycombTeam, activeLifecycleSpan)}>
          See current trace
        </a>
      </p>
    </div>
  );
}

type TracingTrackerProps = {}

export function TracingTracker(props: TracingTrackerProps) {
  return (
    <ComponentLifecycleTracing componentName="TracingTracker">
      <div id="tracing-tracker-placeholder">
        <TracingTrackerInternal {...props} />
      </div>
    </ComponentLifecycleTracing>
  );
}
