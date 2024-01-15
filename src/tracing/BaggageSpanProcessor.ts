// copied from: https://github.com/honeycombio/honeycomb-opentelemetry-node/blob/1aaac3eed3c34feac39d7e41d4b23ea0c70a5d18/src/baggage-span-processor.ts

import { BatchSpanProcessor, NoopSpanProcessor, SpanExporter } from "@opentelemetry/sdk-trace-web";
import { Context, Span, propagation } from "@opentelemetry/api";
import { BufferConfig } from "@opentelemetry/sdk-trace-base";
import { LogRecord, LogRecordProcessor, NoopLogRecordProcessor } from "@opentelemetry/sdk-logs";
/**
 * A span processor that behaves like a {@link BatchSpanProcessor} with the
 * addition of {@link BaggageSpanProcessor} behavior during onStart.
 */
export class BatchWithBaggageSpanProcessor extends BatchSpanProcessor {
  private bsp: BaggageSpanProcessor;

  constructor(exporter: SpanExporter, batchConfig: BufferConfig = {}) {
    super(exporter, batchConfig);
    this.bsp = new BaggageSpanProcessor();
  }

  /**
   * Delegates to {@link BaggageSpanProcessor.onStart()}
   *
   * @param span a {@link Span} being started
   * @param parentContext the {@link Context} in which `span` was started
   */
  onStart(span: Span, parentContext: Context): void {
    this.bsp.onStart(span, parentContext);
  }
}

/**
 * The BaggageSpanProcessor reads entries stored in {@link Baggage}
 * from the parent context and adds the baggage entries' keys and
 * values to the span as attributes on span start.
 *
 * Add this span processor to a tracer provider.
 *
 * Keys and values added to Baggage will appear on subsequent child
 * spans for a trace within this service *and* be propagated to external
 * services in accordance with any configured propagation formats
 * configured. If the external services also have a Baggage span
 * processor, the keys and values will appear in those child spans as
 * well.
 *
 * ⚠ Warning ⚠️
 *
 * Do not put sensitive information in Baggage.
 *
 * To repeat: a consequence of adding data to Baggage is that the keys and
 * values will appear in all outgoing HTTP headers from the application.
 */
export class BaggageSpanProcessor extends NoopSpanProcessor {
  /**
   * Adds an attribute to the `span` for each {@link Baggage} key and {@link BaggageEntry | entry value}
   * present in the `parentContext`.
   *
   * @param span a {@link Span} being started
   * @param parentContext the {@link Context} in which `span` was started
   */
  onStart(span: Span, parentContext: Context): void {
    (propagation.getBaggage(parentContext)?.getAllEntries() ?? []).forEach((entry) => {
      span.setAttribute(entry[0], entry[1].value);
    });
  }
}

export class BaggageLogProcessor extends NoopLogRecordProcessor {
  /**
   * Adds an attribute to the `log` for each {@link Baggage} key and {@link BaggageEntry | entry value}
   * present in the `parentContext`.
   *
   * @param logRecord a {@link LogRecord} being emitted
   * @param parentContext the {@link Context} in which `logRecord` was emitted
   */
  onEmit(logRecord: LogRecord, parentContext: Context): void {
    (propagation.getBaggage(parentContext)?.getAllEntries() ?? []).forEach((entry) => {
      logRecord.setAttribute(entry[0], entry[1].value);
    });
  }
}
