import { ActiveLifecycleSpanType } from "../tracing/activeLifecycleSpan";
import { Attributes } from "@opentelemetry/api";
import { HoneycombTeamContextType } from "./HoneycombTeamContext";
import { fetchFromBackend } from "../tracing/fetchFromBackend";

export type ResponseFromAI =
  | {
      status: "success";
      response: AnswersAPIResponse;
    }
  | { status: "failure"; error: string };

type AnswersAPIResponse = {
  score: string;
  response: number;
};

function verifyResponse(response: any): AnswersAPIResponse {
  if (!response) {
    throw new Error("Response is empty");
  }
  if (response.score === undefined) {
    throw new Error("Response is missing score");
  }
  if (typeof response.score != "number") {
    throw new Error("Response score is not a number");
  }
  if (typeof response.response != "string") {
    throw new Error("Response response is not a string");
  }
  if (response.response === undefined) {
    throw new Error("Response is missing response");
  }
  return response as AnswersAPIResponse;
}

export function fetchResponseToAnswer(
  span: ActiveLifecycleSpanType,
  honeycombTeam: HoneycombTeamContextType,
  params: {
    questionId: string;
    questionText: string;
    answerContent: string;
  }
): Promise<ResponseFromAI> {
  const { questionId, answerContent } = params;
  const url = `/api/questions/${questionId}/answer`;
  const body = JSON.stringify({
    answer: answerContent,
  });
  const logAttributes: Attributes = { "app.questionAnswer.request": body, "app.questionAnswer.url": url };
  return fetchFromBackend(span, honeycombTeam, "POST", url, body)
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
