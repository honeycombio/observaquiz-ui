// Copied from BoothGameSpanProcessor.ts, altered to be logs instead.

import type { LogRecord, LogRecordProcessor } from "@opentelemetry/sdk-logs";
import * as logsAPI from "@opentelemetry/api-logs";
import { HONEYCOMB_DATASET_NAME, TracingTeam } from "./TracingDestination";
import { Context, Attributes } from "@opentelemetry/api";

export const ATTRIBUTE_NAME_FOR_APIKEY = "app.honeycomb_api_key"; // TODO: can we change this, I want honeycomb.apikey or boothGame.customer_apikey

export const ATTRIBUTE_NAME_FOR_COPIES = "boothgame.late_LogRecord";
export const ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS = "boothgame.has_a_copy";

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
  describeSelf(prefixForLinesAfterTheFirst: string): string;
};

class WrapLogRecordProcessorWithDescription implements SelfDescribingLogRecordProcessor {
  constructor(private readonly processor: LogRecordProcessor, private readonly description: string) {}
  describeSelf(): string {
    return this.description;
  }
  onEmit(LogRecord: LogRecord, parentContext: Context): void {
    this.processor.onEmit(LogRecord, parentContext);
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

  describeSelf(prefixForLinesAfterTheFirst: string = ""): string {
    // a nested list
    const linePrefix = prefixForLinesAfterTheFirst + " ┣ ";
    const innerPrefix = prefixForLinesAfterTheFirst + " ┃ ";
    const innerPrefixForTheLastOne = prefixForLinesAfterTheFirst + "   ";
    const lastLinePrefix = prefixForLinesAfterTheFirst + " ┗ ";
    const isLast = (i: number) => i === this.seriesofProcessors.length - 1;
    var result = "Each of: \n";
    this.seriesofProcessors.forEach((p, i) => {
      const routeDescription = this.routeDescriptions[i] ? this.routeDescriptions[i] + ": " : "";
      if (isLast(i)) {
        result += lastLinePrefix + routeDescription + p.describeSelf(innerPrefixForTheLastOne);
      } else {
        result += linePrefix + routeDescription + p.describeSelf(innerPrefix) + "\n";
      }
    });
    return result;
  }

  onEmit(LogRecord: LogRecord, parentContext: Context): void {
    this.seriesofProcessors.forEach((processor) => processor.onEmit(LogRecord, parentContext));
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

function printList(prefix: string, list: Array<string>): string {
  const linePrefix = prefix + " ┣ ";
  const lastLinePrefix = prefix + " ┗ ";
  const isLast = (i: number) => i === list.length - 1;
  return list.map((p, i) => (isLast(i) ? lastLinePrefix : linePrefix) + p).join("\n");
}

class ProcessorThatInsertsAttributes implements SelfDescribingLogRecordProcessor {
  constructor(private readonly attributes: Attributes) {}
  describeSelf(prefix: string): string {
    return (
      "I add fields to the LogRecord: \n" +
      printList(
        prefix,
        Object.entries(this.attributes).map(([k, v]) => k + "=" + v?.toString())
      )
    );
  }
  onEmit(LogRecord: LogRecord, _parentContext: Context): void {
    LogRecord.setAttributes(this.attributes);
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

  describeSelf(prefixForLinesAfterTheFirst: string): string {
    return (
      "I filter LogRecords, choosing " +
      this.params.filterDescription +
      "\n" +
      prefixForLinesAfterTheFirst +
      " ┗ " +
      this.params.downstream.describeSelf(prefixForLinesAfterTheFirst + "   ")
    );
  }

  onEmit(LogRecord: LogRecord, parentContext: Context): void {
    if (this.params.filter(LogRecord)) {
      this.params.downstream.onEmit(LogRecord, parentContext);
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
  describeSelf(prefixForLinesAfterTheFirst: string): string {
    return (
      "I copy LogRecords, evilly\n" +
      prefixForLinesAfterTheFirst +
      " ┗ " +
      `So far I have copied ${this.copyCount} LogRecords`
    );
  }

  private copyCount = 0;

  private copyLogRecord(logRecord: LogRecord, itsContext: Context) {
    this.copyCount++;
    const itsLibraryName = logRecord.instrumentationScope.name;
    const attributes: logsAPI.LogAttributes = logRecord.attributes;
    attributes[ATTRIBUTE_NAME_FOR_COPIES] = true;
    logsAPI.logs.getLogger(itsLibraryName).emit({
      ...logRecord,
      attributes,
    });
    logRecord.setAttribute(ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS, true); // note this, it may be useful
  }

  onEmit(LogRecord: LogRecord, parentContext: Context): void {
    if (LogRecord.attributes[ATTRIBUTE_NAME_FOR_COPIES]) {
      return; // don't copy copies
    }
    this.copyLogRecord(LogRecord, parentContext);
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
    this.emittedLogRecords.forEach(([LogRecord, parentContext]) => other.onEmit(LogRecord, parentContext));
    this.emittedLogRecords = []; // make sure we don't hold a reference to a pile of LogRecords forever.
  }

  describeSelf(prefixForLinesAfterTheFirst: string): string {
    return (
      "I hold on to LogRecords\n" +
      prefixForLinesAfterTheFirst +
      " ┗ " +
      `${this.emittedLogRecords.length} emitted LogRecords`
    );
  }
  onEmit(LogRecord: LogRecord, parentContext: Context): void {
    this.emittedLogRecords.push([LogRecord, parentContext]);
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

  describeSelf(indent: string): string {
    const describePast =
      this.firstDownstream === this.currentDownstream
        ? ""
        : indent + " ┣ " + "Previously sent to: " + this.firstDownstream.describeSelf(indent + " ┃ ") + "\n";
    return (
      "I am a switcher.\n" +
      describePast +
      indent +
      " ┗ " +
      " Now sending to: " +
      this.currentDownstream.describeSelf(indent + "   ")
    );
  }

  constructor(private readonly firstDownstream: HoldingLogRecordProcessor) {
    this.currentDownstream = firstDownstream;
  }
  forceFlush(): Promise<void> {
    return this.currentDownstream.forceFlush();
  }
  onEmit(LogRecord: LogRecord, parentContext: Context): void {
    this.currentDownstream.onEmit(LogRecord, parentContext);
  }
  shutdown(): Promise<void> {
    return this.currentDownstream.shutdown();
  }
}
