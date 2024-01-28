// function setCurrentState(params: {
//   newState: QuizState;
//   reason?: string;
//   attributes?: Attributes;
//   action?: () => void;
// }) {
//   const { newState, reason, attributes } = params;
//   activeLifecycleSpan.withLog(
//     "state change",
//     {
//       "app.boothGame.state": newState.name,
//       "app.boothGame.prevState": currentState.name,
//       "app.boothGame.stateChangeReason": reason || "unset",
//       ...attributes,
//     },
//     params.action || (() => {})
//   );
//   setCurrentStateInternal(newState);
// }

import React from "react";
import { Attributes } from "@opentelemetry/api";

/**
 * Local Traced State
 *
 * use this when you want an event every time the state changes, but you aren't gonna pass the setter down
 * to other components.
 * This will add a log to the structural lifecycle span of your component whenever the setter is called.
 * it doesn't try to do more.
 */
export function useLocalTracedState<T>(initialValue: T, params?: {
  componentName: string;
  addAttributes?: (t: T) => Attributes;
}) {
  const [state, setStateInternal] = React.useState<T>();

  function setState(newState: T) {
    setStateInternal(newState);
  }

  return [state, setState]
}
