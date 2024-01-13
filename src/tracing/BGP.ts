// A second attempt at the booth game processor.

import { ReadableSpan, Span as TraceBaseSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { TracingTeam } from "./TracingDestination";
import { Context, Attributes } from "@opentelemetry/api";
import { trace, Span } from "@opentelemetry/api";

const FIELD_CONTAINING_APIKEY = "honeycomb.api_key";

const ATTRIBUTE_NAME_FOR_COPIES = "boothgame.late_span";

export function ConstructThePipeline(params: { normalProcessor: SpanProcessor; normalProcessorDescription: string }) {
  const normalProcessorWithDescription = new WrapSpanProcessorWithDescription(
    params.normalProcessor,
    params.normalProcessorDescription
  );

  const boothGameProcessor = new BoothGameProcessorThingie();
  boothGameProcessor.addProcessor(
    new FilteringSpanProcessor({
      filter: (span) => !span.attributes[ATTRIBUTE_NAME_FOR_COPIES],
      filterDescription: "spans that aren't copies",
      downstream: normalProcessorWithDescription,
    })
  );
  const learnerOfTeam = new LearnerOfTeam(boothGameProcessor);
  boothGameProcessor.addProcessor(
    new FilteringSpanProcessor({
      downstream: new SpanCopier(),
      filter: (span) => span.attributes[FIELD_CONTAINING_APIKEY] === undefined,
      filterDescription: "spans without an api key",
    })
  );
  return { learnerOfTeam, boothGameProcessor };
}

class WrapSpanProcessorWithDescription implements SelfDescribingSpanProcessor {
  constructor(private readonly processor: SpanProcessor, private readonly description: string) {}
  describeSelf(): string {
    return this.description;
  }
  onStart(span: TraceBaseSpan, parentContext: Context): void {
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
    // a nested list
    const linePrefix = prefixForLinesAfterTheFirst + " ┣ ";
    const innerPrefix = prefixForLinesAfterTheFirst + " ┃ ";
    const innerPrefixForTheLastOne = prefixForLinesAfterTheFirst + "   ";
    const lastLinePrefix = prefixForLinesAfterTheFirst + " ┗ ";
    const isLast = (i: number) => i === this.seriesofProcessors.length - 1;
    var result = "Each of: \n";
    this.seriesofProcessors.forEach((p, i) => {
      if (isLast(i)) {
        result += lastLinePrefix + p.describeSelf(innerPrefixForTheLastOne);
      } else {
        result += linePrefix + p.describeSelf(innerPrefix) + "\n";
      }
    });
    return result;
  }

  onStart(span: TraceBaseSpan, parentContext: Context): void {
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
  onStart(span: TraceBaseSpan, _parentContext: Context): void {
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
      this.params.downstream.describeSelf(prefixForLinesAfterTheFirst + "   ")
    );
  }

  onStart(span: TraceBaseSpan, parentContext: Context): void {
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

class SpanCopier implements SelfDescribingSpanProcessor {
  describeSelf(prefixForLinesAfterTheFirst: string): string {
    return (
      "I copy spans, evilly\n" +
      prefixForLinesAfterTheFirst +
      " ┣ " +
      `So far I have copied ${this.copyCount} spans\n` +
      prefixForLinesAfterTheFirst +
      " ┗ " +
      `and ${Object.keys(this.openSpanCopies).length} of them are open`
    );
  }

  private openSpanCopies: Record<string, Span> = {};
  private copyCount = 0;

  private copySpan(span: TraceBaseSpan, itsContext: Context) {
    this.copyCount++;
    const itsLibraryName = span.instrumentationLibrary.name;
    const attributes: Attributes = {};
    attributes[ATTRIBUTE_NAME_FOR_COPIES] = true;
    const copy: Span = trace.getTracer(itsLibraryName).startSpan(
      span.name,
      {
        kind: span.kind,
        startTime: span.startTime,
        attributes,
        links: [...span.links],
      },
      itsContext
    );
    // now the cheaty bit. Good thing this is JavaScript.
    copy.spanContext().spanId = span.spanContext().spanId;
    copy.spanContext().traceId = span.spanContext().traceId; // should be the same already except on the root span
    return copy;
  }

  onStart(span: TraceBaseSpan, parentContext: Context): void {
    if (span.attributes[ATTRIBUTE_NAME_FOR_COPIES]) {
      return; // don't copy copies
    }
    const copy = this.copySpan(span, parentContext);
    this.openSpanCopies[span.spanContext().spanId] = copy;
  }
  onEnd(span: ReadableSpan): void {
    if (span.attributes[ATTRIBUTE_NAME_FOR_COPIES]) {
      return; // don't copy copies
    }
    const openSpanCopy = this.openSpanCopies[span.spanContext().spanId];
    if (openSpanCopy) {
      openSpanCopy.setAttributes(span.attributes); // set these at the end, so they're all here
      // TODO: add span events and links from the other span
      openSpanCopy.end(span.endTime);
      delete this.openSpanCopies[span.spanContext().spanId];
    }
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  forceFlush(): Promise<void> {
    Object.values(this.openSpanCopies).forEach((span) => span.end());
    return Promise.resolve();
  }
}
