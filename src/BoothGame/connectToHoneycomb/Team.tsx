import React from "react";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { RadioButtonList } from "./RadioButtonList";

const InMyPlayTeamButton = {
  text: "OK",
  href: undefined,
  result: { honeycombTeam: "existing" } as GetThemATeamResult,
};

const MakeANewTeamButton = {
  text: "Teams page",
  href: "https://ui.honeycomb.io/teams",
  result: { honeycombTeam: "new" } as GetThemATeamResult,
};

const SwitchToPlayTeamButton = {
  text: "Teams page",
  href: "https://ui.honeycomb.io/teams",
  result: { honeycombTeam: "existing" } as GetThemATeamResult,
};

const NothingSelectedYet = {
  stateName: "no selection",
  instructions: "empty" as GetThemATeamInstructions,
  button: undefined,
};
const SelectedWork = {
  stateName: "use it for work",
  instructions: "create a new team" as GetThemATeamInstructions,
  button: MakeANewTeamButton,
};
const SelectedPlay = {
  stateName: "have a play team",
  instructions: "great" as GetThemATeamInstructions,
  button: InMyPlayTeamButton,
};
const SelectedBoth = {
  stateName: "both work and personal teams",
  instructions: "switch to personal team" as GetThemATeamInstructions,
  button: SwitchToPlayTeamButton,
};

type GetThemATeamInstructions = "empty" | "create a new team" | "great" | "switch to personal team";

type GetThemATeamState = typeof NothingSelectedYet | typeof SelectedWork | typeof SelectedPlay | typeof SelectedBoth;

type TeamDescription = "work" | "play" | "both";

type RadioButtonRow = { key: TeamDescription; text: string; moveToState: GetThemATeamState };
const radioButtons: Array<RadioButtonRow> = [
  { key: "work", text: "I use Honeycomb at work", moveToState: SelectedWork },
  { key: "play", text: "I have a Honeycomb team that I play around with", moveToState: SelectedPlay },
  { key: "both", text: "Both", moveToState: SelectedBoth },
];

function GetThemATeamInternal(props: GetThemATeamProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const [state, setState] = useLocalTracedState<GetThemATeamState>(NothingSelectedYet);

  const handleSelection = (ls: RadioButtonRow) => {
    console.log("value: ", ls);
    setState(ls.moveToState);
  };

  var instructions = <></>;
  switch (state.instructions) {
    case "create a new team":
      instructions = (
        <>
          <p>
            We recommend creating your own free Honeycomb team for Observaquiz. That way your data won't show up in your
            work team, and you'll have full permissions to delete it afterward if you want to.
          </p>
          <p>
            On the teams page, you'll find a list of all your teams. Below that is "Create team." Make yourself a new
            team now.
          </p>
          <p>
            Name your team something unique to you. When it prompts you to name an environment, call it "quiz".
          </p>
          <p>
            Your new team is on the free Honeycomb plan, ready to receive up to 20 million events per month, forever.
          </p>
        </>
      );
      break;
    case "switch to personal team":
      instructions = (
        <>
          <p>
            Great! You'll want to use your personal team.
          </p>
          <p>Click the button to see all your teams. Please choose your personal team.</p>
        </>
      );
      break;
    case "great":
      instructions = (
        <>
          <p>A personal team is perfect for Observaquiz!</p>
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
    if (state.button.href) {
      button = (
        <a href={state.button.href} target="_blank" className="button primary" onClick={buttonClick}>
          {state.button.text}
        </a>
      );
    } else {
      button = (
        <button className="button primary" onClick={buttonClick}>
          {state.button.text}
        </button>
      );
    }
  }
  return (
    <>
      <p>How do you use Honeycomb?</p>
      <RadioButtonList radioButtons={radioButtons} handleSelection={handleSelection} />
      {instructions}
      {button}
    </>
  );
}

export type GetThemATeamResult = { honeycombTeam: "new" | "existing" };

export type GetThemATeamProps = { handleCompletion: (s: GetThemATeamResult) => void };

export function GetThemATeam(props: GetThemATeamProps) {
  return (
    <ComponentLifecycleTracing componentName="team">
      <GetThemATeamInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
