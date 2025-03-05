// a component that displays where the traces are going
import React from "react";
import {
  ActiveLifecycleSpan,
  ComponentLifecycleTracing,
} from "../tracing/ComponentLifecycleTracing";
import { getLinkToCurrentSpan } from "../tracing/activeLifecycleSpan";
import { HoneycombTeamContext } from "../BoothGame/HoneycombTeamContext";

function TracingTrackerInternal(props: TracingTrackerProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const honeycombTeam = React.useContext(HoneycombTeamContext);
  if (!honeycombTeam.populated) {
    return <></>;
  }
  return (
    <a
      className="button clear pull-right"
      target="_blank"
      href={getLinkToCurrentSpan(honeycombTeam, activeLifecycleSpan)}
    >
      See current trace
    </a>
  );
}

type TracingTrackerProps = {};

export function TracingTracker(props: TracingTrackerProps) {
  return (
    <ComponentLifecycleTracing componentName="TracingTracker">
      <div id="tracing-tracker-placeholder">
        <TracingTrackerInternal {...props} />
      </div>
    </ComponentLifecycleTracing>
  );
}
