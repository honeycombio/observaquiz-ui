import React from "react";
import { Attributes } from "@opentelemetry/api";
import { ActiveLifecycleSpan } from "./ComponentLifecycleTracing";

/**
 * Local Traced State
 *
 * use this when you want an event every time the state changes, but you aren't gonna pass the setter down
 * to other components.
 * This will add a log to the structural lifecycle span of your component whenever the setter is called.
 * it doesn't try to do more.
 *
 * Make sure your state can be stringified.
 */

type SetStateParams = {
  reason?: string;
  attributes?: Attributes;
  action?: () => void; // do in the context of this log
};
export function useLocalTracedState<T>(
  initialValue: T,
  config?: {
    componentName?: string; // for naming attribtues: app.${componentName}.prevState
    addAttributes?: (t: T) => Attributes; // bonus attributes for all logs, based on the new state
  }
): [T, (t: T, params?: SetStateParams) => void] {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const [state, setStateInternal] = React.useState<T>(initialValue);

  const componentName = config?.componentName || "localState";

  function setState(newState: T, setStateParams?: SetStateParams) {
    const componentAttributes = config?.addAttributes ? config.addAttributes(newState) : {};
    const attributes = {
      ...componentAttributes,
      ...setStateParams?.attributes,
    };
    attributes[`app.${componentName}.prevState`] = JSON.stringify(state);
    attributes[`app.${componentName}.newState`] = JSON.stringify(newState);
    attributes[`app.${componentName}.reason`] = setStateParams?.reason || "unset";
    const action = setStateParams?.action ? setStateParams.action : () => {};

    activeLifecycleSpan.withLog("state change", attributes, action);

    setStateInternal(newState);
  }

  return [state, setState];
}
