// A second attempt at the booth game processor.

import { ReadableSpan, Span as TraceBaseSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { HONEYCOMB_DATASET_NAME, TracingTeam } from "./TracingDestination";
import { Context, Attributes } from "@opentelemetry/api";
import { trace, Span } from "@opentelemetry/api";

export const ATTRIBUTE_NAME_FOR_APIKEY = "honeycomb.customer_api_key"; // this will NOT trigger a send on the backend. We are copying everything for a send directly from the frontend.

export const ATTRIBUTE_NAME_FOR_COPIES = "boothgame.late_span";
export const ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS = "boothgame.has_a_copy";

export function ConstructThePipeline(params: {
  normalProcessor: SpanProcessor;
  normalProcessorDescription: string;
  processorForTeam: (team: TracingTeam) => SpanProcessor;
}) {
  const normalProcessorWithDescription = new WrapSpanProcessorWithDescription(
    params.normalProcessor,
    params.normalProcessorDescription
  );

  const boothGameProcessor = new GrowingCompositeSpanProcessor();
  boothGameProcessor.addProcessor(
    new FilteringSpanProcessor({
      filter: (span) => !span.attributes[ATTRIBUTE_NAME_FOR_COPIES],
      filterDescription: "spans that aren't copies",
      downstream: normalProcessorWithDescription,
    }),
    "NORMAL"
  );
  const switcher = new SwitcherSpanProcessor(new HoldingSpanProcessor());
  boothGameProcessor.addProcessor(
    // NOTE: filtering will work in production, but not locally because my collector isn't sending to customers here
    //  new FilteringSpanProcessor({
    //    downstream:
    new SpanCopier(),
    //   filter: (span) => span.attributes[ATTRIBUTE_NAME_FOR_APIKEY] === undefined,
    //   filterDescription: "spans without an api key",
    //  }),
    "COPY"
  );
  boothGameProcessor.addProcessor(
    new FilteringSpanProcessor({
      filter: (span) => !!span.attributes[ATTRIBUTE_NAME_FOR_COPIES],
      downstream: switcher,
      filterDescription: "copied spans",
    }),
    "HOLD"
  );
  const learnerOfTeam = new LearnerOfTeam(
    boothGameProcessor,
    switcher,
    (team) =>
      new WrapSpanProcessorWithDescription(
        params.processorForTeam(team),
        "I have been constructed to send to team " + team.team.slug
      )
  );
  return { learnerOfTeam, boothGameProcessor };
}

type SelfDescribingSpanProcessor = SpanProcessor & {
  /**
   * Output a string that says everything your processor does.
   * @param prefixForLinesAfterTheFirst If your description has multiple lines, put this in front of all the extra ones.
   * I could do without the prefix by
   *  - having them return an array of strings, which you then map the prefix across
   *  - or splitting the child output on newline and applying the same map.
   */
  describeSelf(): string;
};

const ATTRIBUTE_NAME_FOR_PROCESSING_REPORT = "boothgame.processing_report";
const PROCESSING_REPORT_DELIMITER = "\n *-* \n";

function reportProcessing(span: TraceBaseSpan, who: string) {
  const existingProcessingReport = span.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT];
  if (!existingProcessingReport) {
    span.setAttribute(ATTRIBUTE_NAME_FOR_PROCESSING_REPORT, who);
  } else {
    span.setAttribute(
      ATTRIBUTE_NAME_FOR_PROCESSING_REPORT,
      existingProcessingReport + PROCESSING_REPORT_DELIMITER + who
    );
  }
}

