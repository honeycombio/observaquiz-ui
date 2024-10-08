import React, { useEffect } from "react";
import { ComponentLifecycleTracing, ActiveLifecycleSpan } from "../../tracing/ComponentLifecycleTracing";
import { HoneycombTeamContext } from "../HoneycombTeamContext";
import { fetchFromBackend } from "../../tracing/fetchFromBackend";
import { useLocalTracedState } from "../../tracing/LocalTracedState";
import { QueryObject, secondsSinceTheExecutionBegan } from "../../tracing/TracingDestination";

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
  const { queryName } = props;

  const [state, setState] = useLocalTracedState<MultipleChoiceOuterState<ParticularQueryData>>(LoadingAnswers, {
    componentName: "MultipleChoiceFetcher",
  });

  React.useEffect(() => {
    if (!honeycombTeam.populated) {
      setState(ErrorLoadingAnswers, { reason: "honeycomb team not populated" });
      return;
    }
    const howLongToGoBack = secondsSinceTheExecutionBegan(honeycombTeam)
    // TODO: I think we should _not_ do this here. Make them pass it in. Because they might also link to the query and it needs to be consistent
    activeLifecycleSpan.setAttributes({ "app.queryData.how_long_to_go_back": howLongToGoBack });
    const queryDefinitionSinceBeginningOfExecution = {
      ...props.queryDefinition,
      time_range: howLongToGoBack
    }
    const queryDataRequestBody = {
      query: queryDefinitionSinceBeginningOfExecution,
      query_name: queryName,
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
      const queryDataReturned = json as QueryDataResult<ParticularQueryData>;
      if (queryDataReturned.error) { throw new Error("failed to fetch query data: " + queryDataReturned.error) }
      if (!queryDataReturned.query_data) { throw new Error("No query data is here") }

      setState(haveQueryData(queryDataReturned.query_data as ParticularQueryData[]), {
        eventName: "have answers",
        attributes: {
          "app.multipleChoice.query_data": JSON.stringify(queryDataReturned.query_data),
        },
      });
    }).catch((e: Error) => {
      activeLifecycleSpan.addError("error fetching answers", e);
      setState(ErrorLoadingAnswers);
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

  const queryRows = (state as HaveQueryData<ParticularQueryData>).queryRows
  return <MultipleChoiceInternal {...props} {...props.interpretData(queryRows)} />;
}

type MultipleChoiceInternalProps = {
  questionText: React.ReactNode
  answers: AnswerOption[],
  scoreAnswer: (a: AnswerOption) => Score
  moveOn: (result: MultipleChoiceResult) => void;
  enabled: boolean
};

export type AnswerOption = {
  key: string;
  text: string;
};

export type Score = {
  points: number,
  remark: string
}

const NoAnswerAllowedYet = {
  name: "no answer allowed yet",
  answer: undefined,
  button: "Submit",
  buttonEnabled: false,
  radioButtonsEnabled: false,
};

const NoAnswerPicked = {
  name: "no answer picked",
  answer: undefined,
  button: "Submit",
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
  score: Score;
  button: "Proceed";
  buttonEnabled: true;
  radioButtonsEnabled: false;
};

type MultipleChoiceInternalState = typeof NoAnswerPicked | PickedOne | DeliverVerdict;

function MultipleChoiceInternal(props: MultipleChoiceInternalProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const [state, setState] = useLocalTracedState<MultipleChoiceInternalState>(props.enabled ? NoAnswerPicked : NoAnswerAllowedYet, {
    componentName: "MultipleChoiceDisplay",
  });

  useEffect(() => {
    // this state update comes in from outside
    if (state.name === "no answer allowed yet" && props.enabled) {
       setState(NoAnswerPicked);
    }
  }, [props.enabled, state])

  const answers = props.answers

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
    const score = props.scoreAnswer((state as PickedOne).answer);
    event.preventDefault();
    setState(
      {
        name: "deliver verdict",
        answer: (state as PickedOne).answer,
        score,
        button: "Proceed",
        buttonEnabled: true,
        radioButtonsEnabled: false,
      },
      { eventName: "submit answer" }
    );
  };

  const result =
    state.name === "deliver verdict"
      ? (state as DeliverVerdict).score.remark
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
    props.moveOn({ score: (state as DeliverVerdict).score.points });
  }

  const whatToDoNext = state.button === "Submit" ? submitAnswer : proceeeeed;
  return (
    <div id="multiple-choice">
      <p className="question-text">{props.questionText}</p>
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

export type WhatMultipleChoiceNeedsToKnow = {
  answers: AnswerOption[],
  scoreAnswer: (a: AnswerOption) => Score
}

// TODO: make a happy type to represent a query. ChatGPT makes this fast
type MultipleChoiceProps<ParticularQueryData> = {
  questionText: React.ReactNode
  queryDefinition: QueryObject;
  queryName: string;
  dataset: string;
  interpretData: (data: ParticularQueryData[]) => WhatMultipleChoiceNeedsToKnow;
  moveOn: (result: MultipleChoiceResult) => void;
  enabled: boolean;
};
export function MultipleChoice<ParticularQueryData>(props: MultipleChoiceProps<ParticularQueryData>) {
  return (
    <ComponentLifecycleTracing componentName="MultipleChoice">
      <MultipleChoiceOuter {...props} />
    </ComponentLifecycleTracing>
  );
}
