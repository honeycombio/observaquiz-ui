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
import { KnownTracingDestination } from "./TracingDestination";
import { v4 as uuidv4 } from "uuid";
import { ActiveLifecycleSpanType, ComponentLifecycleSpans, nilSpan, standardAttributes, wrapAsActiveLifecycleSpan } from "./activeLifecycleSpan";

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
  console.log("Existence tracing: beginExistence of ", componentName);
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
      console.log("cheatily returning the span");
      console.log("What baggage do we have?", propagation.getBaggage(context.active()));
      return { span, context: context.active() };
    }
  );
  console.log("Ending span right away", spanThatWeSendRightAway.spanContext().spanId);
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

  console.log("existence tracing: setting active context to ", innerContext);
  setComponentLifecycleSpans({
    spanThatWeWillTryToEnd,
    spanThatWeSendRightAway,
    contextToUseAsAParent: innerContext,
  });
}

function endExistence(componentLifecycleSpans: ComponentLifecycleSpans | undefined, componentName: string) {
  console.log(
    "Existence tracing: endExistence of ",
    componentName,
    "with span",
    componentLifecycleSpans?.spanThatWeWillTryToEnd.spanContext()
  );
  if (componentLifecycleSpans) {
    // no, this has to be a log
    componentLifecycleSpans.spanThatWeWillTryToEnd.end();
    console.log("Emitting a log on unload dammit");
    componentLifecycleLogger.emit({
      body: "Unloaded " + componentName,
      severityNumber: logsAPI.SeverityNumber.INFO,
      severityText: "Unloaded",
      attributes: {
        "jess.telemetry.intent": "lifecycle end event",
        excitementLevel: "ordinary",
        name: "Unloaded",
        ...standardAttributes(componentName),
      },
      context: componentLifecycleSpans.contextToUseAsAParent,
    });
  } else {
    console.log("Ending nonexistence of ", componentName);
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