class WrapSpanProcessorWithDescription implements SelfDescribingSpanProcessor {
  constructor(private readonly processor: SpanProcessor, private readonly description: string) {}
  describeSelf(): string {
    return this.description;
  }
  onStart(span: TraceBaseSpan, parentContext: Context): void {
    reportProcessing(span, this.description);
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

class GrowingCompositeSpanProcessor implements SelfDescribingSpanProcessor {
  private seriesofProcessors: Array<SelfDescribingSpanProcessor> = [];
  private routeDescriptions: Array<string | undefined> = []; // parallel array to seriesofProcessors. guess i should put them in an object together

  public addProcessor(processor: SelfDescribingSpanProcessor, routeDescription?: string) {
    this.seriesofProcessors.unshift(processor); // new ones are first
    this.routeDescriptions.unshift(routeDescription);
  }

  describeSelf(): string {
    return this.describeSelfInternal(this.seriesofProcessors.map((p) => p.describeSelf()));
  }

  describeSelfInternal(childDescriptions: string[]): string {
    // a nested list
    const linePrefix = " ┣ ";
    const innerPrefix = " ┃ ";
    const innerPrefixForTheLastOne = "   ";
    const lastLinePrefix = " ┗ ";
    const isLast = (i: number) => i === this.seriesofProcessors.length - 1;
    var result = "Each of: \n";
    childDescriptions.forEach((pd, i) => {
      const routeDescription = this.routeDescriptions[i] ? this.routeDescriptions[i] + ": " : "";
      if (isLast(i)) {
        result += lastLinePrefix + routeDescription + pd.split("\n").join("\n" + innerPrefixForTheLastOne);
      } else {
        result += linePrefix + routeDescription + pd.split("\n").join("\n" + innerPrefix) + "\n";
      }
    });
    return result;
  }

  onStart(span: TraceBaseSpan, parentContext: Context): void {
    recordProcessingOnStart(span, parentContext, this.seriesofProcessors, (processingReports) =>
      this.describeSelfInternal(processingReports)
    );
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
  constructor(
    private insertProcessorHere: GrowingCompositeSpanProcessor,
    private switcher: SwitcherSpanProcessor,
    private whatToSwitchTo: (team: TracingTeam) => SelfDescribingSpanProcessor
  ) {}

  public learnCustomerTeam(team: TracingTeam) {
    const attributes: Attributes = {
      "honeycomb.team.slug": team.team.slug,
      "honeycomb.region": team.region,
      "honeycomb.env.slug": team.environment.slug,
      "honeycomb.dataset": HONEYCOMB_DATASET_NAME,
      "honeycomb.observaquiz.execution_id": team.observaquizExecutionId,
      "honeycomb.observaquiz.start_time": team.observaquizStartTime,
    };
    attributes[ATTRIBUTE_NAME_FOR_APIKEY] = team.apiKey; // important that this key match other steps
    this.insertProcessorHere.addProcessor(new ProcessorThatInsertsAttributes(attributes), "ADD FIELDS");
    this.switcher.switchTo(this.whatToSwitchTo(team));
  }
}

function printList(list: Array<string>): string {
  const linePrefix = " ┣ ";
  const lastLinePrefix = " ┗ ";
  const isLast = (i: number) => i === list.length - 1;
  return list.map((p, i) => (isLast(i) ? lastLinePrefix : linePrefix) + p).join("\n");
}

class ProcessorThatInsertsAttributes implements SelfDescribingSpanProcessor {
  constructor(private readonly attributes: Attributes) {}
  describeSelf(): string {
    return (
      "I add fields to the span: \n" +
      printList(Object.entries(this.attributes).map(([k, v]) => k + "=" + v?.toString()))
    );
  }
  onStart(span: TraceBaseSpan, _parentContext: Context): void {
    reportProcessing(span, this.describeSelf());
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

  describeSelf(): string {
    return this.describeSelfInternal(this.params.downstream.describeSelf());
  }

  describeSelfInternal(downstreamDescription: string): string {
    return (
      "I filter spans, choosing " +
      this.params.filterDescription +
      "\n" +
      " ┗ " +
      downstreamDescription.split("\n").join("\n   ")
    );
  }

  onStart(span: TraceBaseSpan, parentContext: Context): void {
    if (this.params.filter(span)) {
      recordProcessingOnStart(span, parentContext, [this.params.downstream], (childReports) =>
        this.describeSelfInternal(childReports[0])
      );
    } else {
      reportProcessing(span, "FilterProcessor says we only want " + this.params.filterDescription + " X");
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
  describeSelf(): string {
    return (
      "I copy spans, evilly\n" +
      " ┣ " +
      `So far I have copied ${this.copyCount} spans\n` +
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
    attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] = "Created by the SpanCopier";
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
    reportProcessing(span, "Copy made X");
    span.setAttribute(ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS, true); // note this, it may be useful
    // now the cheaty bit. Good thing this is JavaScript.
    copy.spanContext().spanId = span.spanContext().spanId;
    copy.spanContext().traceId = span.spanContext().traceId; // should be the same already except on the root span
    return copy;
  }

  onStart(span: TraceBaseSpan, parentContext: Context): void {
    if (span.attributes[ATTRIBUTE_NAME_FOR_COPIES]) {
      reportProcessing(span, "Copy processor doesn't copy copies X");
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
      const attributes = { ...span.attributes };
      // now, the things that are particular to the copies -- do not pull these from the originals
      delete attributes[ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS];
      delete attributes[ATTRIBUTE_NAME_FOR_COPIES];
      delete attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT];
      openSpanCopy.setAttributes(attributes); // set these at the end, so they're all here
      span.events.forEach((event) => openSpanCopy.addEvent(event.name, event.attributes, event.time));
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

class HoldingSpanProcessor implements SelfDescribingSpanProcessor {
  constructor() {}

  private startedSpans: Array<[TraceBaseSpan, Context]> = [];
  private endedSpans: Array<ReadableSpan> = [];

  flushTo(other: SelfDescribingSpanProcessor) {
    this.startedSpans.forEach(([span, parentContext]) => other.onStart(span, parentContext));
    this.startedSpans = []; // make sure we don't hold a reference to a pile of spans forever.
    this.endedSpans.forEach((span) => other.onEnd(span));
    this.endedSpans = [];
  }

  describeSelf(): string {
    return (
      "I hold on to spans\n" +
      " ┣ " +
      `${this.startedSpans.length} started spans\n` +
      " ┗ " +
      `${this.endedSpans.length} ended spans`
    );
  }
  onStart(span: TraceBaseSpan, parentContext: Context): void {
    reportProcessing(span, "Holding on to this one...");
    this.startedSpans.push([span, parentContext]);
  }
  onEnd(span: ReadableSpan): void {
    this.endedSpans.push(span);
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

/** this one accepts a pile of spans at initialization and sends them. */
class SwitcherSpanProcessor implements SelfDescribingSpanProcessor {
  private currentDownstream: SelfDescribingSpanProcessor;

  public switchTo(downstream: SelfDescribingSpanProcessor) {
    this.firstDownstream.flushTo(downstream);
    this.currentDownstream = downstream;
  }

  describeSelf(): string {
    const describePast =
      this.firstDownstream === this.currentDownstream
        ? ""
        : " ┣ " +
          "Previously sent to: " +
          this.firstDownstream
            .describeSelf()
            .split("\n")
            .join("\n" + " ┃ ") +
          "\n";
    return this.describeSelfInternal(describePast, this.currentDownstream.describeSelf());
  }

  describeSelfInternal(describePast: string, describeCurrent: string): string {
    return (
      "I am a switcher.\n" + describePast + " ┗ " + " Now sending to: " + describeCurrent.split("\n").join("\n" + "   ")
    );
  }

  constructor(private readonly firstDownstream: HoldingSpanProcessor) {
    this.currentDownstream = firstDownstream;
  }
  onStart(span: TraceBaseSpan, parentContext: Context): void {
    recordProcessingOnStart(span, parentContext, [this.currentDownstream], (childReports) =>
      this.describeSelfInternal("", childReports[0])
    );
  }
  onEnd(span: ReadableSpan): void {
    this.currentDownstream.onEnd(span);
  }
  shutdown(): Promise<void> {
    return this.currentDownstream.shutdown();
  }
  forceFlush(): Promise<void> {
    return this.currentDownstream.forceFlush();
  }
}

function recordProcessingOnStart(
  span: TraceBaseSpan,
  parentContext: Context,
  spanProcessors: SpanProcessor[],
  wrapTheChildReport: (childReport: string[]) => string
) {
  var processingRecordBefore = span.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] || "";
  if (!!processingRecordBefore) {
    processingRecordBefore += PROCESSING_REPORT_DELIMITER;
  }

  const processingRecordsFromChildren: string[] = [];
  spanProcessors.forEach((logProcessor) => {
    span.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] = "";
    logProcessor.onStart(span, parentContext);
    processingRecordsFromChildren.push(span.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT]);
  });

  span.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] =
    processingRecordBefore + wrapTheChildReport(processingRecordsFromChildren);
}
