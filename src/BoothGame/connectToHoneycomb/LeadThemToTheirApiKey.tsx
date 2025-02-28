import React from "react";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { ApiKeyInput, ApiKeyInputSuccess, ApiKeyInstructions, isApiKeyInLocalStorage } from "./ApiKeyInput";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { DoTheyHaveALogin, DoTheyHaveALoginResult } from "./Login";
import { GetThemATeam, GetThemATeamResult } from "./Team";
import { GetAnEnvironment, GetAnEnvironmentResult } from "./Environment";

const Start = {
  stateName: "start at the top",
  sections: { login: "open", team: "hidden", env: "hidden", apikey: "hidden" },
  apiKeyInstructions: "existing environment" as ApiKeyInstructions // they shouldn't see it
};
const NewEnvironment = {
  stateName: "brand new account",
  sections: { login: "complete", team: "complete", env: "complete", apikey: "open" },
  apiKeyInstructions: "new environment" as ApiKeyInstructions
};
const ExistingAccount = {
  stateName: "existing account",
  sections: { login: "complete", team: "open", env: "hidden", apikey: "hidden" },
  apiKeyInstructions: "existing environment" as ApiKeyInstructions // they shouldn't see it
};
const ExistingTeam = {
  stateName: "existing account and team",
  sections: { login: "complete", team: "complete", env: "open", apikey: "hidden" },
  apiKeyInstructions: "existing environment" as ApiKeyInstructions // they shouldn't see it
};
const ExistingEnvironment = {
  stateName: "existing account, team, environment",
  sections: { login: "complete", team: "complete", env: "complete", apikey: "open" },
  apiKeyInstructions: "existing environment" as ApiKeyInstructions
}
const ApiKeyFromLocalStorage = {
  stateName: "api key from local storage",
  sections: { login: "complete", team: "complete", env: "complete", apikey: "open" },
  apiKeyInstructions: "known api key" as ApiKeyInstructions
};

type ConnectToHoneycombState = typeof Start |
  typeof NewEnvironment |
  typeof ApiKeyFromLocalStorage |
  typeof ExistingAccount |
  typeof ExistingTeam |
  typeof ExistingEnvironment;

function LeadThemToTheirApiKeyInternal(props: LeadThemToTheirApiKeyProps) {
  const initialState = isApiKeyInLocalStorage() ? ApiKeyFromLocalStorage : Start;
  const [state, setState] = useLocalTracedState<ConnectToHoneycombState>(initialState);

  const handleLoginSelection = (s: DoTheyHaveALoginResult) => {
    const nextState = s.honeycombLogin === "new" ? NewEnvironment : ExistingAccount;
    setState(nextState, { eventName: nextState.stateName });
  };

  const handleTeamSelection = (s: GetThemATeamResult) => {
    const nextState = s.honeycombTeam === "new" ? NewEnvironment : ExistingTeam;
    setState(nextState, { eventName: nextState.stateName });
  };

  const handleEnvironmentSelection = (s: GetAnEnvironmentResult) => {
    const nextState = s.honeycombEnvironment === "new" ? NewEnvironment : ExistingEnvironment;
    setState(nextState, { eventName: nextState.stateName });
  };

  const switchToExistingEnvironment = () => {
    setState(ExistingEnvironment, { eventName: ExistingEnvironment.stateName, attributes: { "app.connectToHoneycomb.why": "they asked for more instructions" } });
  }

  return (
    <>
    <div className="instructions">
      <h2>Connect to Honeycomb</h2>
      <p>
        As you answer questions, Observaquiz sends telemetry to Honeycomb where you can see it. You'll use that data to
        learn the workings of Observaquiz!
      </p>
      <p>To do this, Observaquiz will connect to a Honeycomb team that belongs to you.</p>
    </div>

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
        <GetThemATeam handleCompletion={handleTeamSelection} />
      </CollapsingSection>
      <CollapsingSection
        header="Honeycomb environment"
        complete={state.sections.env === "complete"}
        open={state.sections.env === "open"}
        hidden={state.sections.env === "hidden"}
      >
        <GetAnEnvironment handleCompletion={handleEnvironmentSelection} />
      </CollapsingSection>
      <CollapsingSection
        header="Honeycomb API Key"
        complete={false}
        open={true}
        hidden={state.sections.apikey === "hidden"}
      >
        <ApiKeyInput moveForward={props.moveForward} switchToExistingEnvironment={switchToExistingEnvironment} instructions={state.apiKeyInstructions} />
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
