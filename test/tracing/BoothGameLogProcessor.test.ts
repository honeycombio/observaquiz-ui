import {
  ATTRIBUTE_NAME_FOR_APIKEY,
  ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS,
  ATTRIBUTE_NAME_FOR_COPIES,
} from "../../src/tracing/ObservaquizLogProcessor";
import * as Test from "./boothGameLogProcessor.tracing";
import * as logsAPI from "@opentelemetry/api-logs";

/** Run this alone, don't try to combine with other tests.
 * Do not run the tests in parallel, either!
 */

const logger = logsAPI.logs.getLogger("booth game processor double send test");

describe("booth game processor, sending both to our team and the customer team", () => {
  test("To start with, it sends logs to the normal processor.", () => {
    logger.emit({
      body: "fake log",
      attributes: { testAttribute: "jonny von neumann" },
    });

    expect((Test.normalProcessor.onlyEmittedLog().attributes || {})["testAttribute"]).toEqual("jonny von neumann");

    // we expect it to be copied.

    expect((Test.normalProcessor.onlyEmittedLog().attributes || {})[ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS]).toEqual(true);

    // the team arrives!!
    Test.learnerOfTeam.learnCustomerTeam({
      apiKey: "customer team api key",
      environment: { name: "env name", slug: "env-slug" },
      region: "us",
      team: { name: "team-name", slug: "team-slug" },
    });

    console.log("Here is what it has: " + JSON.stringify(Test.copyProcessor.emittedLogs, null, 2));

    // The original span now shows up (as a copy) to the copyProcessor.
    expect((Test.copyProcessor.emittedLogs[0][0].attributes || {})[ATTRIBUTE_NAME_FOR_COPIES]).toEqual(true);
    expect((Test.copyProcessor.emittedLogs[0][0].attributes || {})["testAttribute"]).toEqual("jonny von neumann");

    // Finally, a log goes through after the team has arrived.
    logger.emit({
      body: "fake log 2",
      attributes: { testAttribute: "richard feynman" },
    });

    expect((Test.normalProcessor.emittedLogs[1][0].attributes || {})["testAttribute"]).toEqual("richard feynman");
    expect((Test.normalProcessor.emittedLogs[1][0].attributes || {})[ATTRIBUTE_NAME_FOR_APIKEY]).toEqual(
      "customer team api key"
    );
    expect(Test.copyProcessor.emittedLogs.length).toEqual(2);
  });
});
