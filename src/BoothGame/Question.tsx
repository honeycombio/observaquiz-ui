import React, { ChangeEvent } from "react";
import { HowToReset } from "../resetQuiz";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { fetchResponseToAnswer } from "./respondToAnswer";
import { Attributes } from "@opentelemetry/api";
import { HoneycombTeamContext } from "./HoneycombTeamContext";

type QuestionState =
  | { name: "no answer yet"; inputEnabled: true; nextStep: "submit answer"; alternativeNextStep: undefined }
  | { name: "answering"; inputEnabled: true; nextStep: "submit answer"; alternativeNextStep: undefined }
  | { name: "loading response"; inputEnabled: false; nextStep: "cancel"; alternativeNextStep: undefined }
  | { name: "showing response"; inputEnabled: false; nextStep: "next question"; alternativeNextStep: "try again" }
  | { name: "error"; inputEnabled: true; nextStep: "submit answer"; alternativeNextStep: undefined };

function QuestionInternal(props: QuestionProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const honeycombTeam = React.useContext(HoneycombTeamContext);
  const { questionText, questionId } = props;

  const [answerContent, setAnswerContent] = React.useState<string>("");
  const [response, setResponse] = React.useState<string | undefined>(undefined);
  const [state, setStateInternal] = React.useState<QuestionState>({
    name: "no answer yet",
    inputEnabled: true,
    nextStep: "submit answer",
    alternativeNextStep: undefined,
  });

  function setState(newState: QuestionState, reason?: string, attributes?: Attributes) {
    activeLifecycleSpan.addLog("state change", {
      "app.question.state": newState.name,
      "app.question.inputEnabled": newState.inputEnabled,
      "app.question.button": newState.nextStep,
      "app.question.prevState": state.name,
      "app.question.response": response,
      "app.question.stateChangeReason": reason || "unset",
      ...attributes,
    });
    setStateInternal(newState);
  }

  function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
    const typedContent = event.target.value;
    if (state.name === "no answer yet" && typedContent) {
      setState(
        { name: "answering", inputEnabled: true, nextStep: "submit answer", alternativeNextStep: undefined },
        "typed content"
      );
    }
    if (state.name === "answering" && !!typedContent) {
      setState(
        { name: "no answer yet", inputEnabled: true, nextStep: "submit answer", alternativeNextStep: undefined },
        "typed content"
      );
    }
    setAnswerContent(typedContent);
  }

  function resetQuiz(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    // this will remove this component entirely
    activeLifecycleSpan.addLog("reset quiz");
    props.howToReset(activeLifecycleSpan);
  }

  function submitAnswer(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    setState(
      { name: "loading response", inputEnabled: false, nextStep: "cancel", alternativeNextStep: undefined },
      "submit answer",
      { "app.question.answer": answerContent }
    ); // TODO: make all calls to setState add a log
    fetchResponse();
  }

  function fetchResponse() {
    activeLifecycleSpan;
    fetchResponseToAnswer(activeLifecycleSpan, honeycombTeam, { questionId, questionText, answerContent }).then(
      (response) => {
        if (response.status === "failure") {
          setResponse(response.error || "it didn't even give me an error");
          setState(
            { name: "error", inputEnabled: true, nextStep: "submit answer", alternativeNextStep: undefined },
            "failed to fetch response"
          );
        } else {
          // success
          const interpretation = `I give that a ${response.response.score}. ${response.response.response}`;
          setResponse(interpretation);
          setState(
            {
              name: "showing response",
              inputEnabled: false,
              nextStep: "next question",
              alternativeNextStep: "try again",
            },
            "answer received"
          );
        }
      }
    );
  }

  function nextQuestion(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    activeLifecycleSpan.addLog("next question");
    // no need to change state, this component will be replaced
    props.moveForward();
  }

  function cancel(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    activeLifecycleSpan.addLog("cancel");
    // TODO: not implemented. The response coming back has to check whether we have hit cancel.
  }

  function tryAgain(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    setResponse("");
    setAnswerContent("");
    setState(
      { name: "answering", inputEnabled: true, nextStep: "submit answer", alternativeNextStep: undefined },
      "Try again"
    );
  }

  var button: React.ReactNode = undefined;
  switch (state.nextStep) {
    case "submit answer":
      button = (
        <button className="" id="question-submit" type="submit" onClick={submitAnswer}>
          Submit
        </button>
      );
      break;
    case "next question":
      button = (
        <button className="" id="question-nextQuestion" type="submit" onClick={nextQuestion}>
          Next Question
        </button>
      );
      break;
    case "cancel":
      button = (
        <button className="" id="question-cancel" type="submit" onClick={cancel}>
          Cancel
        </button>
      );
      break;
  }

  var lessExcitingButton: React.ReactNode = undefined;
  switch (state.alternativeNextStep) {
    case "try again":
      lessExcitingButton = (
        <button className="button clear" id="question-tryAgain" type="submit" onClick={tryAgain}>
          Try Again
        </button>
      );
      break;
  }

  const usefulContent =
    state.name === "loading response" ? (
      <progress>progress</progress>
    ) : state.name === "error" ? (
      <span className="error">{response}</span>
    ) : (
      response
    );

  return (
    <div className="question-parent">
      <p className="question-text">{props.questionText}</p>
      <p>
        <textarea
          disabled={!state.inputEnabled}
          name="answer"
          className="answer-goes-here"
          value={answerContent}
          onChange={handleInput}
        />
      </p>
      <p className="answer-response">{usefulContent}</p>
      <p>
        {button}
        {lessExcitingButton}
        <button className="button clear pull-right" onClick={resetQuiz}>
          Reset quiz
        </button>
      </p>
      <p className="fine-print">
        The information you enter will be sent to: the Observaquiz backend, OpenAI for generating a response, DeepChecks
        for evaluating that response, and Honeycomb for tracing (both your team and our team). It will be retained in
        Honeycomb for 60 days.
      </p>
    </div>
  );
}

type QuestionProps = {
  questionId: string;
  questionText: string;
  moveForward: () => void;
} & HowToReset;

// this displays a question, receives an answer, and then provides a response.
export function Question(props: QuestionProps) {
  return (
    <ComponentLifecycleTracing componentName="question" attributes={{ "app.questionText": props.questionText }}>
      <QuestionInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
