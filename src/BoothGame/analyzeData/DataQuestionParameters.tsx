import React from "react";
import { BACKEND_DATASET_NAME, ExecutionId, QueryObject } from "../../tracing/TracingDestination";

export type DataQuestionParameters<T> = {
    prefaceText: React.ReactNode
    queryDefinition: QueryObject
    datasetSlug: string
    chooseCorrectAnswer: (data: Array<T>) => T
    formatAnswer: (row: T) => string
};
console.log("Fuck you again")
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
    chooseCorrectAnswer,
    formatAnswer
});

function chooseCorrectAnswer(data: Array<DataFromLongestLLMResponse>): DataFromLongestLLMResponse {
    const maxDuration = Math.max(...data.map((row) => row["MAX(duration_ms)"] as number));
    const maxRow = data.find((row) => row["MAX(duration_ms)"] === maxDuration);
    // handle a tie? This one is extremely unlikely to tie
    return maxRow!;
}

function formatAnswer(row: DataFromLongestLLMResponse): string {
    return row["app.post_answer.question"];
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

