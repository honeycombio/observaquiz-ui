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
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";

export class TestSpanProcessor implements SpanProcessor {
  public wasShutdown: boolean = false;
  public wasForceFlushed: boolean = false;

  startedSpans: Array<[Span, Context]> = [];
  endedSpans: ReadableSpan[] = [];
  onlyStartedSpan() {
    if (this.startedSpans.length != 1) {
      throw new Error("Expected exactly one started span, had " + this.startedSpans.length);
    }
    return this.startedSpans[0][0];
  }
  onlyEndedSpan() {
    if (this.startedSpans.length != 1) {
      throw new Error("Expected exactly one started span, had " + this.startedSpans.length);
    }
    return this.endedSpans[0];
  }
  clearMemory() {
    this.startedSpans = [];
    this.endedSpans = [];
  }

  forceFlush(): Promise<void> {
    this.wasForceFlushed = true;
    return Promise.resolve();
  }
  onStart(span: Span, parentContext: Context): void {
    this.startedSpans.push([span, parentContext]);
  }
  onEnd(span: ReadableSpan): void {
    this.endedSpans.push(span);
  }
  shutdown(): Promise<void> {
    this.wasShutdown = true;
    return Promise.resolve();
  }
}
