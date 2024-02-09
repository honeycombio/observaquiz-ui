import React from "react";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";

const SignupButton = { text: "Sign up", href: "https://ui.honeycomb.io/signup", result: { honeycombLogin: "new" } };

const LoginButton = { text: "Log in", href: "https://ui.honeycomb.io/login", result: { honeycombLogin: "existing" } };

const NothingSelectedYet = { stateName: "no selection", instructions: "empty", button: undefined };
const SelectedYes = { stateName: "have a login", instructions: "sign in", button: LoginButton };
const SelectedNo = { stateName: "no login", instructions: "sign up", button: SignupButton };
const SelectedDunno = {
  stateName: "they don't know whether they have a login",
  instructions: "sign up anyway",
  button: SignupButton,
};

type DoTheyHaveALoginState = typeof NothingSelectedYet | typeof SelectedYes | typeof SelectedNo | typeof SelectedDunno;

type LoginSelection = "yes" | "no" | "dunno";

type RadioButtonRow = { key: LoginSelection; text: string; moveToState: DoTheyHaveALoginState };
const radioButtons: Array<RadioButtonRow> = [
  { key: "yes", text: "Yes", moveToState: SelectedYes },
  { key: "no", text: "No", moveToState: SelectedNo },
  { key: "dunno", text: "I'm not sure", moveToState: SelectedDunno },
];

function DoTheyHaveALoginInternal(props: DoTheyHaveALoginProps) {
  const [state, setState] = useLocalTracedState<DoTheyHaveALoginState>(NothingSelectedYet);

  const handleSelection = (ls: RadioButtonRow) => {
    console.log("value: ", ls);
    setState(ls.moveToState);
  };

  var instructions = <></>;
  switch (state.instructions) {
    case "sign in":
      instructions = <p>Great! Click this to log in to Honeycomb in a new tab:</p>;
      break;
    case "sign up":
      instructions = (
        <>
          <p>
            You're in luck! You get a free Honeycomb account. Your free team lasts forever, and it can receive{" "}
            <i>20 million</i> events per month. After that you'll get rate limited.
          </p>
          <p>
            This quiz will send about 400 events, so you can take it {20000000 / 400} times this month. (But don't. Once
            is good.)
          </p>
        </>
      );
      break;
    case "sign up anyway":
      instructions = (
        <>
          <p>Go ahead and sign up. If you already have an account, you'll get an email with a "reset password" link.</p>
          <p>
            Your free Honeycomb team is free forever, and it will accept 20 million events per month. This quiz will
            send about 400 events .
          </p>
        </>
      );
      break;
  }

  var button = <></>;
  if (state.button) {
    button = (
      <a href={state.button.href} target="_blank" className="button primary">
        {state.button.text}
      </a>
    );
  }
  return (
    <section className="step">
      <p>Do you already have a Honeycomb login?</p>
      <RadioButtonList radioButtons={radioButtons} handleSelection={handleSelection} />
      {instructions}
      {button}
    </section>
  );
}

type RadioButtonNeeds = { key: string; text: string };
function RadioButtonList<V extends RadioButtonNeeds>(props: {
  radioButtons: Array<V>;
  handleSelection: (v: V) => void;
}) {
  const [selectedValue, setSelectedValue] = React.useState<V | undefined>(undefined);

  function handleSelection(V: V) {
    setSelectedValue(V);
    props.handleSelection(V);
  }
  return <ul>{props.radioButtons.map((row) => radioButtonFromData(handleSelection, selectedValue, row))}</ul>;
}

function radioButtonFromData<V extends RadioButtonNeeds>(
  handleSelection: (v: V) => void,
  selectedValue: V | undefined,
  row: V
) {
  const thisOne = row.key;
  const onChange = (row: V) => () => {
    handleSelection(row);
  };
  return (
    <li key={thisOne}>
      <label>
        <input
          className="radio"
          type="radio"
          value={thisOne}
          key={thisOne}
          checked={selectedValue?.key === thisOne}
          onChange={onChange(row)}
        />
        {row.text}
      </label>
    </li>
  );
}

export type DoTheyHaveALoginResult = { honeycombLogin: "new" | "existing" };

export type DoTheyHaveALoginProps = { handleCompletion: (s: DoTheyHaveALoginResult) => void };

export function DoTheyHaveALogin(props: DoTheyHaveALoginProps) {
  return (
    <ComponentLifecycleTracing componentName="login">
      <DoTheyHaveALoginInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
