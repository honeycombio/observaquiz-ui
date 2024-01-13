// let's start this as a straight script.
import * as BGP from "../../src/tracing/BGP";
import { TestSpanProcessor } from "./TestSpanProcessor";

const testProcessor = new TestSpanProcessor();

const { learnerOfTeam, boothGameProcessor } = BGP.ConstructThePipeline({
  normalProcessor: testProcessor,
  normalProcessorDescription: "I hold on to the spans so you can verify what was started & ended",
});

console.log(boothGameProcessor.describeSelf(""));

learnerOfTeam.learnCustomerTeam({
  apiKey: "yes",
  environment: { name: "env name", slug: "env-slug" },
  region: "us",
  team: { name: "team-name", slug: "team-slug" },
});

console.log("After the team is learned:");
console.log(boothGameProcessor.describeSelf(""));
