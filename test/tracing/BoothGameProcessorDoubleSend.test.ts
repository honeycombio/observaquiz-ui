import { NormalProcessor } from "./boothGameProcessorDoubleSend.tracing";
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("booth game processor double send test");

describe("booth game processor sending to the customer's team", () => {
  test("Even in this configuration, it sends a created span to the normal processor", () => {
    const span = tracer.startSpan("fake span", { attributes: { testAttribute: "does it care" } });

    expect(NormalProcessor.onlyStartedSpan().attributes["testAttribute"]).toEqual("does it care");

    span.end();

    expect(NormalProcessor.endedSpans.length).toEqual(1);
  });
  test("When it learns about the customer API key, it creates a customer processor", () => {});

  test("After the customer API key is cleared, it stops sending anything to the customer processor", () => {});

  test("When it has a customer processor, every span goes there WITH the team attributes set", () => {});

  test("Spans sent to the customer processor have the destination set to customer, unlike the ones sent to our team", () => {});

  test("When it gets spans before the customer processor, and then it gets the customer processor, it sends the spans to the customer processor", () => {});

  test("When it gets a team, then it's cleared, then it gets another team, it sends the spans received in between to the new team", () => {});
});
