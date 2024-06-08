import React from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";

function HelloInternal(props: HelloProps) {
  const span = React.useContext(ActiveLifecycleSpan);

  function saveMoniker(moniker: string) {
    span.inContext(() => props.moveForward({ moniker }));
  }

  return (
    <div>
      <h3>Hello, {props.eventName}!</h3>
      <p>You have found the Observaquiz!</p>
      <p>This quiz will sort of test your observability knowledge, while helping you experience observability in Honeycomb.</p>
      <p>Complete it, then come by the Honeycomb booth for a prize!</p>
      <MonikerForLeaderboard report={saveMoniker} />
    </div>
  );
}

type DoStuffWithInputProps = {
  report: (input: string) => void;
};

const NoInput = { name: "no moniker yet", buttonEnabled: false, inputEnabled: true, message: "" };
const EnteringInput = { name: "some moniker entered", buttonEnabled: true, inputEnabled: true, message: "" };
const InputSubmitted = { name: "moniker accepted", buttonEnabled: false, inputEnabled: false, message: "Woot!" };

type InputState = typeof NoInput | typeof EnteringInput | typeof InputSubmitted;
function MonikerForLeaderboard(props: DoStuffWithInputProps) {
  const [moniker, setMoniker] = React.useState("");
  const [state, setState] = React.useState<InputState>(NoInput);

  const focusHerePlease = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    focusHerePlease.current?.focus();
  }, [focusHerePlease.current]);

  const updateMoniker = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMoniker = event.target.value;
    if (!newMoniker.trim()) {
      setState(NoInput);
    } else {
      setState(EnteringInput);
    }
    setMoniker(newMoniker);
  };

  const submit = () => {
    if (!state.buttonEnabled) {
      // they could hit enter on a blank input, for instance
      return;
    }
    setState(InputSubmitted);
    props.report(moniker);
  };

  const submitOnEnter = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      submit();
    }
  };

  return (
    <p>
      <label htmlFor="moniker">
        Enter your name for the leaderboard:
        <input
          id="moniker"
          ref={focusHerePlease}
          value={moniker}
          disabled={!state.inputEnabled}
          type="text"
          onChange={updateMoniker}
          className="moniker-input"
          onKeyUp={submitOnEnter}
        ></input>
      </label>
      <button disabled={!state.buttonEnabled} type="submit" onClick={submit}>
        Begin
      </button>{" "}
      {state.message}
    </p>
  );
}

export type HelloProps = {
  eventName: string;
  moveForward: (result: { moniker: string }) => void;
};

export function Hello(props: HelloProps) {
  return (
    <ComponentLifecycleTracing componentName="Hello">
      <HelloInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
