import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { ApiKeyInput, ApiKeyInputSuccess } from "./ApiKeyInput";
import { useLocalTracedState } from "../tracing/LocalTracedState";
import { DoTheyHaveALogin, DoTheyHaveALoginResult } from "./connectToHoneycomb/Login";

const Start: ConnectToHoneycombState = { doTheyHaveALogin: undefined, showApiKeyInput: false };

type ConnectToHoneycombState = {
  doTheyHaveALogin: DoTheyHaveALoginResult | undefined;
  showApiKeyInput: boolean;
};
function LeadThemToTheirApiKeyInternal(props: LeadThemToTheirApiKeyProps) {
  const [state, setState] = useLocalTracedState<ConnectToHoneycombState>(Start);

  const handleLoginSelection = (s: DoTheyHaveALoginResult) => {
    setState({ doTheyHaveALogin: s, showApiKeyInput: true });
  };
  const honeycombTeamPortion = <DoTheyHaveALogin handleCompletion={handleLoginSelection} />;
  return (
    <>
      <h2>Connect to Honeycomb</h2>
      <p>
        As you answer questions, Observaquiz sends telemetry to Honeycomb where you can see it. You'll use that data to
        learn the workings of Observaquiz!
      </p>
      <p>To do this, Observaquiz needs to connect to a Honeycomb team that belongs to you.</p>
      {honeycombTeamPortion}
      {state.showApiKeyInput && <ApiKeyInput moveForward={props.moveForward} />}
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
