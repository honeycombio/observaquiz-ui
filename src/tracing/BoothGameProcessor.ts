import { Span, ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";

export class BoothGameProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  onStart(span: Span): void {
    console.log("BoothGameProcessor.onStart", span);
  }
  onEnd(span: ReadableSpan): void {
    console.log("BoothGameProcessor.onEnd", span);
  }
  shutdown(): Promise<void> {
    console.log("BoothGameProcessor.shutdown");
    return Promise.resolve();
  }
}
