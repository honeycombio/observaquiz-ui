// let's start this as a straight script.
import * as BGP from "../../src/tracing/BGP";
import { TestSpanProcessor } from "./TestSpanProcessor";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { HONEYCOMB_DATASET_NAME } from "../../src/tracing/TracingDestination";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

/** instantiate the classes of interest */
const testProcessor = new TestSpanProcessor();
const { learnerOfTeam, boothGameProcessor } = BGP.ConstructThePipeline({
  normalProcessor: testProcessor,
  normalProcessorDescription: "I hold on to the spans so you can verify what was started & ended",
});
console.log("\n\n---initialized---");
console.log(boothGameProcessor.describeSelf(""));

/** initialize tracing */
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: HONEYCOMB_DATASET_NAME,
});
// hmm. I'm running in Node. This might not work.
const provider = new NodeTracerProvider({
  resource,
});
provider.addSpanProcessor(boothGameProcessor);
provider.register({});

/** commence sending stuff */
const tracer = provider.getTracer("test");
const span = tracer.startSpan("test span");

console.log("\n\n---one span was sent---");
console.log(boothGameProcessor.describeSelf(""));

span.end();

console.log("\n\n---one span was ended---");
console.log(boothGameProcessor.describeSelf(""));

learnerOfTeam.learnCustomerTeam({
  apiKey: "yes",
  environment: { name: "env name", slug: "env-slug" },
  region: "us",
  team: { name: "team-name", slug: "team-slug" },
});

console.log("\n\n---team is learned---");
console.log(boothGameProcessor.describeSelf(""));
