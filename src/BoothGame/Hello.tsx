import React from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

function HelloInternal(props: HelloProps) {
  const span = React.useContext(ActiveLifecycleSpan);

  function begin() {
    span.inContext(() => props.moveForward());
  }

  return (
    <div>
      <h3>Hello at DevOpsDays Wherever 2024!</h3>
      <p>You have found the Observaquiz!</p>
      <p>This quiz will sort of test your observability knowledge, while demonstrating some observability.</p>
      <p>Complete it, and then come by the Honeycomb booth for whatever really cool prize we promised you!</p>
      <p>
        <button className="button primary" onClick={begin} autoFocus>
          Begin
        </button>
      </p>
    </div>
  );
}

export type HelloProps = {
  moveForward: () => void;
};

export function Hello(props: HelloProps) {
  return (
    <ComponentLifecycleTracing componentName="Hello">
      <HelloInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
