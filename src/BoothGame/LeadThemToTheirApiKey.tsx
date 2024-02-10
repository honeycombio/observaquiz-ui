import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { ApiKeyInput, ApiKeyInputSuccess } from "./ApiKeyInput";
import { useLocalTracedState } from "../tracing/LocalTracedState";
import { DoTheyHaveALogin, DoTheyHaveALoginResult } from "./connectToHoneycomb/Login";

const Start = {
  stateName: "start at the top",
  sections: { login: "open", team: "hidden", env: "hidden", apikey: "hidden" },
};
const NewTeam = {
  stateName: "new team",
  sections: { login: "complete", team: "complete", env: "complete", apikey: "open" },
};
const ApiKeyFromLocalStorage = {
  stateName: "api key from local storage",
  sections: { login: "complete", team: "complete", env: "complete", apikey: "open" },
};

type ConnectToHoneycombState = typeof Start | typeof NewTeam | typeof ApiKeyFromLocalStorage;

function LeadThemToTheirApiKeyInternal(props: LeadThemToTheirApiKeyProps) {
  const [state, setState] = useLocalTracedState<ConnectToHoneycombState>(Start);

  const handleLoginSelection = (s: DoTheyHaveALoginResult) => {
    setState(NewTeam);
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

      <section className="step">{honeycombTeamPortion}</section>
      <section className="step" hidden={state.sections.apikey === "hidden"}>
        <ApiKeyInput moveForward={props.moveForward} />
      </section>
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
