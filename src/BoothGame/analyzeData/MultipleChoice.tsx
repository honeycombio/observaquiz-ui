import React from "react";
import { ComponentLifecycleTracing, ActiveLifecycleSpan } from "../../tracing/ComponentLifecycleTracing";
import { HowToReset } from "../../resetQuiz";
import { HoneycombTeamContext } from "../HoneycombTeamContext";
import { fetchFromBackend } from "../../tracing/fetchFromBackend";
import { useLocalTracedState } from "../../tracing/LocalTracedState";

const LoadingAnswers = { name: "loading answers" };
const ErrorLoadingAnswers = { name: "error loading answers" };
type ShowingAnswers<ParticularQueryData> = { name: "showing answers"; answers: ParticularQueryData[] };
function showingAnswers<ParticularQueryData>(answers: ParticularQueryData[]): ShowingAnswers<ParticularQueryData> {
  return { name: "showing answers", answers };
}
type PickedOne<ParticularQueryData> = { name: "picked one"; answers: ParticularQueryData[]; picked: string };

type QueryDataResult<ParticularQueryData> = {
  query_id: string;
  result_id: string;
  error: string;
  query_data: ParticularQueryData[];
};

type MultipleChoiceState<ParticularQueryData> =
  | typeof LoadingAnswers
  | typeof ErrorLoadingAnswers
  | ShowingAnswers<ParticularQueryData>;

function MultipleChoiceInternal<ParticularQueryData>(props: MultipleChoiceProps<ParticularQueryData>) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const honeycombTeam = React.useContext(HoneycombTeamContext);

  const [state, setState] = useLocalTracedState<MultipleChoiceState<ParticularQueryData>>(LoadingAnswers);

  React.useEffect(() => {
    const queryDataRequestBody = {
      query: props.queryDefinition,
      query_name: "Slowest response from LLM",
    };

    fetchFromBackend({
      url: "/api/queryData",
      honeycombTeam: honeycombTeam,
      span: activeLifecycleSpan,
      method: "POST",
      body: JSON.stringify(queryDataRequestBody),
      attributesFromJson: (json: QueryDataResult<ParticularQueryData>) => {
        return {
          "app.result.queryId": json.query_id,
          "app.result.resultId": json.result_id,
          "app.result.error": json.error,
        };
      },
    }).then((json) => {
      console.log("Answers retrieved", json);
      const queryDataReturned = json as QueryDataResult<ParticularQueryData>;
      if (queryDataReturned.error) {
        activeLifecycleSpan.addError(
          "error fetching answers",
          new Error("failed to fetch query data: " + queryDataReturned.error)
        );
        setState(ErrorLoadingAnswers);
      } else {
        if (!queryDataReturned.query_data) {
          activeLifecycleSpan.addError(
            "no answers fetched",
            new Error("what even is in here: " + JSON.stringify(queryDataReturned))
          );
          setState(ErrorLoadingAnswers);
        }
        setState(showingAnswers(queryDataReturned.query_data as ParticularQueryData[]));
      }
    });
  }, []);

  const questionText = "Which question led to the slowest response?";

  function resetQuiz(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    // this will remove this component entirely
    activeLifecycleSpan.addLog("reset quiz");
    props.howToReset(activeLifecycleSpan);
  }

  if (state.name === "loading answers") {
    return (
      <div className="loading">
        <progress>progress</progress>
      </div>
    );
  }
  if (state.name === "error loading answers") {
    return (
      <div className="error">
        <p>DOOOM</p>{" "}
        <button className="button clear pull-right" onClick={resetQuiz}>
          Reset quiz
        </button>
      </div>
    );
  }

  // showing answers

  const handleSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    activeLifecycleSpan.addLog("Answer clicked: " + event.target.value);
  };
  const selectedOption: string = "optidon1";

  function radioButtonFromData(row: ParticularQueryData, index: number) {
    const thisOne = "answer" + index;
    return (
      <li>
        <label>
          <input
            className="radio"
            type="radio"
            value={thisOne}
            key={thisOne}
            checked={selectedOption === thisOne}
            onChange={handleSelection}
          />
          {props.formatAnswer(row)}
        </label>
      </li>
    );
  }
  return (
    <div id="multiple-choice">
      <p className="question-text">{questionText}</p>
      <ul>{(state as ShowingAnswers<ParticularQueryData>).answers.map(radioButtonFromData)}</ul>
      <p>
        <button id="question-go" type="submit">
          Submit
        </button>
        <button className="button clear pull-right" onClick={resetQuiz}>
          Reset quiz
        </button>
      </p>
    </div>
  );
}

export type OverviewRowFromQuery = Record<string, string | number>;

// TODO: make a happy type to represent a query. ChatGPT makes this fast
type MultipleChoiceProps<ParticularQueryData> = {
  queryDefinition: object;
  chooseCorrectAnswer: (data: ParticularQueryData[]) => ParticularQueryData;
  formatAnswer: (row: ParticularQueryData) => string;
} & HowToReset;
export function MultipleChoice<ParticularQueryData>(props: MultipleChoiceProps<ParticularQueryData>) {
  return (
    <ComponentLifecycleTracing componentName="MultipleChoice">
      <MultipleChoiceInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
