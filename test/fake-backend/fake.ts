import "./fakeTracing";
// a tiny express app
import express, { Response } from "express";
import proxy from "express-http-proxy";
import { trace } from "@opentelemetry/api";
import localQuestions from "./local-questions.json";

console.log("Are we seeing changes? c")

const app = express();

/* Send to the collector that which is the collector's */
app.use(
  "/v1",
  proxy("http://localhost:4318", {
    proxyReqPathResolver: function (req) {
      return "/v1" + req.url;
    },
  })
);
app.use(express.json());

/* Serve our static files */
app.use(express.static("../../dist"));

app.get("/api/questions", (req, res) => {
  const span = trace.getActiveSpan();
  addTracechildHeader(res);
  res.send(localQuestions);
});

// Now for the fake backend
app.post("/api/questions/:questionId/answer", (req, res) => {
  const randomElement = possibleResponses[Math.floor(Math.random() * possibleResponses.length)];
  addTracechildHeader(res);
  res.send(randomElement);
});

function addTracechildHeader(res: Response) {
  const currentSpanContext = trace.getActiveSpan()!.spanContext();
  const traceparent = `00-${currentSpanContext.traceId}-${currentSpanContext.spanId}-01`;
  res.setHeader("x-tracechild", traceparent);
}

app.get("/fake-hny-auth", (req, res) => {
  // TODO: could this not return 304 Not Modified, please. how to turn that off??
  const fakeAuthSuccess = {
    team: { slug: "teamity-team", name: "Teamity Team" },
    environment: { slug: "envity-env", name: "Savannah" },
    api_key_access: {
      events: true,
      markers: true,
      createDatasets: true,
    },
  };
  res.status(200);
  res.send(fakeAuthSuccess);
});

app.post("/api/queryData", (req, res) => {
  const body = req.body;
  const query_data = QUERY_DATA_BY_NAME[body.query_name];
  if (!query_data) {
    res.status(422).send({
      "error": "I don't have cached results for that query.", "known queries": Object.keys(QUERY_DATA_BY_NAME),
      "received": body.query_name
    })
    return;
  }
  res.send({ query_id: "queryfoo", result_id: "fooresult", error: "", query_data });
});

const QUERY_DATA_BY_NAME: Record<string, object[]> = {
  "Slowest response from LLM": [
    {
      "app.post_answer.question": "What is your favorite color?",
      "MAX(duration_ms)": 1005,
    },
    {
      "app.post_answer.question": "Why is this so slow?",
      "MAX(duration_ms)": 3056,
    },
    {
      "app.post_answer.question": "How much wood would a woodchuck chuck?",
      "MAX(duration_ms)": 2087,
    },
  ],
  "Trace with the most spans": [
    {
      "trace.trace_id": "139085234985134098e7513a",
      "COUNT": 6,
    },
    {
      "trace.trace_id": "aaaaa5234985134098e7513a",
      "COUNT": 3,
    },
    {
      "trace.trace_id": "bbbbb5234985134098e7513a",
      "COUNT": 1,
    }
  ],
  "span count by name": [
    {
      "COUNT": 2,
      "name": "HTTP POST"
    },
    {
      "COUNT": 2,
      "name": "HTTP GET"
    },
    {
      "COUNT": 1,
      "name": "Poll for Honeycomb Query Result"
    },
    {
      "COUNT": 1,
      "name": "POST /api/queryData"
    },
    {
      "COUNT": 1,
      "name": "Start Honeycomb Query Run"
    },
    {
      "COUNT": 1,
      "name": "Create Honeycomb Query"
    }
  ]
}

app.listen(4000, () => {
  console.log("http://localhost:4000/");
});

const possibleResponses = [
  {
    score: 90,
    response: "You really know what I'm talking about.",
  },
  {
    score: 20,
    response: "Oh come on, at least write about seeing inside your system.",
  },
  {
    score: 80,
    response: "something like that",
  },
  {
    score: 75,
    response: "I marked off 0.6 points because you didn't say 'o11y' which is the cool way to say it.",
  },
  {
    score: 20,
    response: "I don't know, I'm just a computer.",
  },
  {
    score: 76,
    response:
      "Observability is so much more than that. It is the ability to see inside your system, because it tells you.",
  },
  {
    score: 85,
    response:
      "Once you have observability, you can see inside your system. Your mind will be blown and your body expanded, your thoughts will touch the stars and the stars will gleam with your astonishing insights. The universe will never be the same again.",
  },
  {
    score: 100,
    response:
      "Ding ding ding! You got it! Observability is the ability to see inside your system. It's the ability to ask questions about what's happening inside your system and get answers. It's the ability to understand what's happening inside your system. It's the ability to see inside your system.",
  },
];
