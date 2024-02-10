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

  return (
    <div>
      <form onSubmit={formSubmit}>
        <div className="question-parent">
          <p className="">
            First, please sign up (free) or log in to{" "}
            <a target="_blank" href="https://ui.honeycomb.io">
              Honeycomb
            </a>{" "}
            and{" "}
            <a target="_blank" href="https://docs.honeycomb.io/working-with-your-data/settings/api-keys/#find-api-keys">
              get an API key
            </a>
            .
          </p>
          <p>The key needs these permissions: Send Events & Create Datasets.</p>
          <p>We will send traces from this quiz session to Honeycomb so you can see them!</p>
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
              disabled={!submitIsAvailable} // I don't like this. I want a state that is a function of other state...
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
        This app will send data to your Honeycomb environment. You will see 2 new datasets: {HONEYCOMB_DATASET_NAME} and
        {BACKEND_DATASET_NAME}. As a team owner, you can delete these.
      </p>
      <p className="fine-print">
        Your team will get about 300 events. A free Honeycomb team can receive 20,000,000 events per month.
      </p>
    </div>
  );
}

type ApiKeyInputProps = { moveForward: (success: ApiKeyInputSuccess) => void };
export function ApiKeyInput(props: ApiKeyInputProps) {
  return (
    <ComponentLifecycleTracing componentName="ApiKeyInput">
      <ApiKeyInputInternal {...props} />
    </ComponentLifecycleTracing>
  );
}