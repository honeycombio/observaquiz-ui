// A second attempt at the booth game processor.

import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { TracingTeam } from "./TracingDestination";
import { Context, Attributes } from "@opentelemetry/api";

export function ConstructThePipeline(params: { normalProcessor: SpanProcessor; normalProcessorDescription: string }) {
  const boothGameProcessor = new BoothGameProcessorThingie();
  boothGameProcessor.addProcessor(
    new WrapSpanProcessorWithDescription(params.normalProcessor, params.normalProcessorDescription)
  );
  const learnerOfTeam = new LearnerOfTeam(boothGameProcessor);
  return { learnerOfTeam, boothGameProcessor };
}

class WrapSpanProcessorWithDescription implements SelfDescribingSpanProcessor {
  constructor(private readonly processor: SpanProcessor, private readonly description: string) {}
  describeSelf(): string {
    return this.description;
  }
  onStart(span: Span, parentContext: Context): void {
    this.processor.onStart(span, parentContext);
  }
  onEnd(span: ReadableSpan): void {
    this.processor.onEnd(span);
  }
  async shutdown(): Promise<void> {
    return this.processor.shutdown();
  }
  async forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }
}

type SelfDescribingSpanProcessor = SpanProcessor & {
  /**
   * Output a string that says everything your processor does.
   * @param prefixForLinesAfterTheFirst If your description has multiple lines, put this in front of all the extra ones.
   */
  describeSelf(prefixForLinesAfterTheFirst: string): string;
};

class BoothGameProcessorThingie implements SelfDescribingSpanProcessor {
  private seriesofProcessors: Array<SelfDescribingSpanProcessor> = [];

  public addProcessor(processor: SelfDescribingSpanProcessor) {
    this.seriesofProcessors.unshift(processor); // new ones are first
  }

  describeSelf(prefixForLinesAfterTheFirst: string = ""): string {
    const linePrefix = prefixForLinesAfterTheFirst + " ┣ ";
    const innerPrefix = prefixForLinesAfterTheFirst + " ┃ ";
    const lastLinePrefix = prefixForLinesAfterTheFirst + " ┗ ";
    const isLast = (i: number) => i === this.seriesofProcessors.length - 1;
    var result = "Each of: \n";
    this.seriesofProcessors.forEach((p, i) => {
      result += (isLast(i) ? lastLinePrefix : linePrefix) + p.describeSelf(innerPrefix) + (isLast(i) ? "" : "\n");
    });
    return result;
  }

  onStart(span: Span, parentContext: Context): void {
    this.seriesofProcessors.forEach((processor) => processor.onStart(span, parentContext));
  }
  onEnd(span: ReadableSpan): void {
    this.seriesofProcessors.forEach((processor) => processor.onEnd(span));
  }
  shutdown(): Promise<void> {
    return Promise.all(this.seriesofProcessors.map((processor) => processor.shutdown())).then(() => {});
  }
  forceFlush(): Promise<void> {
    return Promise.all(this.seriesofProcessors.map((processor) => processor.forceFlush())).then(() => {});
  }
}

class LearnerOfTeam {
  constructor(private insertProcessorHere: BoothGameProcessorThingie) {}

  public learnCustomerTeam(team: TracingTeam) {
    this.insertProcessorHere.addProcessor(new ProcessorThatInsertsTeamInfo(team));
  }
}

class ProcessorThatInsertsTeamInfo implements SelfDescribingSpanProcessor {
  private readonly attributes: Attributes;
  constructor(team: TracingTeam) {
    this.attributes = {
      "honeycomb.team": team.team.slug,
      "honeycomb.region": team.region,
      "honeycomb.environment": team.environment.slug,
      "honeycomb.api_key": team.apiKey,
    };
  }
  describeSelf(): string {
    return "I add fields to the span: " + JSON.stringify(this.attributes);
  }
  onStart(span: Span, _parentContext: Context): void {
    span.setAttributes(this.attributes);
  }

  onEnd(_span: ReadableSpan): void {}
  async shutdown(): Promise<void> {}
  async forceFlush(): Promise<void> {}
}
