import React from "react";

export type DataQuestionParameters = {
    prefaceText: React.ReactNode
};

// Data Question 1
export const WhichResponseTookTheLongestQuestionParameters = {
    prefaceText: <><p>
        Earlier, Observaquiz called out to OpenAI to get a response to your answers. In Honeycomb, we can run a query about how long those
        took.
    </p>
        <p>Please click and look at these results. (hint: scroll down to see the table below the graph. The slowest one is at the top)</p>
    </>
};


export type DataFromLongestLLMResponse = {
    "MAX(duration_ms)": number;
    "app.post_answer.question": string;
};
/**
 * Run this in dataset 'observaquiz-bff'
 */
export function queryForLongestLLMResponse(execution_id: string) {
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


// Data Question 2
export const TheNextQuestionParameters: DataQuestionParameters = {
    prefaceText: <>
        <p>
            This trace represents one call to our Observaquiz backend.
            Each row in the trace is called a span; it represents some unit of work that was part of
            fulfilling the request. Each span has a name, and a portion of the timeline representing when it occurred
            and how long it took.
        </p>
        <p>
            How many of spans in this trace are called `HTTP POST`?
        </p>
    </>
}