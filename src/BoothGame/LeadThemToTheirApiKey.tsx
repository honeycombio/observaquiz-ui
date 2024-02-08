import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { ApiKeyInput, ApiKeyInputSuccess } from "./ApiKeyInput";

function LeadThemToTheirApiKeyInternal(props: LeadThemToTheirApiKeyProps) {
  return (
    <>
      <p>Let me guide you to your API key...</p>
      <ApiKeyInput moveForward={props.moveForward} />
    </>
  );
}

export type LeadThemToTheirApiKeyProps = {
  moveForward: (success: ApiKeyInputSuccess) => void;
};
export function LeadThemToTheirApiKey(props: LeadThemToTheirApiKeyProps) {
  return (
    <ComponentLifecycleTracing componentName="Connect to Honeycomb">
      <LeadThemToTheirApiKeyInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
