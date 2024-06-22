import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

/**
 * A custom SpanExporter that wraps a number of other exporters and calls export and shutdown
 * for each when.
 *
 * @remarks Not for production use.
 */
export class CompositeSpanExporter implements SpanExporter {
  private _exporters: SpanExporter[];

  constructor(exporters: SpanExporter[]) {
    this._exporters = exporters;
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    this._exporters.forEach((exporter) => exporter.export(spans, resultCallback));
    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  async shutdown(): Promise<void> {
    const results: Promise<void>[] = [];
    this._exporters.forEach((exporter) => results.push(exporter.shutdown()));
    await Promise.all(results);
  }
}


/**
 * A custom SpanExporter that wraps a number of other exporters and calls export and shutdown
 * for each when.
 *
 * @remarks Not for production use.
 */
export class CompositeLogExporter implements LogRecordExporter {
  private _exporters: LogRecordExporter[];

  constructor(exporters: LogRecordExporter[]) {
    this._exporters = exporters;
  }

  export(spans: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void {
    this._exporters.forEach((exporter) => exporter.export(spans, resultCallback));
    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  async shutdown(): Promise<void> {
    const results: Promise<void>[] = [];
    this._exporters.forEach((exporter) => results.push(exporter.shutdown()));
    await Promise.all(results);
  }
}