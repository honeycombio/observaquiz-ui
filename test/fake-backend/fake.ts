import "./fakeTracing";
// a tiny express app
import express, { Response } from "express";
import proxy from "express-http-proxy";
import { trace } from "@opentelemetry/api";
import localQuestions from "./local-questions.json";

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

app.post("fake-hny-auth", (req, res) => {
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
  var query_data: unknown = [{ name: "spannity span", count: 43 }];
  if (body.query_name === "Slowest response from LLM") {
    query_data = [
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
    ];
  }
  res.send({ query_id: "queryfoo", result_id: "fooresult", error: "", query_data });
});

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
