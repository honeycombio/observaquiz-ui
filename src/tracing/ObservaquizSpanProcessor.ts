// A second attempt at the booth game processor.

import { ReadableSpan, Span as TraceBaseSpan, SpanProcessor, SpanExporter, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { HONEYCOMB_DATASET_NAME, LearnTeam, TracingTeam } from "./TracingDestination";
import { Context, Attributes } from "@opentelemetry/api";
import { trace, Span } from "@opentelemetry/api";
import { ATTRIBUTE_NAME_FOR_APIKEY, ATTRIBUTE_NAME_FOR_COPIES, ATTRIBUTE_NAME_FOR_DESTINATION, ATTRIBUTE_NAME_FOR_PROCESSING_REPORT, ATTRIBUTE_VALUE_FOR_DEVREL_TEAM, ATTRIBUTE_VALUE_FOR_PARTICIPANT_TEAM, PROCESSING_REPORT_DELIMITER, attributesForCopies, removeAttributesForCopiedOriginals, setAttributesForCopiedOriginals } from "./ObservaquizProcessorCommon";
import { SessionIdProcessor } from "./SessionIdProcessor";
import { BaggageProcessor } from "./BaggageSpanProcessor";
import { LogRecord, LogRecordExporter, LogRecordProcessor, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import * as logsAPI from "@opentelemetry/api-logs";

export function ConstructThePipeline(params: {
  devrelExporter: SpanAndLogProcessor;
  devrelExporterDescription: string;
  processorForTeam: (team: TracingTeam) => SpanAndLogProcessor;
}) {
  const devrelExporterWithDescription = new WrapProcessorWithDescription(
    params.devrelExporter,
    params.devrelExporterDescription
  );

  const observaquizProcessor = new GrowingCompositeProcessor(); // I probably don't need the growing anymore
  observaquizProcessor.addProcessor(new WrapProcessorWithDescription(new SessionIdProcessor(), "I add the session ID"), "SESSION ID");
  observaquizProcessor.addProcessor(new WrapProcessorWithDescription(new BaggageProcessor(), "I add all the baggage"), "BAGGAGE");
  observaquizProcessor.addProcessor(new Copier(), "COPY"); // this sets ATTRIBUTE_NAME_FOR_DESTINATION for each span to 'devrel' or 'participant'

  // For the spans going to devrel, set team fields and then transmit to our collector
  const setTeamFieldsOnceWeHaveThem = new UpdatableProcessorThatInsertsAttributes();
  const setTeamFieldsAndExportToDevrel = new GrowingCompositeProcessor(); // I don't really need the growth
  setTeamFieldsAndExportToDevrel.addProcessor(setTeamFieldsOnceWeHaveThem, "ADD TEAM FIELDS");
  setTeamFieldsAndExportToDevrel.addProcessor(devrelExporterWithDescription, "SEND TO DEVREL");
  observaquizProcessor.addProcessor( // devrel spans go here
    new FilteringProcessor({
      filter: (span) => span.attributes[ATTRIBUTE_NAME_FOR_DESTINATION] === ATTRIBUTE_VALUE_FOR_DEVREL_TEAM,
      filterDescription: "this has been copied, now send it to DevRel's honeycomb team",
      downstream: setTeamFieldsAndExportToDevrel, // look! this makes it an exporting processor
    }),
    "NORMAL"
  );

  // for the spans that go to the participant: we will first hold them, and then send them,
  // once we have their team API key.
  const switcher = new SwitcherProcessor(() => new HoldingProcessor());
  observaquizProcessor.addProcessor(
    new FilteringProcessor({
      filter: (span) => span.attributes[ATTRIBUTE_NAME_FOR_DESTINATION] === ATTRIBUTE_VALUE_FOR_PARTICIPANT_TEAM,
      downstream: switcher,
      filterDescription: "this span is for the participant's team",
    }),
    "HOLD"
  );

  // This is the part that changes stuff when we learn the team
  const learnerOfTeam = new LearnerOfTeam(
    switcher,
    setTeamFieldsOnceWeHaveThem,
    (team) =>
      new WrapProcessorWithDescription(
        params.processorForTeam(team),
        "I have been constructed to send to team " + team.auth!.team.slug
      )
  );

  return { learnerOfTeam, observaquizProcessor };
}

type SelfDescribing = {
  /**
   * Output a string that says everything your processor does.
   * @param prefixForLinesAfterTheFirst If your description has multiple lines, put this in front of all the extra ones.
   * I could do without the prefix by
   *  - having them return an array of strings, which you then map the prefix across
   *  - or splitting the child output on newline and applying the same map.
   */
  describeSelf(): string;
};

function reportProcessing(span: SpanOrLogRecord, who: string) {
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

class WrapProcessorWithDescription implements SelfDescribing, SpanAndLogProcessor {
  constructor(private readonly processor: SpanAndLogProcessor, private readonly description: string) { }

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
  onEmit(logRecord: LogRecord, parentContext?: Context | undefined): void {
    reportProcessing(logRecord, this.description);
    this.processor.onEmit(logRecord, parentContext);
  }
  async shutdown(): Promise<void> {
    return this.processor.shutdown();
  }
  async forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }
}

type SpanAndLogProcessor = SpanProcessor & LogRecordProcessor;

class GrowingCompositeProcessor implements SelfDescribing, SpanAndLogProcessor {

  private seriesofProcessors: Array<SelfDescribing & SpanAndLogProcessor> = [];
  private routeDescriptions: Array<string | undefined> = []; // parallel array to seriesofProcessors. guess i should put them in an object together

  public addProcessor(processor: SelfDescribing & SpanAndLogProcessor, routeDescription?: string) {
    this.seriesofProcessors.push(processor); // new ones are last
    this.routeDescriptions.push(routeDescription);
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
    const callOneProcessor = (p: SpanAndLogProcessor, event: ReadableSpanOrLogRecord) => {
      p.onStart(event as TraceBaseSpan, parentContext);
    };
    recordProcessingOnStart(span, this.seriesofProcessors, callOneProcessor, (processingReports) =>
      this.describeSelfInternal(processingReports)
    );
  }

  onEmit(logRecord: LogRecord, parentContext?: Context | undefined): void {
    console.log("A log was, indeed emitted"); 
    const callOneProcessor = (p: SpanAndLogProcessor, event: ReadableSpanOrLogRecord) => {
      p.onEmit(event as LogRecord, parentContext);
    };
    recordProcessingOnStart(logRecord, this.seriesofProcessors, callOneProcessor, (processingReports) =>
      this.describeSelfInternal(processingReports)
    );
  }
  onEnd(span: ReadableSpan): void {
    this.seriesofProcessors.forEach((processor) => processor.onEnd(span));
  }
  shutdown(): Promise<void> {
    return Promise.all(this.seriesofProcessors.map((processor) => processor.shutdown())).then(() => { });
  }
  forceFlush(): Promise<void> {
    return Promise.all(this.seriesofProcessors.map((processor) => processor.forceFlush())).then(() => { });
  }
}

class UpdatableProcessorThatInsertsAttributes implements SelfDescribing, SpanAndLogProcessor {

  private attributes: Attributes = {};

  setTheseAttributes(newAttributes: Attributes) {
    this.attributes = newAttributes;
  }

  clearAttributes() {
    this.attributes = {}
  }

  describeSelf(): string {
    if (Object.entries(this.attributes).length === 0) {
      return "I will add fields to the event someday";
    }
    return (
      "I add fields to the span, currently: \n" +
      printList(Object.entries(this.attributes).map(([k, v]) => k + "=" + v?.toString()))
    );
  }

  onStart(span: TraceBaseSpan, _parentContext: Context): void {
    reportProcessing(span, this.describeSelf());
    span.setAttributes(this.attributes);
  }

  onEmit(event: LogRecord, context?: Context | undefined): void {
    reportProcessing(event, this.describeSelf());
    event.setAttributes(this.attributes);
  }

  onEnd(_span: ReadableSpan): void { }
  async shutdown(): Promise<void> { }
  async forceFlush(): Promise<void> { }
}



class LearnerOfTeam implements LearnTeam {
  constructor(
    private switcher: SwitcherProcessor,
    private setTeamFieldsOnceWeHaveThem: UpdatableProcessorThatInsertsAttributes,
    private whatToSwitchTo: (team: TracingTeam) => SelfDescribing & SpanAndLogProcessor
  ) { }

  public learnParticipantTeam(team: TracingTeam) {
    const attributes: Attributes = {
      "honeycomb.team.slug": team.auth!.team.slug,
      "honeycomb.region": team.auth!.region,
      "honeycomb.env.slug": team.auth!.environment.slug,
      "honeycomb.dataset": HONEYCOMB_DATASET_NAME,
      [ATTRIBUTE_NAME_FOR_APIKEY]: team.auth!.apiKey, // important that this key match other steps
      "honeycomb.leaderboard.moniker": team.protagonist?.moniker || "anonymous", // TODO: learn this earlier
    };
    this.setTeamFieldsOnceWeHaveThem.setTheseAttributes(attributes);
    this.switcher.switchTo(this.whatToSwitchTo(team));
  }

  public reset() {
    this.switcher.reset();
    this.setTeamFieldsOnceWeHaveThem.clearAttributes();
  }
}

function printList(list: Array<string>): string {
  const linePrefix = " ┣ ";
  const lastLinePrefix = " ┗ ";
  const isLast = (i: number) => i === list.length - 1;
  return list.map((p, i) => (isLast(i) ? lastLinePrefix : linePrefix) + p).join("\n");
}

class ProcessorThatInsertsAttributes implements SelfDescribing, SpanAndLogProcessor {
  constructor(private readonly attributes: Attributes) { }

  describeSelf(): string {
    return (
      "I add fields to the event: \n" +
      printList(Object.entries(this.attributes).map(([k, v]) => k + "=" + v?.toString()))
    );
  }
  onStart(event: TraceBaseSpan, _parentContext: Context): void {
    reportProcessing(event, this.describeSelf());
    event.setAttributes(this.attributes);
  }
  onEmit(event: LogRecord, context?: Context | undefined): void {
    reportProcessing(event, this.describeSelf());
    event.setAttributes(this.attributes);
  }

  onEnd(_span: ReadableSpan): void { }
  async shutdown(): Promise<void> { }
  async forceFlush(): Promise<void> { }
}

class FilteringProcessor implements SelfDescribing, SpanAndLogProcessor {
  constructor(
    private readonly params: {
      filter: (span: ReadableSpanOrLogRecord) => boolean;
      filterDescription: string;
      downstream: SelfDescribing & SpanAndLogProcessor;
    }
  ) { }


  describeSelf(): string {
    return this.describeSelfInternal(this.params.downstream.describeSelf());
  }

  describeSelfInternal(downstreamDescription: string): string {
    return (
      "I filter spans, choosing: " +
      this.params.filterDescription +
      "\n" +
      " ┗ " +
      downstreamDescription.split("\n").join("\n   ")
    );
  }

  filter(event: SpanOrLogRecord, callOneProcessor: (processor: SpanAndLogProcessor, event: ReadableSpanOrLogRecord) => void) {
    if (this.params.filter(event)) {
      recordProcessingOnStart(event, [this.params.downstream], callOneProcessor, (childReports) =>
        this.describeSelfInternal(childReports[0])
      );
    } else {
      reportProcessing(event, "FilterProcessor says we only want: " + this.params.filterDescription + " X");
    }
  }

  onStart(span: TraceBaseSpan, parentContext: Context): void {
    const callOneProcessor = (p: SpanAndLogProcessor, event: ReadableSpanOrLogRecord) => {
      p.onStart(event as TraceBaseSpan, parentContext);
    };
    this.filter(span, callOneProcessor)
  }
  onEnd(span: ReadableSpan): void {
    if (this.params.filter(span)) {
      this.params.downstream.onEnd(span);
    }
  }
  onEmit(event: LogRecord, parentContext?: Context | undefined): void {
    const callOneProcessor = (p: SpanAndLogProcessor, event: ReadableSpanOrLogRecord) => {
      p.onEmit(event as LogRecord, parentContext);
    };
    this.filter(event, callOneProcessor)
  }
  shutdown(): Promise<void> {
    return this.params.downstream.shutdown();
  }
  forceFlush(): Promise<void> {
    return this.params.downstream.forceFlush();
  }
}

/**
 * On span start, this makes a copy of the span and starts it. (unless the incoming span was already a copy)
 * On span end, this ends the copy.
 * 
 * The copies are designated as 'observaquiz.destination = participant'
 * and the originals are 'observaquiz.destination = devrel'
 */
class Copier implements SelfDescribing, SpanAndLogProcessor {
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
    const attributes: Attributes = {
      ...attributesForCopies(), // observaquiz.destination = participant
      [ATTRIBUTE_NAME_FOR_PROCESSING_REPORT]: "Created by the SpanCopier" // different for the LogCopier
    }
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
    setAttributesForCopiedOriginals(span); // observaquiz.destination = devrel
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
      // openSpanCopy.setAttribute("observaquiz.spanCopier.original_attributes_on_span_end", Object.entries(span.attributes).length)
      const attributes = { ...span.attributes };
      // now, the things that are particular to the copies -- do not pull these from the originals
      removeAttributesForCopiedOriginals(attributes)
      delete attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT]; // we definitely need this
      openSpanCopy.setAttributes(attributes); // set these at the end, so they're all here
      span.events.forEach((event) => openSpanCopy.addEvent(event.name, event.attributes, event.time));
      openSpanCopy.end(span.endTime);
      delete this.openSpanCopies[span.spanContext().spanId];
    }
  }

  // logs are a little different
  private copyLogRecord(logRecord: LogRecord, itsContext: Context) {
    this.copyCount++;
    const itsLibraryName = logRecord.instrumentationScope.name;
    const attributes: logsAPI.LogAttributes = { ...logRecord.attributes, ...attributesForCopies() };
    attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] = "Created by the LogRecordCopier";
    logsAPI.logs.getLogger(itsLibraryName).emit({
      ...logRecord,
      context: itsContext,
      attributes,
    });
    setAttributesForCopiedOriginals(logRecord)
  }

  onEmit(logRecord: LogRecord, parentContext: Context): void {
    if (logRecord.attributes[ATTRIBUTE_NAME_FOR_COPIES]) {
      reportProcessing(logRecord, "Copy processor doesn't copy copies X");
      return; // don't copy copies
    }
    reportProcessing(logRecord, this.describeSelf());
    this.copyLogRecord(logRecord, parentContext);
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  forceFlush(): Promise<void> {
    Object.values(this.openSpanCopies).forEach((span) => span.end());
    return Promise.resolve();
  }
}

