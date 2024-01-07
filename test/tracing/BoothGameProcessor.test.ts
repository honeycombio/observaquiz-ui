import { Span } from "@opentelemetry/sdk-trace-base";
import { BoothGameProcessor } from "../../src/tracing/BoothGameProcessor";
import { TestSpanProcessor, createTestSpan } from "./TestSpanProcessor";
import { Context } from "@opentelemetry/api";

test("something", () => {
  expect(1).toBe(1);
});

describe("booth game processor sending to our team", () => {
  test("It passes every span through to the normal processor", () => {
    const normalProcessor = new TestSpanProcessor();
    const boothGameProcessor = new BoothGameProcessor(normalProcessor);

    const testSpan = createTestSpan("fake span", { testAttribute: "does it care" });
    const fakeParentContext = { stuff: "things" } as unknown as Context;
    // What does it even mean to send a span to a processor? Expect all methods to pass through.
    boothGameProcessor.onStart(testSpan, fakeParentContext);
    boothGameProcessor.onEnd(testSpan);

    expect(normalProcessor.startedSpans).toEqual([[testSpan, fakeParentContext]]);
    expect(normalProcessor.endedSpans).toEqual([testSpan]);

    expect(normalProcessor.wasShutdown).toBe(false);
    boothGameProcessor.shutdown();
    expect(normalProcessor.wasShutdown).toBe(true);

    expect(normalProcessor.wasForceFlushed).toBe(false);
    boothGameProcessor.forceFlush();
    expect(normalProcessor.wasForceFlushed).toBe(true);
  });

  // note: I could make this happen in the ComponentLifecycleTraces, might be useful. But hey, we can put it here whatevs.
  test("When it has the customer team attributes, it sets them on every span to the normal processor", () => {});

  test("To the normal processor, it tells it this is our span for our team", () => {});
});

describe("Setting the customer team on the booth game processor", () => {
  test("You can set the customer team exactly once", () => {});
  test("You can clear the customer team and then set it again", () => {});
});

describe("booth game processor sending to the customer's team", () => {
  test("When it learns about the customer API key, it creates a customer processor", () => {});

  test("After the customer API key is cleared, it stops sending anything to the customer processor", () => {});

  test("When it has a customer processor, every span goes there WITH the team attributes set", () => {});

  test("When it gets spans before the customer processor, and then it gets the customer processor, it sends the spans to the customer processor", () => {});

  test("When it gets a team, then it's cleared, then it gets another team, it sends the spans received in between to the new team", () => {});
});
