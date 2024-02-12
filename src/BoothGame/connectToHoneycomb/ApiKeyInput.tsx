import React, { FormEvent, useContext } from "react";
import { Configuration } from "../../Configuration";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { callHoneycombAuthEndpoint } from "./honeycombAuth";
import { ActiveLifecycleSpanType } from "../../tracing/activeLifecycleSpan";
import { BACKEND_DATASET_NAME, HONEYCOMB_DATASET_NAME } from "../../tracing/TracingDestination";

const LOCAL_STORAGE_KEY_API_KEY = "apiKey";
const LOCAL_STORAGE_KEY_WHETHER_TO_SAVE = "apisaveApiKeyToLocalStorageKey";

export type ApiKeyInputSuccess = {
  apiKey: string;
  team: { name: string; slug: string };
  environment: { name: string; slug: string };
  region: "us" | "eu";
};

export function isApiKeyInLocalStorage(): boolean {
  return window.localStorage.getItem(LOCAL_STORAGE_KEY_API_KEY) !== null;
}

function retrieveApiKeyFromLocalStorage(span: ActiveLifecycleSpanType): {
  apiKey: string | null;
  saveApiKeyToLocalStorage: boolean | null;
} {
  const localStorageStringValue = window.localStorage.getItem(LOCAL_STORAGE_KEY_WHETHER_TO_SAVE);
  const result = {
    apiKey: window.localStorage.getItem(LOCAL_STORAGE_KEY_API_KEY),
    saveApiKeyToLocalStorage: localStorageStringValue ? localStorageStringValue === "true" : null,
  };
  span.addLog("localStorage GET", {
    "app.localStorage.apiKey": result.apiKey || "not found",
    "app.localStorage.saveApiKeyToLocalStorage": result.saveApiKeyToLocalStorage || "not found",
  });
  return result;
}

function storeApiKeyInLocalStorage(span: ActiveLifecycleSpanType, apiKey: string) {
  span.addLog("localStorage PUT", {
    "app.localStorage.apiKey": apiKey,
    "app.localStorage.saveApiKeyToLocalStorage": true,
  });
  window.localStorage.setItem(LOCAL_STORAGE_KEY_WHETHER_TO_SAVE, "true");
  window.localStorage.setItem(LOCAL_STORAGE_KEY_API_KEY, apiKey);
}

function deleteApiKeyFromLocalStorage(span: ActiveLifecycleSpanType) {
  span.addLog("localStorage DELETE", {
    "app.localStorage.apiKey": "deleted",
    "app.localStorage.saveApiKeyToLocalStorage": false,
  });
  window.localStorage.removeItem(LOCAL_STORAGE_KEY_API_KEY);
  window.localStorage.setItem(LOCAL_STORAGE_KEY_WHETHER_TO_SAVE, "false");
}

function saveApiKeyInLocalStorageInTheFuture() {
  window.localStorage.setItem(LOCAL_STORAGE_KEY_WHETHER_TO_SAVE, "true");
}