class HoldingProcessor implements SelfDescribing, SpanAndLogProcessor {
  constructor() { }


  private startedSpans: Array<[TraceBaseSpan, Context]> = [];
  private endedSpans: Array<ReadableSpan> = [];

  private logRecords: Array<[LogRecord, Context | undefined]> = [];

  flushTo(other: SelfDescribing & SpanAndLogProcessor) {
    this.startedSpans.forEach(([span, parentContext]) => other.onStart(span, parentContext));
    this.startedSpans = []; // make sure we don't hold a reference to a pile of spans forever.
    this.endedSpans.forEach((span) => other.onEnd(span));
    this.endedSpans = [];
    this.logRecords.forEach(([logRecord, parentContext]) => other.onEmit(logRecord, parentContext));
    this.logRecords = [];
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
  onEmit(logRecord: LogRecord, parentContext?: Context | undefined): void {
    reportProcessing(logRecord, "Holding on to this one...");
    this.logRecords.push([logRecord, parentContext]);
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
class SwitcherProcessor implements SelfDescribing, SpanAndLogProcessor {
  private state: { name: "holding", downstream: HoldingProcessor } | { name: "sending", downstream: SelfDescribing & SpanAndLogProcessor };

  public switchTo(downstream: SelfDescribing & SpanAndLogProcessor) {
    if (this.state.name === "holding") {
      this.state.downstream.flushTo(downstream)
    };
    this.state = { name: "sending", downstream }
  }

  public reset() {
    if (this.state.name === "sending") {
      this.state.downstream.forceFlush();
      this.state.downstream.shutdown();
      this.state = { name: "holding", downstream: this.constructInitialDownstream() }
    } else {
      console.log("INFO: switcher.reset() called when we were already holding spans. Continuing to hold")
    }
  }

  describeSelf(): string {
    return this.describeSelfInternal(this.state.downstream.describeSelf());
  }

  describeSelfInternal(describeCurrent: string): string {
    return (
      "I am a switcher.\n" + " ┗ " + " Now sending to: " + describeCurrent.split("\n").join("\n" + "   ")
    );
  }

  constructor(private readonly constructInitialDownstream: () => HoldingProcessor) {
    this.state = { name: "holding", downstream: constructInitialDownstream() }
  }
  onEmit(logRecord: LogRecord, parentContext?: Context | undefined): void {
    const callOneProcessor = (p: SpanAndLogProcessor, logRecord: ReadableSpanOrLogRecord) => {
      p.onEmit(logRecord as LogRecord, parentContext);
    };
    recordProcessingOnStart(logRecord, [this.state.downstream], callOneProcessor, (childReports) =>
      this.describeSelfInternal(childReports[0])
    );
  }
  onStart(span: TraceBaseSpan, parentContext: Context): void {
    const callOneProcessor = (p: SpanAndLogProcessor, span: ReadableSpanOrLogRecord) => {
      p.onStart(span as TraceBaseSpan, parentContext);
    };
    recordProcessingOnStart(span, [this.state.downstream], callOneProcessor, (childReports) =>
      this.describeSelfInternal(childReports[0])
    );
  }
  onEnd(span: ReadableSpan): void {
    this.state.downstream.onEnd(span);
  }
  shutdown(): Promise<void> {
    return this.state.downstream.shutdown();
  }
  forceFlush(): Promise<void> {
    return this.state.downstream.forceFlush();
  }
}

type SpanOrLogRecord = TraceBaseSpan | LogRecord;

function recordProcessingOnStart(
  span: SpanOrLogRecord,
  spanProcessors: SpanAndLogProcessor[],
  callOneProcessor: (processor: SpanAndLogProcessor, event: ReadableSpanOrLogRecord) => void,
  wrapTheChildReport: (childReport: string[]) => string
) {
  var processingRecordBefore = span.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] || "";
  if (!!processingRecordBefore) {
    processingRecordBefore += PROCESSING_REPORT_DELIMITER;
  }

  const processingRecordsFromChildren: string[] = [];
  spanProcessors.forEach((p) => {
    span.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] = "";
    callOneProcessor(p, span);
    processingRecordsFromChildren.push(span.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT]);
  });

