import React from "react";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { HoneycombTeamContextType } from "./HoneycombTeamContext";
import { TracingTeam, getUrlToTeam } from "../tracing/TracingDestination";

function TellThemAboutTheConnectionInternal(
  props: TellThemAboutTheConnectionProps
) {
  const team = props.team as TracingTeam;
  const teamUrl = getUrlToTeam(team);
  const teamName = team.auth!.team.name;
  return (
    <>
      <h1 className="text-center">Interact with ObservaQUIZ</h1>
      <p>
        Your data is in Honeycomb now! You can interact with it in your{" "}
        <a href={teamUrl}>{teamName}</a>. team.
      </p>
      <p>There are two datasets:</p>
      <ul>
        <li>
          `observaquiz-browser` traces your interactions with this browser
          window.
        </li>
        <li>`observaquiz-bff` shows what's happening in the backend</li>
      </ul>
      <p>
        Next, here come some free-form questions. Tell us what you think, and
        get points!
      </p>
      <div className="text-center">
        <button type="submit" onClick={() => props.moveForward()}>
          Let's go
        </button>
      </div>
    </>
  );
}

type TellThemAboutTheConnectionProps = {
  moveForward: () => void;
  team: HoneycombTeamContextType;
};

export function TellThemAboutTheConnection(
  props: TellThemAboutTheConnectionProps
) {
  return (
    <ComponentLifecycleTracing componentName="Hello">
      <TellThemAboutTheConnectionInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
