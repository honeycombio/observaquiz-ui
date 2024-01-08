import { ActiveLifecycleSpanType } from "../tracing/activeLifecycleSpan";
import { Attributes } from "@opentelemetry/api";

export type ResponseFromAI =
  | {
      status: "success";
      response: AnswersAPIResponse;
    }
  | { status: "failure"; error: string };

type AnswersAPIResponse = {
  score: string;
  better_answer: string;
};

function verifyResponse(response: any): AnswersAPIResponse {
  if (!response) {
    throw new Error("Response is empty");
  }
  if (!response.score) {
    throw "Response is missing score";
  }
  if (typeof response.score != "string") {
    throw "Response score is not a string";
  }
  if (typeof response.better_answer != "string") {
    throw "Response better_answer is not a string";
  }
  if (!response.better_answer) {
    throw "Response is missing better_answer";
  }
  return response as AnswersAPIResponse;
}

export function fetchResponseToAnswer(
  span: ActiveLifecycleSpanType,
  params: {
    questionId: string;
    questionText: string;
    answerContent: string;
  }
): Promise<ResponseFromAI> {
  const { questionId, questionText, answerContent } = params;
  const url = `/api/questions/${questionId}/answer`;
  const body = JSON.stringify({
    questionText,
    answerContent,
  });
  const logAttributes: Attributes = { "app.questionAnswer.request": body, "app.questionAnswer.url": url };
  return span
    .inContext(() =>
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      })
    )
    .then((response) => {
      logAttributes["app.questionAnswer.response.status"] = response.status;
      logAttributes["app.questionAnswer.response.contentType"] = response.headers.get("Content-Type") || "unset";
      if (!response.ok) {
        throw new Error(`Response not ok: ${response.status} ${response.statusText}`);
      }
      return response
        .json()
        .then<ResponseFromAI>((json) => {
          logAttributes["app.questionAnswer.response"] = JSON.stringify(json);
          const response = verifyResponse(json); // throws on failure
          return { status: "success", response };
        })
        .then((response) => {
          span.addLog("Response accepted", logAttributes);
          return response;
        });
    })
    .catch<ResponseFromAI>((error: Error) => {
      span.addError("Error received", error, logAttributes);
      return { status: "failure", error: error.message };
    });
}
