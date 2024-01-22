import {
  trace,
  propagation,
  Span,
  Context,
  context,
  Attributes,
  SpanContext,
  SpanStatusCode,
} from "@opentelemetry/api";
import React, { useContext, useState } from "react";
import * as logsAPI from "@opentelemetry/api-logs";
import {
  ActiveLifecycleSpanType,
  ComponentLifecycleSpans,
  nilSpan,
  standardAttributes,
  wrapAsActiveLifecycleSpan,
} from "./activeLifecycleSpan";

// only used in this and the other tracing class.
export const OpentelemetryContext = React.createContext<Context>(context.active()!);

export const ActiveLifecycleSpan = React.createContext<ActiveLifecycleSpanType>(nilSpan);

const componentLifecycleTracer = trace.getTracer("app/component-lifecycle");
const componentLifecycleLogger = logsAPI.logs.getLogger("app/component-lifecycle");

export type ComponentLifecycleTracingProps = {
  componentName: string;
  team?: string;
  attributes?: Attributes;
  children: React.ReactNode;
};

function beginExistence(
  setComponentLifecycleSpans: (cls: ComponentLifecycleSpans) => void,
  componentName: string,
  outerContext: Context,
  attributes?: Attributes
) {
  const { span: spanThatWeSendRightAway, context: innerContext } = componentLifecycleTracer.startActiveSpan(
    `${componentName}`,
    {
      attributes: {
        "jess.telemetry.intent": "lifecycle structural span",
        ...standardAttributes(componentName),
        ...attributes,
      },
    },
    outerContext,
    (span) => {
      return { span, context: context.active() };
    }
  );
  spanThatWeSendRightAway.end(); // ship it so something will be there
  const spanThatWeWillTryToEnd = componentLifecycleTracer.startSpan(
    `${componentName} existence`,
    {
      attributes: {
        "jess.telemetry.intent": "lifecycle duration span",
        ...standardAttributes(componentName),
        ...attributes,
      },
    },
    innerContext
  );

  setComponentLifecycleSpans({
    spanThatWeWillTryToEnd,
    spanThatWeSendRightAway,
    contextToUseAsAParent: innerContext,
  });
}

function endExistence(componentLifecycleSpans: ComponentLifecycleSpans | undefined, componentName: string) {
  if (componentLifecycleSpans) {
    // no, this has to be a log
    componentLifecycleSpans.spanThatWeWillTryToEnd.end();
    componentLifecycleLogger.emit({
      body: "Unloaded " + componentName,
      severityNumber: logsAPI.SeverityNumber.INFO,
      severityText: "Unloaded",
      attributes: {
        "jess.telemetry.intent": "lifecycle end event",
        excitementLevel: "begrudging",
        name: "Unloaded",
        ...standardAttributes(componentName),
      },
      context: componentLifecycleSpans.contextToUseAsAParent,
    });
  } else {
  }
}

export function ComponentLifecycleTracing(props: ComponentLifecycleTracingProps) {
  const { componentName, children, team } = props;
  const [componentLifecycleSpans, setComponentLifecycleSpans] = useState<ComponentLifecycleSpans | undefined>(
    undefined
  );
  var outerContext = useContext(OpentelemetryContext);
  if (team) {
    outerContext = propagation.setBaggage(
      outerContext,
      propagation.createBaggage({ "app.team": { value: team || "unset" } })
    );
  }

  // TODO: set team as baggage

  if (!componentLifecycleSpans) {
    beginExistence(setComponentLifecycleSpans, componentName, outerContext, props.attributes);
  }

  //TODO: if attributes change, add those values to the existing span

  React.useEffect(() => {
    return () => endExistence(componentLifecycleSpans, componentName);
  }, [componentLifecycleSpans]);

  return (
    <OpentelemetryContext.Provider value={componentLifecycleSpans?.contextToUseAsAParent || context.active()}>
      <ActiveLifecycleSpan.Provider
        value={componentLifecycleSpans ? wrapAsActiveLifecycleSpan(componentName, componentLifecycleSpans) : nilSpan}
      >
        {children}
      </ActiveLifecycleSpan.Provider>
    </OpentelemetryContext.Provider>
  );
}