function ApiKeyInputInternal(props: ApiKeyInputProps) {
  const span = useContext(ActiveLifecycleSpan);
  const config = useContext(Configuration);

  const [loadingness, setLoadingness] = React.useState(false);
  const [enteredApiKey, setEnteredApiKey] = React.useState("");
  const [errorResponse, setErrorResponse] = React.useState("");
  const [saveToLocalStorage, setSaveToLocalStorage] = React.useState(true);

  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    // do this once
    const result = retrieveApiKeyFromLocalStorage(span);
    if (result.apiKey) {
      setEnteredApiKey(result.apiKey);
      // if they already have one, put the focus on submit
      buttonRef.current?.focus();
    }
    if (result.saveApiKeyToLocalStorage !== null) {
      setSaveToLocalStorage(result.saveApiKeyToLocalStorage);
    }
  }, [buttonRef.current]);

  function enterStateOfLoading() {
    setLoadingness(true);
  }

  function enterStateOfDenial() {
    span.addLog("denied", { "app.honeycomb.apiKey": enteredApiKey });
    setErrorResponse("That key didn't work. Try again?");
    setEnteredApiKey("");
    setLoadingness(false);
  }

  function enterStateOfUtterFailure(reason: string) {
    console.log("Utter failure: " + reason);
    span.addLog("Unhandled", {
      "error.stack": new Error().stack,
      "error.message": reason,
      "app.honeycomb.apiKey": enteredApiKey,
    });
    setErrorResponse("Something went wrong. Come by the booth and see if we can help?");
    setLoadingness(false);
  }

  const submitIsAvailable = enteredApiKey && !loadingness;

  function formSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // don't actually submit the form
    var useThis = enteredApiKey;
    if (useThis === "swarm") {
      span.addLog("secret api key code activated", { "app.honeycomb.secretCode": useThis });
      useThis = "umjGlk57N2Hwt4Oe1wzx7H"; // modernity, quiz-customer
    }
    span.addLog("form submit", { "app.honeycomb.apiKey": useThis });

    enterStateOfLoading();
    // TODO: add a withActiveSpan method, and put it around this
    span.inContext(() =>
      callHoneycombAuthEndpoint(config.honeycomb_auth_url, useThis, span).then((result) => {
        if (result.result === "ok") {
          span.addLog("accepted", {
            "app.honeycomb.apiKey": useThis,
            "app.honeycomb.authResponse": JSON.stringify(result.response),
          });
          if (saveToLocalStorage) {
            storeApiKeyInLocalStorage(span, useThis); // only store one that works ;-)
          }
          // state: completion
          // remain in a loading state. The outer component will replace us
          props.moveForward({
            apiKey: useThis,
            team: result.response.team,
            environment: result.response.environment,
            region: "us",
          });
        } else if (result.result === "denied") {
          enterStateOfDenial();
        } else {
          enterStateOfUtterFailure("auth endpoint response came back error");
        }
      })
    );
  }

  function onApiKeyChange(event: React.ChangeEvent<HTMLInputElement>) {
    const latest = event.target.value;
    span.addLog("entered data", { "app.interaction.component": "apiKeyInputField", "app.interaction.data": latest });
    setEnteredApiKey(latest);
  }

  function onSaveToLocalStorageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const whetherToSave = event.target.checked;
    setSaveToLocalStorage(whetherToSave);
    if (!whetherToSave) {
      deleteApiKeyFromLocalStorage(span);
    } else {
      saveApiKeyInLocalStorageInTheFuture();
    }
  }

  var instructions = <></>;
  switch (props.instructions) {
    case "new environment":
      instructions = <>
        <p>Now grab your API key! The Home screen for your new environment eagerly wants to give you your API key.</p>
        <img className="screenshot" src="/home-api-key-screenshot.png" />
        <button className="button clear pull-right" onClick={props.switchToExistingEnvironment}>I don't see this screen</button>
      </>
      break;
    case "existing environment":
      instructions = <>
        <p>You can always get an API key from environment settings. Try this:</p>
        <ul>
          <li>In the top left, click the Environment selector. (It is right under the Honeycomb logo.)</li>
          <li>In the popout menu, choose "Manage Environments".</li>
          <li>In the list, find the environment you want to use. Next to that, click "View API Keys".</li>
          <li>Copy an existing one, or create a new one.</li>
          <li>Observaquiz needs these permissions: Send events, create datasets.</li>
        </ul>
      </>
      break;
    case "known api key":
      instructions = <>
        <p>You've been here before. 😉</p>
        <button className="button clear pull-right" onClick={props.switchToExistingEnvironment}>Tell me how to find an API key again</button>
      </>
  }

  return (
    <div>
      {instructions}
      <form onSubmit={formSubmit}>
        <div>
          <label htmlFor="apiKey-input">Paste your API key here:</label>
          <p className="grouped">
            <input
              id="apiKey-input"
              name="apiKey"
              className="apikey-goes-here"
              type="password"
              value={enteredApiKey}
              onChange={onApiKeyChange}
            ></input>
          </p>
          <p>
            <button
              disabled={!submitIsAvailable}
              className="button-4 centered-button"
              id="apikey-submit"
              type="submit"
              ref={buttonRef}
            >
              {loadingness ? "..." : "Submit"}
            </button>
          </p>
          <p className="error-response">{errorResponse}</p>
          <p>
            <input
              type="checkbox"
              id="save-api-key"
              checked={saveToLocalStorage}
              onChange={onSaveToLocalStorageChange}
            ></input>
            <label htmlFor="save-api-key">Save to local storage</label>
          </p>
        </div>
      </form>
      <p className="fine-print">
        This app will send about 400 events to your Honeycomb environment. You will see 2 new datasets: {HONEYCOMB_DATASET_NAME} and
        {BACKEND_DATASET_NAME}. As a team owner, you can delete these.
      </p>
    </div>
  );
}

type ApiKeyInputProps = { moveForward: (success: ApiKeyInputSuccess) => void, switchToExistingEnvironment: () => void, instructions: ApiKeyInstructions };
export type ApiKeyInstructions = "new environment" | "existing environment" | "known api key";
export function ApiKeyInput(props: ApiKeyInputProps) {
  return (
    <ComponentLifecycleTracing componentName="ApiKeyInput">
      <ApiKeyInputInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
