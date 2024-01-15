// Copied from BoothGameSpanProcessor.ts, altered to be logs instead.

import type { LogRecord, LogRecordProcessor } from "@opentelemetry/sdk-logs";
import * as logsAPI from "@opentelemetry/api-logs";
import { HONEYCOMB_DATASET_NAME, TracingTeam } from "./TracingDestination";
import { Context, Attributes } from "@opentelemetry/api";

export const ATTRIBUTE_NAME_FOR_APIKEY = "app.honeycomb_api_key"; // TODO: can we change this, I want honeycomb.apikey or boothGame.customer_apikey

export const ATTRIBUTE_NAME_FOR_COPIES = "boothgame.is_a_copy";
export const ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS = "boothgame.has_a_copy";

const ATTRIBUTE_NAME_FOR_PROCESSING_REPORT = "boothgame.processing_report";

const PROCESSING_REPORT_DELIMITER = "\n *-* \n";

function reportProcessing(logRecord: LogRecord, who: string) {
  const existingProcessingReport = logRecord.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT];
  if (!existingProcessingReport) {
    logRecord.setAttribute(ATTRIBUTE_NAME_FOR_PROCESSING_REPORT, who);
  } else {
    logRecord.setAttribute(
      ATTRIBUTE_NAME_FOR_PROCESSING_REPORT,
      existingProcessingReport + PROCESSING_REPORT_DELIMITER + who
    );
  }
}

export function ConstructLogPipeline(params: {
  normalProcessor: LogRecordProcessor;
  normalProcessorDescription: string;
  processorForTeam: (team: TracingTeam) => LogRecordProcessor;
}) {
  const normalProcessorWithDescription = new WrapLogRecordProcessorWithDescription(
    params.normalProcessor,
    params.normalProcessorDescription
  );

  const boothGameProcessor = new GrowingCompositeLogRecordProcessor();
  boothGameProcessor.addProcessor(
    new FilteringLogRecordProcessor({
      filter: (LogRecord) => !LogRecord.attributes[ATTRIBUTE_NAME_FOR_COPIES],
      filterDescription: "LogRecords that aren't copies",
      downstream: normalProcessorWithDescription,
    }),
    "NORMAL"
  );
  const switcher = new SwitcherLogRecordProcessor(new HoldingLogRecordProcessor());
  boothGameProcessor.addProcessor(
    // NOTE: filtering will work in production, but not locally because my collector isn't sending to customers here
    //  new FilteringLogRecordProcessor({
    //    downstream:
    new LogRecordCopier(),
    //   filter: (LogRecord) => LogRecord.attributes[ATTRIBUTE_NAME_FOR_APIKEY] === undefined,
    //   filterDescription: "LogRecords without an api key",
    //  }),
    "COPY"
  );
  boothGameProcessor.addProcessor(
    new FilteringLogRecordProcessor({
      filter: (LogRecord) => !!LogRecord.attributes[ATTRIBUTE_NAME_FOR_COPIES],
      downstream: switcher,
      filterDescription: "copied LogRecords",
    }),
    "HOLD"
  );
  const learnerOfTeam = new LearnerOfTeam(
    boothGameProcessor,
    switcher,
    (team) =>
      new WrapLogRecordProcessorWithDescription(
        params.processorForTeam(team),
        "I have been constructed to send to team " + team.team.slug
      )
  );
  return { learnerOfTeam, boothGameProcessor };
}

type SelfDescribingLogRecordProcessor = LogRecordProcessor & {
  /**
   * Output a string that says everything your processor does.
   * @param prefixForLinesAfterTheFirst If your description has multiple lines, put this in front of all the extra ones.
   * I could do without the prefix by
   *  - having them return an array of strings, which you then map the prefix across
   *  - or splitting the child output on newline and applying the same map.
   */
  describeSelf(): string;
};