  span.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] =
    processingRecordBefore + wrapTheChildReport(processingRecordsFromChildren);
}

type ReadableSpanOrLogRecord = ReadableSpan | ReadableLogRecord;

type SpanAndLogExporter = SpanExporter & LogRecordExporter;

export class DiagnosticsOnlyExporter implements SpanExporter, LogRecordExporter {

  constructor(public description: String) {
    console.log(`Diagnostic exporter constructed: ${this.description}`)
  }

  // the ExportResult type seems hard to import, hence the 'any' here
  export(spans: Array<ReadableSpan | ReadableLogRecord>, resultCallback: (result: any) => void): void {
    const spansWithApiKey = spans.filter((span) => !!span.attributes[ATTRIBUTE_NAME_FOR_APIKEY]).length
    const attributesFromOneSpan = Object.entries(spans[0].attributes).map(([k, v]) => `  ${k}=${v}`).join("\n")
    console.log(`Exporter: ${this.description}, exporting spans: ${spans.length}, with API key: ${spansWithApiKey}\nHere are the attributes for one of them:\n${attributesFromOneSpan}`)
    resultCallback({ code: 0 });
  }
  async shutdown(): Promise<void> {
    console.log(`Shutting down diagnostic exporter: ${this.description}`);
  }
  async forceFlush?(): Promise<void> {
    console.log(`Flushing diagnostic exporter: ${this.description}`);
  }
}

