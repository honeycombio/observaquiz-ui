import React from "react";
import { SpanContext, trace, AttributeValue, context } from "@opentelemetry/api";
import { ActiveLifecycleSpan } from "./ComponentLifecycleTracing";
import { EVENT_ID_KEY, EVENT_SPAN_ID_KEY } from "./activeLifecycleSpan";

type TracedStateProvenance = {
  spanContext?: SpanContext;
  associatedEventId?: string;
  associatedEventSpanId?: string;
  name: string;
  version: number;
};

export type TracedState<T> = {
  // if you don't want to log on changes, you can just use the value directly.
  value: T; // if you're going to use this in an important way, get it with useTracedState
  provenance: TracedStateProvenance;
};

export function useDeclareTracedState<T>(name: string, initialState: T) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan); // i only need this at declaration time... could leave out

  const initialTracedState = {
    value: initialState,
    provenance: { spanContext: activeLifecycleSpan.spanContext(), name, version: 0 }, // am I gonna _do_ anything with this initial state? Like, if I don't log it, there's no point putting this on here
  };

  const [tracedState, setTracedState] = React.useState<TracedState<T>>(initialTracedState);

  function setStateWithProvenance(t: T) {
    // look for the OTel context that this function was called in.
    console.log("Consider making a 'from' log...");
    setTracedState({
      value: t,
      provenance: {
        spanContext: trace.getActiveSpan()?.spanContext(),
        associatedEventId: context.active().getValue(EVENT_ID_KEY) as string,
        associatedEventSpanId: context.active().getValue(EVENT_SPAN_ID_KEY) as string,
        name,
        version: tracedState.provenance.version + 1,
      },
    });
  }

  return [tracedState, setStateWithProvenance] as const;
}

export function useTracedState<T>(
  currentState: TracedState<T>,
  deriveAttributes: (currentValue: T) => Record<string, AttributeValue> = () => ({})
) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);

  const previousValue = usePrevious(currentState.value);
  React.useEffect(() => {
    activeLifecycleSpan.addLog("traced state change", {
      "stateTrace.name": currentState.provenance.name,
      "stateTrace.value": JSON.stringify(currentState.value), // NOTE: this is a limitation on the kind of values that can be wrapped
      "stateTrace.previousValue": JSON.stringify(previousValue), // NOTE: this is a limitation on the kind of values that can be wrapped
      "stateTrace.caused_by_span_id": currentState.provenance.spanContext?.spanId,
      "stateTrace.caused_by_event_id": currentState.provenance.associatedEventId,
      "stateTrace.caused_by_event_span_id": currentState.provenance.associatedEventSpanId,
      "stateTrace.version": currentState.provenance.version,
      ...deriveAttributes(currentState.value),
    });
  }, [currentState]);

  return currentState.value;
}

const usePrevious = <T extends unknown>(value: T): T | undefined => {
  const ref = React.useRef<T>();
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
