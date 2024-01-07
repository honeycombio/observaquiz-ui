import React from "react";
import { Question } from "./Question";
import { ComponentLifecycleTracing } from "../tracing/ComponentLifecycleTracing";
import { HowToReset } from "../resetQuiz";
import { TracingErrorBoundary } from "../tracing/TracingErrorBoundary";
import { TracingTeamAware } from "../Tracker/TracingTracker";

type QuizProps = { questionSet: QuestionSet } & HowToReset & TracingTeamAware;

export type QuestionSet = {
  question_set: string;
  questions: Array<{
    question: string;
    question_number: number;
    id: string;
  }>;
};

function QuizInternal(props: QuizProps) {
  const { questionSet } = props;

  const [questionNumber, setQuestionNumber] = React.useState<number>(0);

  const currentQuestion = questionSet.questions[questionNumber];

  const nextQuestion = () => {
    setQuestionNumber(questionNumber + 1);
  };

  const content = (
    <Question
      key={questionNumber}
      questionId={currentQuestion.id}
      questionText={currentQuestion.question}
      moveForward={nextQuestion}
      howToReset={props.howToReset}
    />
  );

  return <div className="question-portion">{content}</div>;
}

export function Quiz(props: QuizProps) {
  return (
    <ComponentLifecycleTracing componentName="QuizApp">
      <TracingErrorBoundary howToReset={props.howToReset} tracingTeam={props.tracingTeam}>
        <QuizInternal {...props} />
      </TracingErrorBoundary>
    </ComponentLifecycleTracing>
  );
}
