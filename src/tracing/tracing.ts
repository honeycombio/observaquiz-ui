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
import { SessionIdProcessor } from "./SessionIdProcessor";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import * as logsAPI from "@opentelemetry/api-logs";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { HONEYCOMB_DATASET_NAME, TracingTeam, honeycombTelemetryUrl } from "./TracingDestination";
import { BaggageSpanProcessor } from "./BaggageSpanProcessor";
import { ConstructThePipeline } from "./BoothGameSpanProcessor";
import { ConstructLogPipeline } from "./BoothGameLogProcessor";

const serviceName = HONEYCOMB_DATASET_NAME;
const collectorUrl = "/v1/traces";

type WindowWithBuildInfo = typeof window & { BUILD_INFO?: Record<string, string> };

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const buildInfo = (window as WindowWithBuildInfo)?.BUILD_INFO || {};

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

  // i observe that span processors are not singular, they all get to operate on it.
  // I think the BaggageSpanProcessor could operate here, and not have to incorporate the batch processor.
  provider.addSpanProcessor(new SessionIdProcessor());

  provider.addSpanProcessor(new BaggageSpanProcessor());

  const normalProcessor = new BatchSpanProcessor(exporter, {
    scheduledDelayMillis: 1000,
  });

  const processorForTeam = (team: TracingTeam) => {
    const exporter = new OTLPTraceExporter({
      url: honeycombTelemetryUrl(team.region) + "/v1/traces",
      headers: { "x-honeycomb-team": team.apiKey },
    });
    return new BatchSpanProcessor(exporter, {
      scheduledDelayMillis: 1000,
    });
  };

  const { learnerOfTeam, boothGameProcessor } = ConstructThePipeline({
    normalProcessor,
    normalProcessorDescription: "Batch OTLP over HTTP to /v1/traces",
    processorForTeam,
  });

  console.log(boothGameProcessor.describeSelf(""));

  provider.addSpanProcessor(boothGameProcessor);

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [new DocumentLoadInstrumentation(), new FetchInstrumentation()],
  });

  console.log("Tracing initialized, version j");

  return { learnerOfTeam, boothGameProcessor };
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
      url: honeycombTelemetryUrl(team.region) + "/v1/logs",
      headers: { "x-honeycomb-team": team.apiKey },
    });
    return new BatchLogRecordProcessor(exporter, { scheduledDelayMillis: 500 });
  };

  const { learnerOfTeam, boothGameProcessor } = ConstructLogPipeline({
    normalProcessor,
    normalProcessorDescription: "Batch OTLP over HTTP to /v1/logs",
    processorForTeam,
  });

  console.log(boothGameProcessor.describeSelf(""));

  loggerProvider.addLogRecordProcessor(boothGameProcessor);
  logsAPI.logs.setGlobalLoggerProvider(loggerProvider);

  return { learnerOfTeam, boothGameProcessor };
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

function sendTestSpan() {
  const span = trace.getTracer("test span").startSpan("test span");
  console.log("Sending test span", span.spanContext());
  span.end();
}

const { learnerOfTeam, boothGameProcessor } = initializeTracing();
const logInit = initializeLogging();
instrumentGlobalErrors();

export function learnTeam(team: TracingTeam) {
  learnerOfTeam.learnCustomerTeam(team);
  logInit.learnerOfTeam.learnCustomerTeam(team);
  // you want to see it, it has reconfigured, see.
  console.log(boothGameProcessor.describeSelf(""));
  console.log(logInit.boothGameProcessor.describeSelf(""));
}
