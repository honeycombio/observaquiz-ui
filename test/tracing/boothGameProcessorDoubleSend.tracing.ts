import { Resource } from "@opentelemetry/resources";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { HONEYCOMB_DATASET_NAME } from "../../src/tracing/TracingDestination";
import { TestSpanProcessor } from "./TestSpanProcessor";
import * as BGP from "../../src/tracing/ObservaquizSpanProcessor";

/** instantiate the classes of interest */
const normalProcessor = new TestSpanProcessor();
const copyProcessor = new TestSpanProcessor();

const { learnerOfTeam, boothGameProcessor } = BGP.ConstructThePipeline({
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
const provider = new NodeTracerProvider({
  resource,
});
provider.addSpanProcessor(boothGameProcessor);
provider.register({});

export { learnerOfTeam, normalProcessor, copyProcessor };
