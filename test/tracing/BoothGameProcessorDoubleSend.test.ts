import {
  boothGameProcessor,
  normalProcessor,
  customerProcessor,
  customerApiKey,
} from "./boothGameProcessorDoubleSend.tracing";
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("booth game processor double send test");

describe("booth game processor sending to the customer's team", () => {
  test("Even in this configuration, it sends a created span to the normal processor", () => {
    const span = tracer.startSpan("fake span", { attributes: { testAttribute: "does it care" } });

    expect(normalProcessor.onlyStartedSpan().attributes["testAttribute"]).toEqual("does it care");

    span.end();

    expect(normalProcessor.endedSpans.length).toEqual(1);
  });

  test("When it learns about the customer API key, it creates a customer processor", () => {
    boothGameProcessor.learnCustomerTeam({
      region: "us",
      team: { slug: "modernity" },
      environment: { slug: "quiz-local" },
      apiKey: "fake api key",
    });

    expect(customerProcessor).toBeDefined();
    expect(customerApiKey).toEqual("fake api key");

    boothGameProcessor.clearCustomerTeam(); // for the next test
  });

  test("When it has a customer processor, every span goes there WITH the team attributes set", () => {
    boothGameProcessor.learnCustomerTeam({
      region: "us",
      team: { slug: "modernity" },
      environment: { slug: "quiz-local" },
      apiKey: "fake api key",
    });

    expect(customerProcessor).toBeDefined();

    const span = tracer.startSpan("fake span", { attributes: { testAttribute: "does it care" } });
    expect(customerProcessor?.onlyStartedSpan().attributes["testAttribute"]).toEqual("does it care");
    expect(customerProcessor?.onlyStartedSpan().attributes["honeycomb.region"]).toEqual("us");

    span.end();
    expect(customerProcessor?.endedSpans.length).toEqual(1);

    boothGameProcessor.clearCustomerTeam(); // for the next test
  });

  test("After the customer API key is cleared, it stops sending anything to the customer processor", () => {});

  test("Spans sent to the customer processor have the destination set to customer, unlike the ones sent to our team", () => {});

  test("When it gets spans before the customer processor, and then it gets the customer processor, it sends the spans to the customer processor", () => {});

  test("When it gets a team, then it's cleared, then it gets another team, it sends the spans received in between to the new team", () => {});
});
