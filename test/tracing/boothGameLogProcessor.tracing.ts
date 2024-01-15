import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { HONEYCOMB_DATASET_NAME } from "../../src/tracing/TracingDestination";
import { TestLogProcessor } from "./TestLogProcessor";
import { ConstructLogPipeline } from "../../src/tracing/BoothGameLogProcessor";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import * as logsAPI from "@opentelemetry/api-logs";

/** instantiate the classes of interest */
const normalProcessor = new TestLogProcessor();
const copyProcessor = new TestLogProcessor();

const { learnerOfTeam, boothGameProcessor } = ConstructLogPipeline({
  normalProcessor,
  normalProcessorDescription: "I hold on to the spans so you can verify what was started & ended",
  processorForTeam: (team) => {
    return copyProcessor;
  },
});
console.log("\n\n---initialized---");
console.log(boothGameProcessor.describeSelf());

/** initialize tracing */
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: HONEYCOMB_DATASET_NAME,
});
// hmm. I'm running in Node for tests, so better do this
const provider = new LoggerProvider({
  resource,
});
provider.addLogRecordProcessor(boothGameProcessor);
logsAPI.logs.setGlobalLoggerProvider(provider);


export { learnerOfTeam, normalProcessor, copyProcessor };
