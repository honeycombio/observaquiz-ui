// a tiny express app
import express from "express";
import proxy from "express-http-proxy";

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
  console.log("pwd ", __dirname);
  res.sendFile("dist/local-questions.json", { root: __dirname + "/../.." });
});

// Now for the fake backend
app.post("/api/questions/:questionId/answer", (req, res) => {
  res.send({
    text: `Grade: C

  Observability is the practice of gaining insights and understanding about a system's behavior and performance. It involves the ability to measure and monitor various aspects of the system to identify issues, troubleshoot problems, and make data-driven decisions for improvement. While your answer touches on the concept of "seeing stuff going on," it lacks the depth and comprehensive understanding of observability.`,
  });
});

app.listen(3000, () => {
  console.log("http://localhost:3000/");
});
