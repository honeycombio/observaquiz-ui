import React, { ErrorInfo } from "react";
import { ActiveLifecycleSpan } from "./ComponentLifecycleTracing";
import { ErrorBoundary } from "react-error-boundary";
import { HowToReset } from "../resetQuiz";
import { getLinkToCurrentSpan } from "./activeLifecycleSpan";
import { HoneycombTeamContext } from "../BoothGame/HoneycombTeamContext";

export type TracingErrorBoundaryProps = { children: React.ReactNode } & HowToReset;

export function TracingErrorBoundary(props: TracingErrorBoundaryProps) {
  const activeLifecycleSpan = React.useContext(ActiveLifecycleSpan);
  const honeycombTeam = React.useContext(HoneycombTeamContext);

  function logError(error: Error, errorInfo: ErrorInfo) {
    console.log("Noticed error. Emitting as an error");
    activeLifecycleSpan.addError("Error boundary snagged", error, {
      "error.componentStack": errorInfo?.componentStack || "unknown error info",
    });
  }

  function linkToErrorSpan() {
    // TODO: combine this class with ComponentLifecycleTracing
    if (honeycombTeam) {
      return getLinkToCurrentSpan(honeycombTeam, activeLifecycleSpan);
    }
  }

  function resetQuiz() {
    props.howToReset(activeLifecycleSpan);
  }

  const fallback = (
    <div>
      <p>That didn't go so well.</p>
      <p>
        <a target="_blank" href={linkToErrorSpan()}>
          See the error in Honeycomb
        </a>
      </p>
      <p>
        <button className="button error" onClick={resetQuiz}>
          Reset quiz
        </button>
      </p>
    </div>
  );
  return (
    <ErrorBoundary fallback={fallback} onError={logError}>
      {props.children}
    </ErrorBoundary>
  );
}
