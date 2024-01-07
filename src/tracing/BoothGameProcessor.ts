import { Span, ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Context } from "@opentelemetry/api";

export class BoothGameProcessor implements SpanProcessor {
  constructor(private readonly normalProcessor: SpanProcessor) {}

  forceFlush(): Promise<void> {
    return this.normalProcessor.forceFlush();
  }
  onStart(span: Span, parentContext: Context): void {
    console.log("BoothGameProcessor.onStart", span);
    this.normalProcessor.onStart(span, parentContext);
  }
  onEnd(span: ReadableSpan): void {
    console.log("BoothGameProcessor.onEnd", span);
    this.normalProcessor.onEnd(span);
  }
  shutdown(): Promise<void> {
    console.log("BoothGameProcessor.shutdown");
    return this.normalProcessor.shutdown();
  }
}
