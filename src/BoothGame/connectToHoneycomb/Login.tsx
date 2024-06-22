import React from "react";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { RadioButtonList } from "./RadioButtonList";
import popOutIndicator from "../../../static/images/arrowSquareUpRight.svg";

const SignupButton = {
  text: "Sign up",
  href: "https://ui.honeycomb.io/signup?utm_medium=events&utm_source=frontrunners&utm_campaign=observaquiz&utm_content=sign-up",
  result: { honeycombLogin: "new" } as DoTheyHaveALoginResult,
};

const LoginButton = {
  text: "Log in",
  href: "https://ui.honeycomb.io/login?utm_medium=events&utm_source=frontrunners&utm_campaign=observaquiz&utm_content=login",
  result: { honeycombLogin: "existing" } as DoTheyHaveALoginResult,
};

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
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const [state, setState] = useLocalTracedState<DoTheyHaveALoginState>(NothingSelectedYet);
  const buttonRef = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    // when the button appears, focus it.
    buttonRef.current?.focus(); // this doesn't work, fyi.
  }, [buttonRef.current, state]);

  const handleSelection = (ls: RadioButtonRow) => {
    setState(ls.moveToState, { eventName: ls.moveToState.stateName });
  };

  var instructions = <></>;
  switch (state.instructions) {
    case "sign in":
      instructions = <p>Great! Click to log in to Honeycomb in a new tab.</p>;
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

  function buttonClick() {
    if (state.button) {
      activeLifecycleSpan.withLog(
        "clicked " + state.button.text,
        { "app.login.buttonClicked": state.button.text, "app.login.result": JSON.stringify(state.button.result) },
        () => props.handleCompletion(state.button.result)
      );
    } else {
      console.error("wtf, button clicked but no button");
    }
  }

  var button = <></>;
  if (state.button) {
    button = (
      <a href={state.button.href} target="_blank" tabIndex={0} className="button primary" onClick={buttonClick} ref={buttonRef}>
        {state.button.text} <img className="buttonPopOut" src={popOutIndicator} alt="Opens in a new tab" />
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

export type DoTheyHaveALoginResult = { honeycombLogin: "new" | "existing" };

export type DoTheyHaveALoginProps = { handleCompletion: (s: DoTheyHaveALoginResult) => void };

export function DoTheyHaveALogin(props: DoTheyHaveALoginProps) {
  return (
    <ComponentLifecycleTracing componentName="login">
      <DoTheyHaveALoginInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
