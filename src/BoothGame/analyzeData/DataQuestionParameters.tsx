import React from "react";
import { BACKEND_DATASET_NAME, ExecutionId, QueryObject } from "../../tracing/TracingDestination";
import { WhatMultipleChoiceNeedsToKnow } from "./MultipleChoice";

export type DataQuestionParameters<T> = {
    prefaceText: React.ReactNode
    queryDefinition: QueryObject
    datasetSlug: string
    interpretData: (data: T[]) => WhatMultipleChoiceNeedsToKnow;
};
// Data Question 1
export const whichResponseTookTheLongestQuestionParameters = (execution_id: ExecutionId) => ({
    prefaceText: <>
        <p>
            Earlier, Observaquiz called out to OpenAI to get a response to your answers. In Honeycomb, we can run a query about how long those took.
        </p>
        <p>
            Please click and look at these results. (hint: scroll down to see the table below the graph. The slowest one is at the top)
        </p>
    </>
    ,
    queryDefinition: queryForLongestLLMResponse(execution_id),
    datasetSlug: BACKEND_DATASET_NAME,
    interpretData
});

function interpretData(data: DataFromLongestLLMResponse[]): WhatMultipleChoiceNeedsToKnow {
    const correctAnswer = chooseCorrectAnswer(data);
    return {
        answers: shuffle(data.map((d, i) => ({ key: "answer " + i, text: formatAnswer(d) }))),
        scoreAnswer: (answer) => {
            const theirAnswerText = answer.text;
            const correctAnswerText = formatAnswer(correctAnswer);
            const theirAnswerDuration = data.find(d => d["app.post_answer.question"] === theirAnswerText)!["MAX(duration_ms)"];
            const correctAnswerDuration = correctAnswer["MAX(duration_ms)"];
            if (correctAnswerText === theirAnswerText) {
                return { points: 300, remark: "Right!! 300 points." }
            } else {
                return { points: 0, remark: `I disagree. "${theirAnswerText}" took ${theirAnswerDuration}ms to answer, while "${correctAnswerText}" took ${correctAnswerDuration}ms.` }
            }
        }
    }
}

function chooseCorrectAnswer(data: Array<DataFromLongestLLMResponse>): DataFromLongestLLMResponse {
    const maxDuration = Math.max(...data.map((row) => row["MAX(duration_ms)"] as number));
    const maxRow = data.find((row) => row["MAX(duration_ms)"] === maxDuration);
    // handle a tie? This one is extremely unlikely to tie
    return maxRow!;
}

function formatAnswer(row: DataFromLongestLLMResponse): string {
    return row["app.post_answer.question"];
}

function shuffle<T>(unshuffled: T[]) {
    return unshuffled
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
}

export type DataFromLongestLLMResponse = {
    "MAX(duration_ms)": number;
    "app.post_answer.question": string;
};
/**
 * Run this in dataset 'observaquiz-bff'
 */
function queryForLongestLLMResponse(execution_id: ExecutionId) {
    return {
        time_range: 600,
        granularity: 0,
        breakdowns: ["app.post_answer.question", "app.llm.input", "app.llm.output"],
        calculations: [
            {
                op: "MAX",
                column: "duration_ms",
            },
        ],
        filters: [
            {
                column: "name",
                op: "=",
                value: "Ask LLM for Response",
            },
            {
                column: "app.observaquiz.execution_id",
                op: "=",
                value: execution_id,
            },
        ],
        orders: [
            {
                column: "duration_ms",
                op: "MAX",
                order: "descending",
            },
        ],
        havings: [],
        limit: 1000,
    };
}

