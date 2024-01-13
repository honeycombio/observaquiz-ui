// A second attempt at the booth game processor.

import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { TracingTeam } from "./TracingDestination";
import { Context, Attributes } from "@opentelemetry/api";

const FIELD_CONTAINING_APIKEY = "honeycomb.api_key";

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

function printList(prefix: string, list: Array<string>): string {
  const linePrefix = prefix + " ┣ ";
  const lastLinePrefix = prefix + " ┗ ";
  const isLast = (i: number) => i === list.length - 1;
  return list.map((p, i) => (isLast(i) ? lastLinePrefix : linePrefix) + p).join("\n");
}

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
    const attributes: Attributes = {
      "honeycomb.team": team.team.slug,
      "honeycomb.region": team.region,
      "honeycomb.environment": team.environment.slug,
    };
    attributes[FIELD_CONTAINING_APIKEY] = team.apiKey; // important that this key match other steps
    this.insertProcessorHere.addProcessor(new ProcessorThatInsertsAttributes(attributes));
  }
}

class ProcessorThatInsertsAttributes implements SelfDescribingSpanProcessor {
  constructor(private readonly attributes: Attributes) {}
  describeSelf(prefix: string): string {
    return (
      "I add fields to the span: \n" +
      printList(
        prefix,
        Object.entries(this.attributes).map(([k, v]) => k + "=" + v?.toString())
      )
    );
  }
  onStart(span: Span, _parentContext: Context): void {
    span.setAttributes(this.attributes);
  }

  onEnd(_span: ReadableSpan): void {}
  async shutdown(): Promise<void> {}
  async forceFlush(): Promise<void> {}
}

class FilteringSpanProcessor implements SelfDescribingSpanProcessor {
  constructor(
    private readonly params: {
      filter: (span: ReadableSpan) => boolean;
      filterDescription: string;
      downstream: SelfDescribingSpanProcessor;
    }
  ) {}

  describeSelf(prefixForLinesAfterTheFirst: string): string {
    return (
      "I filter spans, choosing " +
      this.params.filterDescription +
      "\n" +
      prefixForLinesAfterTheFirst +
      " ┗ " +
      this.params.downstream.describeSelf(prefixForLinesAfterTheFirst + " ┃ ")
    );
  }

  onStart(span: Span, parentContext: Context): void {
    if (this.params.filter(span)) {
      this.params.downstream.onStart(span, parentContext);
    }
  }
  onEnd(span: ReadableSpan): void {
    if (this.params.filter(span)) {
      this.params.downstream.onEnd(span);
    }
  }
  shutdown(): Promise<void> {
    return this.params.downstream.shutdown();
  }
  forceFlush(): Promise<void> {
    return this.params.downstream.forceFlush();
  }
}
