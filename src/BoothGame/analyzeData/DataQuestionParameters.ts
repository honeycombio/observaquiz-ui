
export type DataQuestionParameters = {}


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
