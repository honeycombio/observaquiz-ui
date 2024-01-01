import { ActiveLifecycleSpanType } from "../tracing/ComponentLifecycleTracing";

export type ResponseFromAI =
  | {
      status: "success";
      text: string;
    }
  | { status: "failure"; error: string };

export function fetchResponseToAnswer(
  span: ActiveLifecycleSpanType,
  params: {
    questionId: string;
    questionText: string;
    answerContent: string;
  }
): Promise<ResponseFromAI> {
  const { questionId, questionText, answerContent } = params;
  return span
    .inContext(() =>
      fetch(`/api/questions/${questionId}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionText,
          answerContent,
        }),
      })
    )
    .then((response) => {
      if (response.ok) {
        return response.json().then((json) => {
          span.addLog("Response received", { "app.question.response": JSON.stringify(json) });
          return { status: "success", text: json.text } as ResponseFromAI;
        });
      } else {
        span.addLog("Error received", {
          "app.question.response.status": response.status,
          "app.question.error": response.statusText,
        });
        return { status: "failure", error: response.statusText } as ResponseFromAI;
      }
    })
    .catch((error: Error) => {
      // TODO: make a function that adds an error, and sets the duration span to error, and prints the log with error severity
      span.addLog("Error received", {
        "app.question.error": error.message,
      });
      return { status: "failure", error: (error as Error).message } as ResponseFromAI;
    });
}
