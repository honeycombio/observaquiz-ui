import React, { ChangeEvent, ChangeEventHandler, Component } from "react";
import { InteractionTracing } from "../tracing/InteractionTracing";
import { HowToReset } from "../resetQuiz";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { ResponseFromAI, fetchResponseToAnswer } from "./respondToAnswer";

type QuestionState =
  | { name: "answering"; inputEnabled: true; nextStep: "submit answer" }
  | { name: "loading response"; inputEnabled: false; nextStep: "cancel" }
  | { name: "showing response"; inputEnabled: false; nextStep: "next question" }
  | { name: "error"; inputEnabled: true; nextStep: "submit answer" };

function weird(response: ResponseFromAI): boolean {
  if (response.status !== "success") {
    return true;
  }
  return !response.text;
}

function QuestionInternal(props: QuestionProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const { questionText, questionId } = props;

  const [answerContent, setAnswerContent] = React.useState<string>("");
  const [response, setResponse] = React.useState<string | undefined>(undefined);
  const [state, setStateInternal] = React.useState<QuestionState>({
    name: "answering",
    inputEnabled: true,
    nextStep: "submit answer",
  });

  function setState(newState: QuestionState) {
    activeLifecycleSpan.addLog("state change", {
      "app.question.state": newState.name,
      "app.question.inputEnabled": newState.inputEnabled,
      "app.question.button": newState.nextStep,
      "app.question.prevState": state.name,
      "app.question.response": response,
    });
    setStateInternal(newState);
  }

  function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
    setAnswerContent(event.target.value);
  }

  function resetQuiz(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    // this will remove this component entirely
    activeLifecycleSpan.addLog("reset quiz");
    props.howToReset(activeLifecycleSpan);
  }

  function submitAnswer(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    activeLifecycleSpan.addLog("submit answer", { "app.question.answer": answerContent });
    setState({ name: "loading response", inputEnabled: false, nextStep: "cancel" }); // TODO: make all calls to setState add a log
    fetchResponse();
  }

  function fetchResponse() {
    activeLifecycleSpan
      .inSpanAsync("fetch response", {}, () =>
        fetchResponseToAnswer(activeLifecycleSpan, { questionId, questionText, answerContent })
      )
      .then((response) => {
        if (response.status !== "success") {
          setResponse(response.error);
          setState({ name: "error", inputEnabled: true, nextStep: "submit answer" });
        } else if (weird(response)) {
          setResponse("Well that was a weird response");
          setState({ name: "error", inputEnabled: true, nextStep: "submit answer" });
        } else {
          // success
          setResponse(response.text);
          setState({ name: "showing response", inputEnabled: false, nextStep: "next question" });
        }
      });
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

  const usefulContent =
    state.name === "loading response" ? (
      "Loading..."
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
        <button className="button clear pull-right" onClick={resetQuiz}>
          Reset quiz
        </button>
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
      <InteractionTracing componentName="question">
        <QuestionInternal {...props} />
      </InteractionTracing>
    </ComponentLifecycleTracing>
  );
}
