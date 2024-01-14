import { ConstructThePipeline } from "../../src/tracing/BGP";
import { TestSpanProcessor, createTestSpan } from "./TestSpanProcessor";
import { Context } from "@opentelemetry/api";
import { HONEYCOMB_DATASET_NAME, TracingTeam } from "../../src/tracing/TracingDestination";

/**
 * This part tests the normal stuff that BoothGameProcessor does, adding some fields
 * and sending it on to the normal processor, which will send it to our team.
 *
 * This stuff can be unit tested with a new BoothGameProcessor.
 * The weirder stuff goes in a different file.
 */

test("something", () => {
  expect(1).toBe(1);
});

const customerTeam: TracingTeam = {
  region: "us",
  team: { name: "whatever name", slug: "modernity" },
  environment: { slug: "quiz-local", name: "some name" },
  apiKey: "11222",
};

describe("booth game processor sending to our team", () => {
  test("It passes every span through to the normal processor", () => {
    const normalProcessor = new TestSpanProcessor();
    const teamProcessor = new TestSpanProcessor();
    const { boothGameProcessor } = ConstructThePipeline({
      normalProcessor,
      normalProcessorDescription: "Testy McTesterson",
      processorForTeam: () => teamProcessor,
    });

    const testSpan = createTestSpan("fake span", { testAttribute: "does it care" });
    const fakeParentContext = { stuff: "things" } as unknown as Context;
    // What does it even mean to send a span to a processor? Expect all methods to pass through.
    boothGameProcessor.onStart(testSpan, fakeParentContext);
    boothGameProcessor.onEnd(testSpan);

    // it gets the same object, so they're the same even when modified by BoothGameProcessor
    expect(normalProcessor.startedSpans).toEqual([[testSpan, fakeParentContext]]);
    expect(normalProcessor.endedSpans).toEqual([testSpan]);

    expect(normalProcessor.wasShutdown).toBe(false);
    boothGameProcessor.shutdown();
    expect(normalProcessor.wasShutdown).toBe(true);

    expect(normalProcessor.wasForceFlushed).toBe(false);
    boothGameProcessor.forceFlush();
    expect(normalProcessor.wasForceFlushed).toBe(true);
  });

  test("When it has the customer team attributes, it sets them on every span to the normal processor", () => {
    const normalProcessor = new TestSpanProcessor();
    const teamProcessor = new TestSpanProcessor();
    const { boothGameProcessor, learnerOfTeam } = ConstructThePipeline({
      normalProcessor,
      normalProcessorDescription: "Testy McTesterson",
      processorForTeam: () => teamProcessor,
    });

    learnerOfTeam.learnCustomerTeam(customerTeam);

    const testSpan = createTestSpan("fake span", { testAttribute: "does it care" });
    const fakeParentContext = { stuff: "things" } as unknown as Context;

    boothGameProcessor.onStart(testSpan, fakeParentContext);

    expect(normalProcessor.onlyStartedSpan().attributes["honeycomb.region"]).toEqual("us");
    expect(normalProcessor.onlyStartedSpan().attributes["honeycomb.team.slug"]).toEqual("modernity");
    expect(normalProcessor.onlyStartedSpan().attributes["honeycomb.env.slug"]).toEqual("quiz-local");
    expect(normalProcessor.onlyStartedSpan().attributes["honeycomb.dataset"]).toEqual(HONEYCOMB_DATASET_NAME);
  });
});

// TODO: handle resetting the entire pipeline.
// I want to do that by replacing the entire thing... maybe a SwitcherProcessor except it needs to free the old one.
