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
app.use("/api", proxy("http://localhost:3000", {
  proxyReqPathResolver: function (req) {
    return "/api" + req.url;
  },
}));

app.use("/", proxy("http://localhost:1234"));
