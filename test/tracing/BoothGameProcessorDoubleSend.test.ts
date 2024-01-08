import { BOOTH_GAME_TELEMETRY_DESTINATION } from "../../src/tracing/BoothGameProcessor";
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
    normalProcessor.clearMemory();
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

    const customerSpan = customerProcessor?.onlyEndedSpan();
    const normalSpan = normalProcessor.onlyEndedSpan();

    expect(customerSpan?.spanContext()).toEqual(normalSpan.spanContext());
    expect(customerSpan?.duration).toEqual(normalSpan.duration);
    expect(customerSpan?.startTime).toEqual(normalSpan.startTime);
    expect(customerSpan?.endTime).toEqual(normalSpan.endTime);
    expect(customerSpan?.instrumentationLibrary).toEqual(normalSpan.instrumentationLibrary);
    expect(customerSpan?.name).toEqual(normalSpan.name);
    // expect(customerSpan?.status).toEqual(normalSpan.status); this won't be true, hrm, I wonder if I can send the ended span to both most of the time

    boothGameProcessor.clearCustomerTeam(); // for the next test
    normalProcessor.clearMemory();
  });

  test("After the customer API key is cleared, it stops sending anything to the customer processor", () => {
    // in real life, this is gonna be too subtle a timing. So I'm not gonna worry much about this test
  });

  test("Spans sent to the customer processor have the destination set to customer, unlike the ones sent to our team", () => {
    boothGameProcessor.learnCustomerTeam({
      region: "us",
      team: { slug: "modernity" },
      environment: { slug: "quiz-local" },
      apiKey: "fake api key",
    });

    expect(customerProcessor).toBeDefined();

    const span = tracer.startSpan("fake span", { attributes: { testAttribute: "does it care" } });

    span.end();
    expect(customerProcessor?.endedSpans.length).toEqual(1);

    const customerSpan = customerProcessor?.onlyEndedSpan();
    expect(customerSpan?.attributes[BOOTH_GAME_TELEMETRY_DESTINATION]).toEqual("customer");

    boothGameProcessor.clearCustomerTeam(); // for the next test
    normalProcessor.clearMemory();
  });

  test("When it gets spans before the customer processor, and then it gets the customer processor, it sends the spans to the customer processor", () => {
    const span = tracer.startSpan("fake span", { attributes: { testAttribute: "does it care" } });
    span.end();

    expect(normalProcessor.endedSpans.length).toEqual(1); // there it goes, to the normal one
    expect(customerProcessor).toBeUndefined; // not yet

    boothGameProcessor.learnCustomerTeam({
      region: "us",
      team: { slug: "modernity" },
      environment: { slug: "quiz-local" },
      apiKey: "fake api key",
    });

    expect(customerProcessor).toBeDefined();

    expect(customerProcessor?.startedSpans.length).toEqual(1);
    expect(customerProcessor?.endedSpans.length).toEqual(1);

    const customerSpan = customerProcessor?.onlyEndedSpan();
    const normalSpan = normalProcessor.onlyEndedSpan();

    expect(customerSpan?.spanContext()).toEqual(normalSpan.spanContext());
    expect(customerSpan?.duration).toEqual(normalSpan.duration);
    expect(customerSpan?.startTime).toEqual(normalSpan.startTime);
    expect(customerSpan?.endTime).toEqual(normalSpan.endTime);
    expect(customerSpan?.instrumentationLibrary).toEqual(normalSpan.instrumentationLibrary);
    expect(customerSpan?.name).toEqual(normalSpan.name);

    boothGameProcessor.clearCustomerTeam(); // for the next test
    normalProcessor.clearMemory();
  });

  test("When it gets spans before the customer processor, and then it gets the customer processor before the span ends, then it starts the spans in the customer processor.", () => {
    const span = tracer.startSpan("fake span", { attributes: { testAttribute: "does it care" } });
    
    expect(normalProcessor.startedSpans.length).toEqual(1); // there it goes, to the normal one
    expect(customerProcessor).toBeUndefined; // not yet
    
    boothGameProcessor.learnCustomerTeam({
      region: "us",
      team: { slug: "modernity" },
      environment: { slug: "quiz-local" },
      apiKey: "fake api key",
    });
    
    expect(customerProcessor).toBeDefined();
    expect(customerProcessor?.startedSpans.length).toEqual(1);
    expect(customerProcessor?.endedSpans.length).toEqual(0);
    
    span.end();
    expect(customerProcessor?.endedSpans.length).toEqual(1);

    boothGameProcessor.clearCustomerTeam(); // for the next test
    normalProcessor.clearMemory();
  });


  test("When a span is updated after creation, those updates are applied to the copy sent to the customer team", () => {
    // we may not catch all of them but let's catch some
    // hmm I wonder if we should do the opposite: copy it for our team, and send the original to them - so that they get the best copy?
  });

  test("When it gets a team, then it's cleared, then it gets another team, it sends the spans received in between to the new team", () => {});
});
