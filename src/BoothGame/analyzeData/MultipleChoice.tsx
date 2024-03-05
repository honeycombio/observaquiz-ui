import React from "react";
import { ComponentLifecycleTracing, ActiveLifecycleSpan } from "../../tracing/ComponentLifecycleTracing";
import { HoneycombTeamContext } from "../HoneycombTeamContext";
import { fetchFromBackend } from "../../tracing/fetchFromBackend";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { HoneycombQuerySpec } from "./DataQuestionParameters";

const LoadingAnswers = { name: "loading answers" };
const ErrorLoadingAnswers = { name: "error loading answers" };
type HaveQueryData<ParticularQueryData> = { name: "have query data"; queryRows: ParticularQueryData[] };
function haveQueryData<ParticularQueryData>(queryRows: ParticularQueryData[]): HaveQueryData<ParticularQueryData> {
  return { name: "have query data", queryRows };
}
type MultipleChoiceOuterState<ParticularQueryData> =
  | typeof LoadingAnswers
  | typeof ErrorLoadingAnswers
  | HaveQueryData<ParticularQueryData>;

type QueryDataResult<ParticularQueryData> = {
  query_id: string;
  result_id: string;
  error: string;
  query_data: ParticularQueryData[];
};

function MultipleChoiceOuter<ParticularQueryData>(props: MultipleChoiceProps<ParticularQueryData>) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const honeycombTeam = React.useContext(HoneycombTeamContext);

  const [state, setState] = useLocalTracedState<MultipleChoiceOuterState<ParticularQueryData>>(LoadingAnswers, {
    componentName: "MultipleChoiceFetcher",
  });

  React.useEffect(() => {
    if (!honeycombTeam.populated) {
      setState(ErrorLoadingAnswers, { reason: "honeycomb team not populated" });
      return;
    }
    const queryDataRequestBody = {
      query: props.queryDefinition,
      query_name: "Slowest response from LLM", // TODO: parameter
      dataset_slug: props.dataset,
      attendee_api_key: honeycombTeam.auth!.apiKey,
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
        setState(haveQueryData(queryDataReturned.query_data as ParticularQueryData[]), {
          eventName: "have answers",
          attributes: {
            // here's a way they can cheat, they can go look at the trace. That takes enough in-Honeycomb work that I'm OK with it
            "app.multipleChoice.query_data": JSON.stringify(queryDataReturned.query_data),
            "app.multipleChoice.answers": queryDataReturned.query_data.map(props.formatAnswer),
            "app.multipleChoice.rightAnswer": props.formatAnswer(
              props.chooseCorrectAnswer(queryDataReturned.query_data)
            ),
          },
        });
      }
    });
  }, []);

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
      </div>
    );
  }

  return <MultipleChoiceInternal {...props} queryRows={(state as HaveQueryData<ParticularQueryData>).queryRows} />;
}

type MultipleChoiceInternalProps<ParticularQueryData> = {
  queryRows: ParticularQueryData[];
  chooseCorrectAnswer: (data: ParticularQueryData[]) => ParticularQueryData;
  formatAnswer: (row: ParticularQueryData) => string;
  moveOn: (result: MultipleChoiceResult) => void;
};

type AnswerOption = {
  key: string;
  text: string;
};

function shuffle<T>(unshuffled: T[]) {
  return unshuffled
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

const NoAnswerPicked = {
  name: "no answer picked",
  answer: undefined,
  button: "submit",
  buttonEnabled: false,
  radioButtonsEnabled: true,
};
type PickedOne = {
  name: "they have chosen";
  answer: AnswerOption;
  button: "Submit";
  buttonEnabled: true;
  radioButtonsEnabled: true;
};
type DeliverVerdict = {
  name: "deliver verdict";
  answer: AnswerOption;
  correct: boolean;
  button: "Proceed";
  buttonEnabled: true;
  radioButtonsEnabled: false;
};

type MultipleChoiceInternalState = typeof NoAnswerPicked | PickedOne | DeliverVerdict;

function MultipleChoiceInternal<ParticularQueryData>(props: MultipleChoiceInternalProps<ParticularQueryData>) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const [state, setState] = useLocalTracedState<MultipleChoiceInternalState>(NoAnswerPicked, {
    componentName: "MultipleChoiceDisplay",
  });

  // the nondeterminism of this means that I want to calculate it exactly once
  const answers = React.useMemo(
    () =>
      shuffle([...new Set(props.queryRows.map(props.formatAnswer))]).map((answer, index) => ({
        text: answer,
        key: "answer" + index,
      })),
    [props.queryRows, props.formatAnswer]
  );

  const questionText = "Which question led to the slowest response?";

  const handleSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const currentAnswer = answers.find((a) => a.key === event.target.value);
    setState(
      {
        name: "they have chosen",
        answer: currentAnswer,
        button: "Submit",
        buttonEnabled: true,
        radioButtonsEnabled: true,
      },
      { eventName: "select " + event.target.value }
    );
  };

  const submitAnswer = (event: React.MouseEvent) => {
    const correct = props.formatAnswer(props.chooseCorrectAnswer(props.queryRows)) === (state as PickedOne).answer.text;
    event.preventDefault();
    setState(
      {
        name: "deliver verdict",
        answer: (state as PickedOne).answer,
        correct,
        button: "Proceed",
        buttonEnabled: true,
        radioButtonsEnabled: false,
      },
      { eventName: "submit answer" }
    );
  };

  const result =
    state.name === "deliver verdict"
      ? (state as DeliverVerdict).correct
        ? "Right!!! 300 points!"
        : "Hmm, I disagree. 0 points"
      : "";

  function radioButtonFromData(row: AnswerOption, index: number) {
    const thisOne = row.key;
    return (
      <li key={thisOne}>
        <label>
          <input
            className="radio"
            type="radio"
            value={thisOne}
            key={thisOne}
            checked={state.answer?.key === thisOne}
            onChange={handleSelection}
            disabled={!state.radioButtonsEnabled}
          />
          {row.text}
        </label>
      </li>
    );
  }

  function proceeeeed(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    activeLifecycleSpan.addLog("move on");
    props.moveOn({ score: (state as DeliverVerdict).correct ? 300 : 0 });
  }

  const whatToDoNext = state.button === "Submit" ? submitAnswer : proceeeeed;
  return (
    <div id="multiple-choice">
      <p className="question-text">{questionText}</p>
      <ul>{answers.map(radioButtonFromData)}</ul>
      <p>{result}</p>
      <p>
        <button id="question-go" type="submit" disabled={!state.buttonEnabled} onClick={whatToDoNext}>
          {state.button}
        </button>
      </p>
    </div>
  );
}

export type OverviewRowFromQuery = Record<string, string | number>;

export type MultipleChoiceResult = { score: number };

// TODO: make a happy type to represent a query. ChatGPT makes this fast
type MultipleChoiceProps<ParticularQueryData> = {
  queryDefinition: HoneycombQuerySpec;
  dataset: string;
  chooseCorrectAnswer: (data: ParticularQueryData[]) => ParticularQueryData;
  formatAnswer: (row: ParticularQueryData) => string;
  moveOn: (result: MultipleChoiceResult) => void;
};
export function MultipleChoice<ParticularQueryData>(props: MultipleChoiceProps<ParticularQueryData>) {
  return (
    <ComponentLifecycleTracing componentName="MultipleChoice">
      <MultipleChoiceOuter {...props} />
    </ComponentLifecycleTracing>
  );
}
