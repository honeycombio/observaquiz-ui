import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

function TellThemAboutTheConnectionInternal(
  props: TellThemAboutTheConnectionProps
) {
  return (
    <>
      <p>Hellooooo</p>
      <button type="submit" onClick={props.moveForward}>
        Let's go
      </button>
    </>
  );
}

type TellThemAboutTheConnectionProps = { moveForward: () => void };

export function TellThemAboutTheConnection(
  props: TellThemAboutTheConnectionProps
) {
  return (
    <ComponentLifecycleTracing componentName="Hello">
      <TellThemAboutTheConnectionInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
