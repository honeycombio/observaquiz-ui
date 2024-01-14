import {
  ATTRIBUTE_NAME_FOR_APIKEY,
  ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS,
  ATTRIBUTE_NAME_FOR_COPIES,
} from "../../src/tracing/BGP";
import * as Test from "./boothGameProcessorDoubleSend.tracing";
import { trace } from "@opentelemetry/api";

/** Run this alone, don't try to combine with other tests.
 * Do not run the tests in parallel, either!
 */

const tracer = trace.getTracer("booth game processor double send test");

describe("booth game processor, sending both to our team and the customer team", () => {
  test("To start with, it sends spans to the normal processor.", () => {
    const spanThatEndsBeforeTeamArrives = tracer.startSpan("fake span", {
      attributes: { testAttribute: "jonny von neumann" },
    });
    expect(Test.normalProcessor.onlyStartedSpan().attributes["testAttribute"]).toEqual("jonny von neumann");

    spanThatEndsBeforeTeamArrives.end();
    expect(Test.normalProcessor.endedSpans.length).toEqual(1);

    // we expect it to be copied.
    expect(Test.normalProcessor.onlyEndedSpan().attributes[ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS]).toEqual(true);

    // This span that is open when the team arrives, it's going to show up in both places.

    const spanThatIsOpenWhenTeamArrives = tracer.startSpan("fake span 2", {
      attributes: { testAttribute: "enrico fermi" },
    });
    expect(Test.normalProcessor.startedSpans[1][0].attributes["testAttribute"]).toEqual("enrico fermi");

    // the team arrives!!
    Test.learnerOfTeam.learnCustomerTeam({
      apiKey: "customer team api key",
      environment: { name: "env name", slug: "env-slug" },
      region: "us",
      team: { name: "team-name", slug: "team-slug" },
    });

    // The original span now shows up (as a copy) to the copyProcessor.
    expect(Test.copyProcessor.startedSpans[0][0].attributes[ATTRIBUTE_NAME_FOR_COPIES]).toEqual(true);
    expect(Test.copyProcessor.startedSpans[0][0].attributes["testAttribute"]).toEqual("jonny von neumann");

    // ok, end the open span. It gets ended in both places.
    spanThatIsOpenWhenTeamArrives.end();
    expect(Test.normalProcessor.endedSpans.length).toEqual(2);
    expect(Test.copyProcessor.endedSpans.length).toEqual(2);

    // Finally, a third span goes through after the team has arrived. It lands only at the normal processor.
    const spanThatStartsAfterTeamArrives = tracer.startSpan("fake span 3", {
      attributes: { testAttribute: "richard feynman" }, // thank you copilot. Given the previous two Manhattan Project scientists, it says: I was going to go with "robert oppenheimer"
    });

    expect(Test.normalProcessor.startedSpans[2][0].attributes["testAttribute"]).toEqual("richard feynman");
    expect(Test.normalProcessor.startedSpans[2][0].attributes[ATTRIBUTE_NAME_FOR_APIKEY]).toEqual(
      "customer team api key"
    );
    expect(Test.copyProcessor.startedSpans.length).toEqual(2);

    spanThatStartsAfterTeamArrives.end();

    expect(Test.normalProcessor.endedSpans.length).toEqual(3);
    expect(Test.copyProcessor.endedSpans.length).toEqual(2);
  });
});
