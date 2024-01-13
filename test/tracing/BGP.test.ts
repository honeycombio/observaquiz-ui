// let's start this as a straight script.
import * as BGP from "../../src/tracing/BGP";
import { TestSpanProcessor } from "./TestSpanProcessor";

const testProcessor = new TestSpanProcessor();

const { learnerOfTeam, boothGameProcessor } = BGP.ConstructThePipeline({
  normalProcessor: testProcessor,
  normalProcessorDescription: "I hold the spans so you can test against them",
});

console.log(boothGameProcessor.describeSelf(""));
