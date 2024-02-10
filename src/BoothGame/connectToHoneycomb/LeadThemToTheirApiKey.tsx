import React from "react";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { ApiKeyInput, ApiKeyInputSuccess, isApiKeyInLocalStorage } from "./ApiKeyInput";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { DoTheyHaveALogin, DoTheyHaveALoginResult } from "./Login";

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
  const initialState = isApiKeyInLocalStorage() ? ApiKeyFromLocalStorage : Start;
  const [state, setState] = useLocalTracedState<ConnectToHoneycombState>(initialState);

  const handleLoginSelection = (s: DoTheyHaveALoginResult) => {
    setState(NewTeam);
  };
  return (
    <>
      <h2>Connect to Honeycomb</h2>
      <p>
        As you answer questions, Observaquiz sends telemetry to Honeycomb where you can see it. You'll use that data to
        learn the workings of Observaquiz!
      </p>
      <p>To do this, Observaquiz will connect to a Honeycomb team that belongs to you.</p>

      <CollapsingSection
        header="Honeycomb login"
        complete={state.sections.login === "complete"}
        open={state.sections.login === "open"}
        hidden={false}
      >
        <DoTheyHaveALogin handleCompletion={handleLoginSelection} />
      </CollapsingSection>
      <CollapsingSection
        header="Honeycomb API Key"
        complete={false}
        open={true}
        hidden={state.sections.apikey === "hidden"}
      >
        <ApiKeyInput moveForward={props.moveForward} />
      </CollapsingSection>
    </>
  );
}

type CollapsingSectionProps = {
  header: string;
  children: React.ReactNode;
  complete: boolean;
  open: boolean;
  hidden: boolean;
};

function CollapsingSection(props: CollapsingSectionProps) {
  const [clickedOpen, setClickedOpen] = React.useState(false);

  function toggleClickedOpen() {
    setClickedOpen(!clickedOpen);
  }
  return (
    <section className="step" hidden={props.hidden}>
      <div className="section-header" onClick={toggleClickedOpen}>
        <h3>
          {props.complete && "✅ "}
          {props.header}
        </h3>
      </div>
      {(props.open || clickedOpen) && (
        <>
          <hr />
          {props.children}
        </>
      )}
    </section>
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
