import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { ApiKeyInput, ApiKeyInputSuccess } from "./ApiKeyInput";
import { useLocalTracedState } from "../tracing/LocalTracedState";

const Start: ConnectToHoneycombState = { doTheyHaveALogin: "none", showApiKeyInput: false };

type LoginSelection = "none" | "yes" | "no" | "dunno";
function DoTheyHaveALogin(props: { handleSelection: (s: LoginSelection) => void }) {
  const [loginSelection, setLoginSelection] = useLocalTracedState<LoginSelection>("none", {
    componentName: "Do they have a login?",
  });

  const handleSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ls = e.target.value as LoginSelection;
    console.log("value: ", ls);
    setLoginSelection(ls);
    props.handleSelection(ls);
  };
  return (
    <div>
      <p>Do you already have a Honeycomb login?</p>
      <ul>
        <li key="yes">
          <label htmlFor="yes">
            <input
              id="yes"
              name="radio"
              type="radio"
              value="yes"
              checked={loginSelection === "yes"}
              onChange={handleSelection}
              className="radio"
            />
            Yes
          </label>
        </li>
        <li key="no">
          <label htmlFor="no">
            <input
              id="no"
              name="radio"
              type="radio"
              value="no"
              checked={loginSelection === "no"}
              onChange={handleSelection}
              className="radio"
            />
            No
          </label>
        </li>
        <li key="dunno">
          <label htmlFor="dunno">
            <input
              id="dunno"
              name="radio"
              type="radio"
              value="dunno"
              checked={loginSelection === "dunno"}
              onChange={handleSelection}
              className="radio"
            />{" "}
            I don't know
          </label>
        </li>
      </ul>
    </div>
  );
}

type ConnectToHoneycombState = {
  doTheyHaveALogin: LoginSelection;
  showApiKeyInput: boolean;
};
function LeadThemToTheirApiKeyInternal(props: LeadThemToTheirApiKeyProps) {
  const [state, setState] = useLocalTracedState<ConnectToHoneycombState>(Start);

  const handleLoginSelection = (s: LoginSelection) => {
    setState({ doTheyHaveALogin: s, showApiKeyInput: true });
  };
  const honeycombTeamPortion = <DoTheyHaveALogin handleSelection={handleLoginSelection} />;
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
