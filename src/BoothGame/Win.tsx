import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

function WinInternal(props: WinProps) {
  return <p>You win! :-P</p>;
}

export type WinProps = {};
export function Win(props: WinProps) {
  return (
    <ComponentLifecycleTracing componentName="win">
      <WinInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
