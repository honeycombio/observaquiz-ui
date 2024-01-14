import {
  AttributeValue,
  Attributes,
  Context,
  Exception,
  SpanContext,
  SpanStatus,
  SpanStatusCode,
  TimeInput,
  SpanKind,
} from "@opentelemetry/api";
import { IResource } from "@opentelemetry/resources";
import { LogRecord } from "@opentelemetry/api-logs";
import { LogRecordProcessor } from "@opentelemetry/sdk-logs";

export class TestLogProcessor implements LogRecordProcessor {
  public wasShutdown: boolean = false;
  public wasForceFlushed: boolean = false;

  emittedLogs: Array<[LogRecord, Context]> = [];
  onlyEmittedLog() {
    if (this.emittedLogs.length != 1) {
      throw new Error("Expected exactly one emitted log, had " + this.emittedLogs.length);
    }
    return this.emittedLogs[0][0];
  }
  clearMemory() {
    this.emittedLogs = [];
  }

  forceFlush(): Promise<void> {
    this.wasForceFlushed = true;
    return Promise.resolve();
  }
  onEmit(logRecord: LogRecord, parentContext: Context): void {
    this.emittedLogs.push([logRecord, parentContext]);
  }
  shutdown(): Promise<void> {
    this.wasShutdown = true;
    return Promise.resolve();
  }
}
