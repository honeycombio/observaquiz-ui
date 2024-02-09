import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { ApiKeyInput, ApiKeyInputSuccess } from "./ApiKeyInput";
import { useLocalTracedState } from "../tracing/LocalTracedState";

const Start: ConnectToHoneycombState = { doTheyHaveALogin: "none", showApiKeyInput: false };

function radioButtonFromData<V extends string>(
  handleSelection: (v: V) => void,
  selectedValue: V,
  row: { value: V; text: string }
) {
  const thisOne = row.value;
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value as V;
    handleSelection(v);
  };
  return (
    <li key={thisOne}>
      <label>
        <input
          className="radio"
          type="radio"
          value={thisOne}
          key={thisOne}
          checked={selectedValue === thisOne}
          onChange={onChange}
        />
        {row.text}
      </label>
    </li>
  );
}

type LoginSelection = "none" | "yes" | "no" | "dunno";
function DoTheyHaveALogin(props: { handleSelection: (s: LoginSelection) => void }) {
  const [loginSelection, setLoginSelection] = useLocalTracedState<LoginSelection>("none", {
    componentName: "Do they have a login?",
  });

  const handleSelection = (ls: LoginSelection) => {
    console.log("value: ", ls);
    setLoginSelection(ls);
    props.handleSelection(ls);
  };
  return (
    <div>
      <p>Do you already have a Honeycomb login?</p>
      <ul>
        {radioButtonFromData(handleSelection, loginSelection, { value: "yes", text: "Yes" })}
        {radioButtonFromData(handleSelection, loginSelection, { value: "no", text: "No" })}
        {radioButtonFromData(handleSelection, loginSelection, { value: "dunno", text: "I'm not sure" })}
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
