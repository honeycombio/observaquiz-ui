import { Resource } from "@opentelemetry/resources";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { HONEYCOMB_DATASET_NAME } from "../../src/tracing/TracingDestination";
import { TestSpanProcessor } from "./TestSpanProcessor";
import { BoothGameProcessor } from "../../src/tracing/BoothGameProcessor";

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: HONEYCOMB_DATASET_NAME,
});
// hmm. I'm running in Node. This might not work.
const provider = new WebTracerProvider({
  resource,
});

export const normalProcessor = new TestSpanProcessor();

export var customerProcessor: TestSpanProcessor | undefined = undefined;
export var customerApiKey: string | undefined = undefined;

function spinUpCustomerProcessor(apikey: string) {
  customerApiKey = apikey;
  customerProcessor = new TestSpanProcessor();
  return customerProcessor;
}

export const boothGameProcessor = new BoothGameProcessor(normalProcessor, spinUpCustomerProcessor);

provider.addSpanProcessor(boothGameProcessor);

provider.register({});
