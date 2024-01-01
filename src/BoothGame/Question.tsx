import React, { ChangeEvent, ChangeEventHandler, Component } from "react";
import { InteractionTracing } from "../tracing/InteractionTracing";
import { HowToReset } from "../resetQuiz";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { fetchResponseToAnswer } from "./respondToAnswer";

type QuestionState =
  | { name: "answering"; inputEnabled: true; nextStep: "submit answer" }
  | { name: "loading response"; inputEnabled: false; nextStep: "cancel" }
  | { name: "showing response"; inputEnabled: false; nextStep: "next question" }
  | { name: "error"; inputEnabled: true; nextStep: "submit answer" };

function QuestionInternal(props: QuestionProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const { questionText, questionId } = props;

  const [answerContent, setAnswerContent] = React.useState<string>("");
  const [response, setResponse] = React.useState<string | undefined>(undefined);
  const [state, setState] = React.useState<QuestionState>({
    name: "answering",
    inputEnabled: true,
    nextStep: "submit answer",
  });

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
        if (response.status === "success") {
          setResponse(response.text);
          setState({ name: "showing response", inputEnabled: false, nextStep: "next question" });
        } else {
          setResponse(response.error); // TODO: this is cheating, make it a specific-appearing field
          setState({ name: "error", inputEnabled: true, nextStep: "submit answer" });
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
