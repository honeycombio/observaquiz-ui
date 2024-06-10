import { WebTracerProvider, BatchSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-web";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { configureCompositeExporter } from "./composite-exporter";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import * as logsAPI from "@opentelemetry/api-logs";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { HONEYCOMB_DATASET_NAME, TracingTeam, honeycombTelemetryUrl } from "./TracingDestination";
import { ConstructThePipeline } from "./ObservaquizSpanProcessor";
import { ConstructLogPipeline } from "./ObservaquizLogProcessor";
import { BUILD_INFO } from "./build_info.tmp";

const serviceName = HONEYCOMB_DATASET_NAME;
const collectorUrl = "/v1/traces";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const buildInfo = BUILD_INFO || {};
console.log("build stamp: ", buildInfo["build.uuid"]);

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  "browser.user_agent": window.navigator.userAgent,
  "browser.language": window.navigator.language,
  "browser.url": window.location.href,
  "http.url": window.location.href,
  ...buildInfo,
});

function initializeTracing() {
  const provider = new WebTracerProvider({
    resource,
  });

  const exporter = configureCompositeExporter([
    new OTLPTraceExporter({ url: collectorUrl }),
    // new ConsoleSpanExporter(),
  ]);


  const exportToDevrelTeam = new BatchSpanProcessor(exporter, {
    scheduledDelayMillis: 1000,
  });

  const exportDirectlyToTheirTeam = (team: TracingTeam) => {
    const exporter = new OTLPTraceExporter({
      url: honeycombTelemetryUrl(team.auth!.region) + "/v1/traces",
      headers: { "x-honeycomb-team": team.auth!.apiKey },
    });
    return new BatchSpanProcessor(exporter, {
      scheduledDelayMillis: 1000,
    });
  };

  const { learnerOfTeam, observaquizProcessor } = ConstructThePipeline({
    devrelExporter: exportToDevrelTeam,
    devrelExporterDescription: "Batch OTLP over HTTP to /v1/traces",
    processorForTeam: exportDirectlyToTheirTeam,
  });

  console.log(observaquizProcessor.describeSelf());

  provider.addSpanProcessor(observaquizProcessor);

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [new DocumentLoadInstrumentation(), new FetchInstrumentation()],
  });

  console.log("Tracing initialized, version l");

  return { learnerOfTeam, observaquizProcessor };
}

function initializeLogging() {
  // To start a logger, you first need to initialize the Logger provider.
  const loggerProvider = new LoggerProvider({
    resource,
  });

  const normalProcessor = new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: "/v1/logs",
      // headers: {
      //   "X-Honeycomb-Team": process.env.HONEYCOMB_API_KEY,
      // },
    }),
    { scheduledDelayMillis: 500 }
  );

  const processorForTeam = (team: TracingTeam) => {
    const exporter = new OTLPLogExporter({
      url: honeycombTelemetryUrl(team.auth!.region) + "/v1/logs",
      headers: { "x-honeycomb-team": team.auth!.apiKey },
    });
    return new BatchLogRecordProcessor(exporter, { scheduledDelayMillis: 500 });
  };

  const { learnerOfTeam, observaquizProcessor } = ConstructLogPipeline({
    normalProcessor,
    normalProcessorDescription: "Batch OTLP over HTTP to /v1/logs",
    processorForTeam,
  });

  console.log(observaquizProcessor.describeSelf());

  loggerProvider.addLogRecordProcessor(observaquizProcessor);
  logsAPI.logs.setGlobalLoggerProvider(loggerProvider);

  return { learnerOfTeam, observaquizProcessor };
}

function instrumentGlobalErrors() {
  const tracer = trace.getTracer("@jessitron/errors");
  window.addEventListener("error", (e) => {
    const span = tracer.startSpan("Error on page");
    span.setAttributes({
      error: true,
      "error.type": "global script error",
      "error.message": e.message,
      "error.stack": e.error?.stack,
      "error.filename": e.filename,
      "error.line_number": e.lineno,
      "error.column_number": e.colno,
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: "Global Error" });
    span.end();
  });
  window.addEventListener("unhandledrejection", (e) => {
    const span = tracer.startSpan("Error on page", {
      attributes: {
        error: true,
        "error.type": "unhandledrejection",
        "error.message": e.reason.message,
        "error.stack": e.reason.stack,
        "error.filename": e.reason.filename,
        "error.line_number": e.reason.lineno,
        "error.column_number": e.reason.colno,
      },
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: "Unhandled Promise Rejection" });
    span.end();
  });
}

const { learnerOfTeam, observaquizProcessor } = initializeTracing();
const logInit = initializeLogging();
instrumentGlobalErrors();

export function learnTeam(team: TracingTeam) {
  learnerOfTeam.learnCustomerTeam(team);
  logInit.learnerOfTeam.learnCustomerTeam(team);
  // you want to see it, it has reconfigured, see.
  console.log(observaquizProcessor.describeSelf());
  console.log(logInit.observaquizProcessor.describeSelf());
}