export function constructExporterThatAddsApiKey(batchedExporter: SpanAndLogProcessor): (team: TracingTeam) => SpanAndLogProcessor {
  return (team: TracingTeam) => {
    const composite = new GrowingCompositeProcessor();
    composite.addProcessor(new ProcessorThatInsertsAttributes({ [ATTRIBUTE_NAME_FOR_APIKEY]: team.auth!.apiKey }), "ATTRIBUTE")
    composite.addProcessor(new WrapProcessorWithDescription(batchedExporter, "send with API key"))
    return composite;
  }
}

export function CombineSpanAndLogProcessor(spanProcessor: SpanProcessor, logProcessor: LogRecordProcessor): SpanAndLogProcessor {
  return {
    onStart: (span: TraceBaseSpan, parentContext: Context) => {
      spanProcessor.onStart(span, parentContext);
    },
    onEnd: (span: ReadableSpan) => {
      spanProcessor.onEnd(span);
    },
    onEmit: (logRecord: LogRecord, parentContext?: Context | undefined) => {
      logProcessor.onEmit(logRecord, parentContext);
    },
    shutdown: () => {
      return Promise.all([spanProcessor.shutdown(), logProcessor.shutdown()]).then(() => { });
    },
    forceFlush: () => {
      return Promise.all([spanProcessor.forceFlush(), logProcessor.forceFlush()]).then(() => { });
    }
  }
} // this was a copilot success, this function. It typed it in one hit.