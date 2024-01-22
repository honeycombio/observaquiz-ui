import { trace, Span, Context, context, Attributes } from "@opentelemetry/api";
import React, { useContext, useState } from "react";
import { OpentelemetryContext } from "./ComponentLifecycleTracing";

type TracingContext = {
  span: Span;
  context: Context;
};

const OpentelemetryInteractionContext = React.createContext<Context | undefined>(undefined);

export type InteractionSpanType = {
  setAttributes: (attributes: Attributes) => void;
  addEvent: (name: string, attributes?: Attributes) => void;
};

const nilSpan: InteractionSpanType = {
  setAttributes: () => {},
  addEvent: (name: string, attributes?: Attributes) => {},
};

export const InteractionSpan = React.createContext<InteractionSpanType>(nilSpan);

const interactionTracer = trace.getTracer("app/interaction");

export function InteractionTracing(props: { componentName: string; children: React.ReactNode }) {
  const { componentName, children } = props;
  const outerInteractionContext = useContext(OpentelemetryInteractionContext);
  const outerLifecycleContext = useContext(OpentelemetryContext);

  const outerContext = outerInteractionContext || outerLifecycleContext;

  const [interactionSpanAndContext, setInteractionSpanAndContext] = useState<TracingContext | undefined>(undefined);

  function attributesOfMouseEvent(mouseEvent: React.MouseEvent<HTMLElement, MouseEvent>) {
    return {
      "app.interaction.clientX": mouseEvent.clientX,
      "app.interaction.clientY": mouseEvent.clientY,
      "app.some.nonsense": "banana",
      "app.interaction.componentName": componentName,
    };
  }

  function beginInteraction(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    if (!interactionSpanAndContext) {
      const interactionSpanAndContext = interactionTracer.startActiveSpan(
        `mouse enters ${componentName}`,
        {
          attributes: attributesOfMouseEvent(event),
        },
        outerContext,
        (span) => {
          return { span, context: context.active() };
        }
      );
      setInteractionSpanAndContext(interactionSpanAndContext);
      return;
    } else {
      interactionSpanAndContext.span.addEvent(`mouse enters ${componentName} again`, attributesOfMouseEvent(event));
    }
  }

  function endInteraction(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    if (interactionSpanAndContext) {
      const { span } = interactionSpanAndContext;
      span.addEvent(`mouse leaves ${componentName}`, attributesOfMouseEvent(event));
      span.end();
      setInteractionSpanAndContext(undefined);
    }
  }

  return (
    <div className="wrapper-for-tracing" onMouseEnter={beginInteraction} onMouseLeave={endInteraction}>
      <OpentelemetryInteractionContext.Provider value={interactionSpanAndContext?.context || context.active()}>
        <InteractionSpan.Provider value={interactionSpanAndContext?.span || nilSpan}>
          {children}
        </InteractionSpan.Provider>
      </OpentelemetryInteractionContext.Provider>
    </div>
  );
}
