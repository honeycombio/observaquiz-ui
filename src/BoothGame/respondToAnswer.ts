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

function verifyResponse(
  response: any
): { status: "rejected"; reasons: string[] } | { status: "success"; response: AnswersAPIResponse } {
  const rejections = [];
  if (!response) {
    rejections.push("Response is empty");
  } else {
    if (response.score === undefined) {
      rejections.push("Response is missing score");
    }
    if (typeof response.score != "number") {
      rejections.push("Response score is not a number");
    }
    if (typeof response.response != "string") {
      rejections.push("Response response is not a string");
    }
    if (response.response === undefined) {
      rejections.push("Response is missing response");
    }
  }
  if (rejections.length > 0) {
    return { status: "rejected", reasons: rejections };
  } else {
    return { status: "success", response: response as AnswersAPIResponse };
  }
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
  return fetchFromBackend({
    span,
    honeycombTeam,
    method: "POST",
    url,
    body,
    attributesFromJson: (json: any) => {
      return {
        "app.question.score": json.score,
        "app.question.response": json.response,
      };
    },
  })
    .then<ResponseFromAI>((json) => {
      const result = verifyResponse(json);
      if (result.status === "rejected") {
        return { status: "failure", error: result.reasons.join(", ") };
      }
      return result;
    })
    .catch<ResponseFromAI>((error: Error) => {
      return { status: "failure", error: error.message };
    });
}
