// let's start this as a straight script.
import * as BGP from "../../src/tracing/ObservaquizLogProcessor";
import { TestLogProcessor } from "./TestLogProcessor";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { HONEYCOMB_DATASET_NAME } from "../../src/tracing/TracingDestination";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import * as logsAPI from "@opentelemetry/api-logs";

/** instantiate the classes of interest */
const testProcessor = new TestLogProcessor();
const { learnerOfTeam, boothGameProcessor } = BGP.ConstructLogPipeline({
  normalProcessor: testProcessor,
  normalProcessorDescription: "I hold on to the spans so you can verify what was started & ended",
  processorForTeam: (team) => {
    return new TestLogProcessor();
  },
});
console.log("\n\n---initialized---");
console.log(boothGameProcessor.describeSelf());

/** initialize tracing */
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: HONEYCOMB_DATASET_NAME,
});
// hmm. I'm running in Node. This might not work.
const provider = new LoggerProvider({
  resource,
});
provider.addLogRecordProcessor(boothGameProcessor);
logsAPI.logs.setGlobalLoggerProvider(provider);

/** commence sending stuff */
const logger = provider.getLogger("test");
logger.emit({ body: "test log" });

console.log("\n\n---one log was sent---");
console.log(boothGameProcessor.describeSelf());

learnerOfTeam.learnCustomerTeam({
  apiKey: "yes",
  environment: { name: "env name", slug: "env-slug" },
  region: "us",
  team: { name: "team-name", slug: "team-slug" },
});

console.log("\n\n---team is learned---");
console.log(boothGameProcessor.describeSelf());

logger.emit({ body: "test log 2" });

console.log("\n\n---another log sent---");
console.log(boothGameProcessor.describeSelf());
