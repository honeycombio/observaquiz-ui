import React from "react";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { RadioButtonList } from "./RadioButtonList";

const SignupButton = {
  text: "Sign up",
  href: "https://ui.honeycomb.io/signup",
  result: { honeycombLogin: "new" } as GetAnEnvironmentResult,
};

const LoginButton = {
  text: "Log in",
  href: "https://ui.honeycomb.io/login",
  result: { honeycombLogin: "existing" } as GetAnEnvironmentResult,
};

const NothingSelectedYet = { stateName: "no selection", instructions: "empty", button: undefined };
const SelectedYes = { stateName: "have a login", instructions: "sign in", button: LoginButton };
const SelectedNo = { stateName: "no login", instructions: "sign up", button: SignupButton };
const SelectedDunno = {
  stateName: "they don't know whether they have a login",
  instructions: "sign up anyway",
  button: SignupButton,
};

type GetAnEnvironmentState = typeof NothingSelectedYet | typeof SelectedYes | typeof SelectedNo | typeof SelectedDunno;

type LoginSelection = "yes" | "no" | "dunno";

type RadioButtonRow = { key: LoginSelection; text: string; moveToState: GetAnEnvironmentState };
const radioButtons: Array<RadioButtonRow> = [
  { key: "yes", text: "Yes", moveToState: SelectedYes },
  { key: "no", text: "No", moveToState: SelectedNo },
  { key: "dunno", text: "I'm not sure", moveToState: SelectedDunno },
];

function GetAnEnvironmentInternal(props: GetAnEnvironmentProps) {
  const [state, setState] = useLocalTracedState<GetAnEnvironmentState>(NothingSelectedYet);

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
      <a
        href={state.button.href}
        target="_blank"
        className="button primary"
        onClick={() => props.handleCompletion(state.button.result)}
      >
        {state.button.text}
      </a>
    );
  }
  return (
    <>
      <p>Do you already have a Honeycomb login?</p>
      <RadioButtonList radioButtons={radioButtons} handleSelection={handleSelection} />
      {instructions}
      {button}
    </>
  );
}

export type GetAnEnvironmentResult = { honeycombLogin: "new" | "existing" };

export type GetAnEnvironmentProps = { handleCompletion: (s: GetAnEnvironmentResult) => void };

export function GetAnEnvironment(props: GetAnEnvironmentProps) {
  return (
    <ComponentLifecycleTracing componentName="login">
      <GetAnEnvironmentInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
