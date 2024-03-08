import React from "react";
import { ComponentLifecycleTracing } from "../../tracing/ComponentLifecycleTracing";
import { TrackedStep, } from "../../Tracker/trackedSteps";
import { TheNextQuestionParameters, whichResponseTookTheLongestQuestionParameters } from "./DataQuestionParameters";
import { HoneycombTeamContext } from "../HoneycombTeamContext";

function AnalyzeDataInternal(props: AnalyzeDataProps) {
  const team = React.useContext(HoneycombTeamContext);


  const proceedButton = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    proceedButton.current?.focus();
  }, [proceedButton.current]);

  function proceed() {
    if (!team.populated) { // make typescript happy
      throw new Error("Honeycomb team not populated, not ok");
    }
    props.defineDataQuestions([{
      id: "data-question-1",
      name: "When was OpenAI the slowest?",
      // parameters are now hard-coded in BoothGame
    }
    // TODO: wanted to get a single trace for this question, but it's not working
    // , {
    //   id: "trace-question-2",
    //   name: "How many posts are in this trace?",
    // }
    ])
  }
  return (
    <div>
      <p>
        Now it's time to look at the performance of this Observaquiz application.
      </p>
      <p>
        Your Honeycomb team has data about
        your experience answering those questions just now. In this part of the quiz,
        you'll look at that data to answer new questions.
      </p>

      <button
        id="proceed"
        className="button primary"
        onClick={proceed}
        ref={proceedButton}
      >
        Let's do it
      </button>
    </div>
  );
}
export type AnalyzeDataProps = { defineDataQuestions: (substeps: TrackedStep[]) => void };
export function AnalyzeData(props: AnalyzeDataProps) {
  return (
    <ComponentLifecycleTracing componentName="analyze-data">
      <AnalyzeDataInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
