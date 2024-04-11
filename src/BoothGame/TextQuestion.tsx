import React, { ChangeEvent, useEffect } from "react";
import { ActiveLifecycleSpan, ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { fetchResponseToAnswer } from "./respondToAnswer";
import { HoneycombTeamContext } from "./HoneycombTeamContext";
import { useLocalTracedState } from "../tracing/LocalTracedState";

// Show the question
const NoAnswerYet = {
  name: "no answer yet",
  inputEnabled: true,
  nextStep: "submit answer",
  nextStepEnabled: false,
  askForOpinion: false,
  alternativeNextStep: undefined,
  focusOn: "text area",
};

// they have typed something in the box
const Answering = {
  name: "answering",
  inputEnabled: true,
  nextStep: "submit answer",
  nextStepEnabled: true,
  askForOpinion: false,
  alternativeNextStep: undefined,
  focusOn: "nothing",
};

// they entered their response, now ask the bff
const LoadingResponse = {
  name: "loading response",
  inputEnabled: false,
  nextStep: "cancel",
  nextStepEnabled: true,
  askForOpinion: false,
  alternativeNextStep: undefined,
  focusOn: "button",
};

// we have a response, they should read it and give their opinion
const ShowingResponse = {
  name: "showing response",
  inputEnabled: false,
  nextStep: "next question",
  nextStepEnabled: false,
  askForOpinion: true,
  alternativeNextStep: "try again",
  focusOn: "opinion",
};

// they have selected an opinion about the response.
const OpinionGiven = {
  name: "opinion given",
  inputEnabled: false,
  nextStep: "next question",
  askForOpinion: true,
  nextStepEnabled: true,
  alternativeNextStep: "try again",
  focusOn: "button",
};

const ErrorState = {
  name: "error",
  inputEnabled: true,
  nextStep: "submit answer",
  nextStepEnabled: true,
  askForOpinion: false,
  alternativeNextStep: undefined,
  focusOn: "button",
};

type OpinionOption = "meh" | "yeah" | "whoa"

const opinions: Array<{ value: OpinionOption, label: string }> = [
  { value: "meh", label: "Meh" },
  { value: "yeah", label: "Sure, OK" },
  { value: "whoa", label: "I didn't know that" }
]

type QuestionState =
  | typeof NoAnswerYet
  | typeof Answering
  | typeof LoadingResponse
  | typeof ShowingResponse
  | typeof OpinionGiven
  | typeof ErrorState;

function TextQuestionInternal(props: QuestionProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const honeycombTeam = React.useContext(HoneycombTeamContext);
  const { questionText, questionId } = props;

  const [answerContent, setAnswerContent] = React.useState<string>("");
  const [opinion, setOpinion] = useLocalTracedState<OpinionOption | null>(null);
  const [response, setResponse] = React.useState<string | undefined>(undefined);
  const [highScore, setHighScore] = React.useState<number>(-2);
  const [state, setState] = useLocalTracedState<QuestionState>(NoAnswerYet, {
    componentName: "question",
    addAttributes: (newState) => ({
      "app.question.button": newState.nextStep,
      "app.question.inputEnabled": newState.inputEnabled,
      "app.question.state": newState.name,
    }),
  });

  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const textArea = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the button when the component renders or updates
    if (state.focusOn == "button") {
      buttonRef.current?.focus();
    }
    if (state.focusOn == "text area") {
      textArea.current?.focus();
    }
  }, [state]);

  function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
    const typedContent = event.target.value;
    if (state.name === "no answer yet" && !!typedContent.trim()) {
      setState(Answering, { reason: "typed content" });
    }
    if (state.name === "answering" && !typedContent) {
      setState(NoAnswerYet, { reason: "removed all content" });
    }
    if (typedContent.endsWith("\n")) {
      // there has to be a better way to do this. I don't want to submit if they pressed shift-enter
      console.log("Click the button");
      setAnswerContent(typedContent.trim());
      buttonRef.current?.click();
    } else {
      setAnswerContent(typedContent);
    }
  }

  function submitAnswer(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    reactToSubmit();
  }

  function reactToSubmit() {
    // this can be triggered by pressing enter in the text box, or pressing the button
    setState(LoadingResponse, { reason: "submit answer", attributes: { "app.question.answer": answerContent } });
    fetchResponse();
  }

  function fetchResponse() {
    activeLifecycleSpan;
    fetchResponseToAnswer(activeLifecycleSpan, honeycombTeam, { questionId, questionText, answerContent }).then(
      (response) => {
        if (response.status === "failure") {
          setResponse(response.error || "it didn't even give me an error");
          setState(ErrorState, { reason: "failed to fetch response" });
        } else {
          setHighScore(Math.max(highScore, response.response.score));
          // success
          const interpretation = `I give that a ${response.response.score}. ${response.response.response}`;
          setResponse(interpretation);
          setState(ShowingResponse, { reason: "answer received" });
        }
      }
    );
  }

  function nextQuestion(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    activeLifecycleSpan.withLog("next question", {}, () =>
      // no need to change state, this component will be replaced
      props.moveForward({ score: highScore })
    );
  }

  function cancel(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    activeLifecycleSpan.addLog("cancel");
    // TODO: not implemented. The response coming back has to check whether we have hit cancel.
  }

  function tryAgain(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    setResponse("");
    // leave their answer there so they can modify it
    setState(NoAnswerYet, { reason: "Try again" });
  }

  var buttonNextStep =
    state.nextStep === "submit answer"
      ? submitAnswer
      : state.nextStep === "next question"
        ? nextQuestion
        : state.nextStep === "cancel"
          ? cancel
          : () => console.log("Mystery button"); // this should never happen

  var buttonText =
    state.nextStep === "submit answer"
      ? "Submit"
      : state.nextStep === "next question"
        ? "Next Question"
        : state.nextStep === "cancel"
          ? "Cancel"
          : "Mystery Button";

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

  const handleOpinion = (e: ChangeEvent<HTMLInputElement>) => {
    const opinion = e.target.value as OpinionOption;
    setOpinion(opinion, { attributes: { "app.question.response": response, "app.question.opinion": opinion } });
    activeLifecycleSpan.setAttributes({ "app.question.opinion": opinion })
    setState(OpinionGiven);
  };

  const opinionButtons = <>
    <form>
      Opinionate Here:
      {opinions.map((option, i) =>
        <label>
          <input
            className="radio"
            type="radio"
            value={option.value}
            key={"opinion" + i}
            checked={opinion === option.value}
            onChange={handleOpinion}
          />
          {option.label}
        </label>
      )}
    </form>
  </>

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
          ref={textArea}
        />
      </p>
      <p className="answer-response">{usefulContent}</p>
      {state.askForOpinion && <p> {opinionButtons}</p>}
      <p>
        <button
          id="question-go"
          type="submit"
          disabled={!state.nextStepEnabled}
          onClick={buttonNextStep}
          ref={buttonRef}
        >
          {buttonText}
        </button>
        {lessExcitingButton}
      </p>
      <p className="fine-print">
        The information you enter will be sent to: the Observaquiz backend, OpenAI for generating a response, DeepChecks
        for evaluating that response, and Honeycomb for tracing (both your team and our team). It will be retained in
        Honeycomb for 60 days. Other conference attendees might see your answers, if they come to our booth to look at the leaderboard.
      </p>
    </div>
  );
}

type QuestionProps = {
  questionNumber: number;
  questionId: string;
  questionText: string;
  moveForward: (result: QuestionResult) => void;
};

export type QuestionResult = {
  score: number;
};

// this displays a question, receives an answer, and then provides a response.
export function TextQuestion(props: QuestionProps) {
  return (
    <ComponentLifecycleTracing
      componentName="question"
      spanName={"Question: " + props.questionText}
      attributesForAllChildren={{ "app.question.text": props.questionText }}
      attributes={{ "app.question.id": props.questionId, "app.question.number": props.questionNumber }}
    >
      <TextQuestionInternal {...props} />
    </ComponentLifecycleTracing>
  );
}