class WrapLogRecordProcessorWithDescription implements SelfDescribingLogRecordProcessor {
  constructor(private readonly processor: LogRecordProcessor, private readonly description: string) {}
  describeSelf(): string {
    return this.description;
  }
  onEmit(logRecord: LogRecord, parentContext: Context): void {
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

class GrowingCompositeLogRecordProcessor implements SelfDescribingLogRecordProcessor {
  private seriesofProcessors: Array<SelfDescribingLogRecordProcessor> = [];
  private routeDescriptions: Array<string | undefined> = []; // parallel array to seriesofProcessors. guess i should put them in an object together

  public addProcessor(processor: SelfDescribingLogRecordProcessor, routeDescription?: string) {
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

  onEmit(logRecord: LogRecord, parentContext: Context): void {
    recordEmission(logRecord, parentContext, this.seriesofProcessors, (processingReports) =>
      this.describeSelfInternal(processingReports)
    );
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
    private insertProcessorHere: GrowingCompositeLogRecordProcessor,
    private switcher: SwitcherLogRecordProcessor,
    private whatToSwitchTo: (team: TracingTeam) => SelfDescribingLogRecordProcessor
  ) {}

  public learnCustomerTeam(team: TracingTeam) {
    const attributes: Attributes = {
      "honeycomb.team.slug": team.team.slug,
      "honeycomb.region": team.region,
      "honeycomb.env.slug": team.environment.slug,
      "honeycomb.dataset": HONEYCOMB_DATASET_NAME,
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

class ProcessorThatInsertsAttributes implements SelfDescribingLogRecordProcessor {
  constructor(private readonly attributes: Attributes) {}
  describeSelf(): string {
    return (
      "I add fields to the LogRecord: \n" +
      printList(Object.entries(this.attributes).map(([k, v]) => k + "=" + v?.toString()))
    );
  }
  onEmit(logRecord: LogRecord, _parentContext: Context): void {
    reportProcessing(logRecord, this.describeSelf());
    logRecord.setAttributes(this.attributes);
  }
  async shutdown(): Promise<void> {}
  async forceFlush(): Promise<void> {}
}

class FilteringLogRecordProcessor implements SelfDescribingLogRecordProcessor {
  constructor(
    private readonly params: {
      filter: (LogRecord: LogRecord) => boolean;
      filterDescription: string;
      downstream: SelfDescribingLogRecordProcessor;
    }
  ) {}

  describeSelf(): string {
    return this.describeSelfInternal(this.params.downstream.describeSelf());
  }

  describeSelfInternal(downstreamDescription: string): string {
    return (
      "I filter LogRecords, choosing " +
      this.params.filterDescription +
      "\n" +
      " ┗ " +
      downstreamDescription.split("\n").join("\n   ")
    );
  }

  onEmit(logRecord: LogRecord, parentContext: Context): void {
    if (this.params.filter(logRecord)) {
      recordEmission(logRecord, parentContext, [this.params.downstream], (childReports) =>
        this.describeSelfInternal(childReports[0])
      );
    } else {
      reportProcessing(logRecord, "FilterProcessor says we only want " + this.params.filterDescription);
    }
  }
  shutdown(): Promise<void> {
    return this.params.downstream.shutdown();
  }
  forceFlush(): Promise<void> {
    return this.params.downstream.forceFlush();
  }
}

class LogRecordCopier implements SelfDescribingLogRecordProcessor {
  describeSelf(): string {
    return "I copy LogRecords, evilly\n" + " ┗ " + `So far I have copied ${this.copyCount} LogRecords`;
  }

  private copyCount = 0;

  private copyLogRecord(logRecord: LogRecord, itsContext: Context) {
    this.copyCount++;
    const itsLibraryName = logRecord.instrumentationScope.name;
    const attributes: logsAPI.LogAttributes = { ...logRecord.attributes };
    attributes[ATTRIBUTE_NAME_FOR_COPIES] = true;
    attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] = "Created by the LogRecordCopier";
    logsAPI.logs.getLogger(itsLibraryName).emit({
      ...logRecord,
      context: itsContext,
      attributes,
    });
    logRecord.setAttribute(ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS, true); // note this, it may be useful
  }

  onEmit(logRecord: LogRecord, parentContext: Context): void {
    if (logRecord.attributes[ATTRIBUTE_NAME_FOR_COPIES]) {
      reportProcessing(logRecord, "Copy processor doesn't copy copies");
      return; // don't copy copies
    }
    reportProcessing(logRecord, this.describeSelf());
    this.copyLogRecord(logRecord, parentContext);
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

class HoldingLogRecordProcessor implements SelfDescribingLogRecordProcessor {
  constructor() {}

  private emittedLogRecords: Array<[LogRecord, Context]> = [];

  flushTo(other: SelfDescribingLogRecordProcessor) {
    this.emittedLogRecords.forEach(([logRecord, parentContext]) => {
      // Cannot add to log attributes anymore :-(
      other.onEmit(logRecord, parentContext);
    });
    this.emittedLogRecords = []; // make sure we don't hold a reference to a pile of LogRecords forever.
  }

  describeSelf(): string {
    return "I hold on to LogRecords\n" + " ┗ " + `${this.emittedLogRecords.length} emitted LogRecords`;
  }
  onEmit(logRecord: LogRecord, parentContext: Context): void {
    reportProcessing(logRecord, "Holding on to this one");
    this.emittedLogRecords.push([logRecord, parentContext]);
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

/** this one accepts a pile of LogRecords at initialization and sends them. */
class SwitcherLogRecordProcessor implements SelfDescribingLogRecordProcessor {
  private currentDownstream: SelfDescribingLogRecordProcessor;

  public switchTo(downstream: SelfDescribingLogRecordProcessor) {
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

  constructor(private readonly firstDownstream: HoldingLogRecordProcessor) {
    this.currentDownstream = firstDownstream;
  }
  forceFlush(): Promise<void> {
    return this.currentDownstream.forceFlush();
  }
  onEmit(logRecord: LogRecord, parentContext: Context): void {
    recordEmission(logRecord, parentContext, [this.currentDownstream], (childReports) =>
      this.describeSelfInternal("", childReports[0])
    );
  }
  shutdown(): Promise<void> {
    return this.currentDownstream.shutdown();
  }
}

function recordEmission(
  logRecord: LogRecord,
  parentContext: Context,
  logProcessors: LogRecordProcessor[],
  wrapTheChildReport: (childReport: string[]) => string
) {
  var processingRecordBefore = logRecord.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT];
  if (!!processingRecordBefore) {
    processingRecordBefore += PROCESSING_REPORT_DELIMITER;
  }

  const processingRecordsFromChildren: string[] = [];
  logProcessors.forEach((logProcessor) => {
    logRecord.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] = "";
    logProcessor.onEmit(logRecord, parentContext);
    processingRecordsFromChildren.push(logRecord.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT]);
  });

  logRecord.attributes[ATTRIBUTE_NAME_FOR_PROCESSING_REPORT] =
    processingRecordBefore + wrapTheChildReport(processingRecordsFromChildren);
}
