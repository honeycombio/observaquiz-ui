import React from "react";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { ApiKeyInput, ApiKeyInputSuccess, isApiKeyInLocalStorage } from "./ApiKeyInput";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { DoTheyHaveALogin, DoTheyHaveALoginResult } from "./Login";
import { GetThemATeam } from "./Team";
import { GetAnEnvironment } from "./Environment";

const Start = {
  stateName: "start at the top",
  sections: { login: "open", team: "hidden", env: "hidden", apikey: "hidden" },
};
const NewAccount = {
  stateName: "brand new account",
  sections: { login: "complete", team: "complete", env: "complete", apikey: "open" },
};
const ExistingAccount = {
  stateName: "existing account",
  sections: { login: "complete", team: "open", env: "hidden", apikey: "hidden" },
};
const ApiKeyFromLocalStorage = {
  stateName: "api key from local storage",
  sections: { login: "complete", team: "complete", env: "complete", apikey: "open" },
};

type ConnectToHoneycombState = typeof Start | typeof NewAccount | typeof ApiKeyFromLocalStorage;

function LeadThemToTheirApiKeyInternal(props: LeadThemToTheirApiKeyProps) {
  const initialState = isApiKeyInLocalStorage() ? ApiKeyFromLocalStorage : Start;
  const [state, setState] = useLocalTracedState<ConnectToHoneycombState>(initialState);

  const handleLoginSelection = (s: DoTheyHaveALoginResult) => {
    const nextState = s.honeycombLogin === "new" ? NewAccount : ExistingAccount;
    setState(nextState, { eventName: nextState.stateName });
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
        header="Honeycomb team"
        complete={state.sections.team === "complete"}
        open={state.sections.team === "open"}
        hidden={state.sections.team === "hidden"}
      >
        <GetThemATeam handleCompletion={handleLoginSelection} />
      </CollapsingSection>
      <CollapsingSection
        header="Honeycomb environment"
        complete={state.sections.env === "complete"}
        open={state.sections.env === "open"}
        hidden={state.sections.env === "hidden"}
      >
        <GetAnEnvironment handleCompletion={handleLoginSelection} />
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
  const [everOpen, setEverOpen] = React.useState(props.open);

  function toggleClickedOpen() {
    setClickedOpen(!clickedOpen);
  }

  React.useEffect(() => {
    if (props.open || clickedOpen) {
      setEverOpen(true);
    }
  }, [props.open, clickedOpen]);

  return (
    <section className="step" hidden={props.hidden}>
      <div className="section-header" onClick={toggleClickedOpen}>
        <h3>
          {props.complete && "✅ "}
          {props.header}
        </h3>
      </div>
      {everOpen && (
        <div hidden={!(props.open || clickedOpen)}>
          <hr />
          {props.children}
        </div>
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
