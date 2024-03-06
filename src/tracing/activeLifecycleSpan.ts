import { trace, Span, Context, context, Attributes, SpanContext, SpanStatusCode } from "@opentelemetry/api";
import * as logsAPI from "@opentelemetry/api-logs";
import { v4 as uuidv4 } from "uuid";
import { TracingTeam, getUrlToDataset } from "./TracingDestination";

export type ComponentLifecycleSpans = {
  spanThatWeSendRightAway: Span; // use this for logs & as a parent for other spans
  spanThatWeWillTryToEnd: Span; // use this for attributes and duration
  contextToUseAsAParent: Context;
};

export type ActiveLifecycleSpanType = {
  componentName?: string;
  setAttributes: (attributes: Attributes) => void;
  addLog: (name: string, attributes?: Attributes) => void;
  withLog<T>(name: string, attributes: Attributes, fn: () => T): T;
  addError: (name: string, error?: Error, attributes?: Attributes) => void;
  inSpan<T>(name: string, attributes: Attributes, fn: () => T): T;
  inSpanAsync<T>(name: string, attributes: Attributes, fn: (span?: Span) => Promise<T>): Promise<T>;
  spanContext(): SpanContext | undefined;
  inContext<T>(fn: () => T): T;
};

export const nilSpan: ActiveLifecycleSpanType = {
  setAttributes: () => {},
  addLog: (name: string, attributes?: Attributes) => {},
  withLog: <T>(name: string, attributes: Attributes, fn: () => T): T => fn(),
  addError: (name: string, error?: Error, attributes?: Attributes) => {},
  spanContext: () => undefined,
  inSpan: (name: string, attributes: Attributes, fn: () => any) => fn(),
  inSpanAsync: (name: string, attributes: Attributes, fn: (span?: Span) => any) => fn(undefined),
  inContext: (fn: () => any) => fn(),
};

const componentLifecycleLogger = logsAPI.logs.getLogger("app/component-lifecycle");
const componentLifecycleTracer = trace.getTracer("app/component-lifecycle");
export const EVENT_ID_KEY = Symbol("event ID key");
export const EVENT_SPAN_ID_KEY = Symbol("span ID of the parent of the event");

export function standardAttributes(componentName: string) {
  return {
    "app.some.nonsense": "lizard",
    "jess.telemetry.called_in_span_id": trace.getActiveSpan()?.spanContext().spanId,
    "app.existence.componentName": componentName,
  };
}

export function wrapAsActiveLifecycleSpan(
  componentName: string,
  componentLifecycleSpans: ComponentLifecycleSpans,
  componentAttributes?: Attributes
): ActiveLifecycleSpanType {
  return {
    componentName,
    addLog: (name: string, attributes?: Attributes) => {
      const uniqueID = uuidv4();
      componentLifecycleLogger.emit({
        body: name,
        severityNumber: logsAPI.SeverityNumber.INFO,
        severityText: name,
        attributes: {
          "trace.event_id": uniqueID,
          excitementLevel: "mild",
          "jess.telemetry.intent": "lifecycle custom event",
          name,
          ...standardAttributes(componentName),
          ...componentAttributes,
          ...attributes,
        },
        context: componentLifecycleSpans.contextToUseAsAParent,
      });
      return uniqueID;
    },

    withLog<T>(name: string, attributes: Attributes, fn: () => T): T {
      const logId = this.addLog(name, attributes);
      const nextContext = context
        .active()
        .setValue(EVENT_ID_KEY, logId)
        .setValue(EVENT_SPAN_ID_KEY, this.spanContext()?.spanId);
      return context.with(nextContext, () => fn());
    },

    addError: (name: string, error?: Error, attributes?: Attributes) => {
      const uniqueID = uuidv4();
      const errorDescription = name + (error ? ": " + error?.message : "");
      componentLifecycleLogger.emit({
        body: errorDescription,
        severityNumber: logsAPI.SeverityNumber.ERROR,
        severityText: "error",
        attributes: {
          "trace.event_id": uniqueID,
          excitementLevel: "seriously perturbed",
          "error.description": errorDescription,
          "jess.telemetry.intent": "lifecycle error event",
          name,
          "error.message": error?.message || "No error message",
          "error.stack": error?.stack, // does this work? worth a try
          error: true,
          ...standardAttributes(componentName),
          ...componentAttributes,
          ...attributes,
        },
        context: componentLifecycleSpans.contextToUseAsAParent,
      });
      // JESS: this does not seem to set the status, it's still 0 when it arrives
      componentLifecycleSpans.spanThatWeWillTryToEnd.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorDescription,
      });
      if (error) {
        componentLifecycleSpans.spanThatWeWillTryToEnd.recordException(error);
      }
      return uniqueID;
    },

    setAttributes: (attributes: Attributes) => {
      componentLifecycleSpans.spanThatWeWillTryToEnd.setAttributes(attributes);
    },

    spanContext: () => componentLifecycleSpans.spanThatWeSendRightAway.spanContext(),
    inSpan: (name: string, attributes: Attributes, fn: () => any) => {
      return componentLifecycleTracer.startActiveSpan(
        name,
        {
          attributes: {
            "jess.telemetry.intent": "custom lifecycle span",
            ...standardAttributes(componentName),
            ...attributes,
          },
        },
        componentLifecycleSpans.contextToUseAsAParent,
        (span) => {
          try {
            const result = fn();
            return result;
          } catch (e) {
            if (e instanceof Error) {
              span.recordException(e);
              span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
            } else {
              span.setStatus({ code: SpanStatusCode.ERROR, message: "some error that is not an Error: " + e });
            }
            throw e;
          } finally {
            span.end();
          }
        }
      );
    },
    inSpanAsync: (name: string, attributes: Attributes, fn: (span?: Span) => any) => {
      return componentLifecycleTracer.startActiveSpan(
        name,
        {
          attributes: {
            "jess.telemetry.intent": "custom lifecycle span async",
            ...standardAttributes(componentName),
            ...attributes,
          },
        },
        componentLifecycleSpans.contextToUseAsAParent,
        async (span) => {
          try {
            const result = await fn(span);
            return result;
          } catch (e) {
            if (e instanceof Error) {
              span.recordException(e);
              span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
            } else {
              span.setStatus({ code: SpanStatusCode.ERROR, message: "some error that is not an Error: " + e });
            }
            throw e;
          } finally {
            span.end();
          }
        }
      );
    },
    inContext: (fn: () => any) => {
      return context.with(componentLifecycleSpans.contextToUseAsAParent, fn);
    },
  };
}

export function getLinkToCurrentSpan(tracingTeam: TracingTeam, lifecycleSpan: ActiveLifecycleSpanType): string {
  const startTime = Math.floor(tracingTeam.execution.startTime); // decimals get us a 404
  const rightNow = Math.floor(Date.now() / 1000);
  return (
    getUrlToDataset(tracingTeam.auth!) +
    "/trace?trace_id=" +
    lifecycleSpan.spanContext()?.traceId +
    "&span=" +
    lifecycleSpan.spanContext()?.spanId +
    "&trace_start_ts=" +
    (startTime - 60) +
    "&trace_end_ts=" +
    (rightNow + 60)
  );
}
