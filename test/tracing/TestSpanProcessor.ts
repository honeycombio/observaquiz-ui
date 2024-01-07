import { Context } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";

export class TestSpanProcessor implements SpanProcessor {
  public wasShutdown: boolean = false;
  public wasForceFlushed: boolean = false;

  startedSpans: Array<[Span, Context]> = [];
  endedSpans: ReadableSpan[] = [];

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
