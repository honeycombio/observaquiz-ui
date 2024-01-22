// a tiny express app
import express from "express";
import proxy from "express-http-proxy";

const app = express();

console.log("everything is terrible")

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
  console.log("pwd ", __dirname);
  res.sendFile("dist/local-questions.json", { root: __dirname + "/../.." });
});

// Now for the fake backend
app.post("/api/questions/:questionId/answer", (req, res) => {
  const randomElement = possibleResponses[Math.floor(Math.random() * possibleResponses.length)];
  // TODO: make actual traces. Send the actual thing
  console.log("Setting garbage tracechild header");
  res.setHeader("x-tracechild", "00-12341324-fafaffaf-01")
  res.send(randomElement);
});

app.listen(4000, () => {
  console.log("http://localhost:4000/");
});

const possibleResponses = [
  {
    score: "A",
    better_answer: "You really know what I'm talking about.",
  },
  {
    score: "20",
    better_answer: "Oh come on, at least write about seeing inside your system.",
  },
  {
    score: "80",
    better_answer: "something like that",
  },
  {
    score: "75.4",
    better_answer: "I marked off 0.6 points because you didn't say 'o11y' which is the cool way to say it.",
  },
  {
    score: "20",
    better_answer: "I don't know, I'm just a computer.",
  },
  {
    score: "C",
    better_answer:
      "Observability is so much more than that. It is the ability to see inside your system, because it tells you.",
  },
  {
    score: "B",
    better_answer:
      "Once you have observability, you can see inside your system. Your mind will be blown and your body expanded, your thoughts will touch the stars and the stars will gleam with your astonishing insights. The universe will never be the same again.",
  },
  {
    score: "100",
    better_answer:
      "Ding ding ding! You got it! Observability is the ability to see inside your system. It's the ability to ask questions about what's happening inside your system and get answers. It's the ability to understand what's happening inside your system. It's the ability to see inside your system.",
  },
];
