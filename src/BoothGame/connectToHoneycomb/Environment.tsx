import React from "react";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { RadioButtonList } from "./RadioButtonList";

const CreatedANewEnvironment = {
  text: "OK, I created one",
  result: { honeycombEnvironment: "new" } as GetAnEnvironmentResult,
};

const UseAnExistingOne = {
  text: "No, I want to use an existing one",
  result: { honeycombEnvironment: "existing" } as GetAnEnvironmentResult,
};

function GetAnEnvironmentInternal(props: GetAnEnvironmentProps) {

  const goodButton = (
    <button
      className="button primary"
      onClick={() => props.handleCompletion(CreatedANewEnvironment.result)}>
      {CreatedANewEnvironment.text}
    </button>);
  const alternateButton = (
    <button
      className="button primary"
      onClick={() => props.handleCompletion(UseAnExistingOne.result)}>
      {UseAnExistingOne.text}
    </button>);
  return (
    <>
      <p>Since you already have a team, it's a good idea to create an environment for Observaquiz.</p>
      <p>An environment is like "production" or "test" -- it describes where the data comes from.
        The data coming from Observaquiz is its own thing, so it belongs in its own environment.</p>

      <p>To make a new environment in Honeycomb:</p>
      <div className="instructions-flex-parent">
        <ul>
          <li>At the top left, just below the Honeycomb logo, click on the <span className="small-caps">ENVIRONMENT</span>{" "}
            selector.</li>
          <li>In the menu that pops up, click "Manage Environments."</li>
          <li>In the top right, click "Create Environment."</li>
          <li>Maybe name it "quiz"</li>
        </ul>
        <img src="/create-env.gif" />
      </div>
      {goodButton}{alternateButton}
    </>
  );
}

export type GetAnEnvironmentResult = { honeycombEnvironment: "new" | "existing" };

export type GetAnEnvironmentProps = { handleCompletion: (s: GetAnEnvironmentResult) => void };

export function GetAnEnvironment(props: GetAnEnvironmentProps) {
  return (
    <ComponentLifecycleTracing componentName="environment">
      <GetAnEnvironmentInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
