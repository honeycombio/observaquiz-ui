import {
  WebTracerProvider,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-web";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from "@opentelemetry/resources";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import * as logsAPI from "@opentelemetry/api-logs";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import {
  HONEYCOMB_DATASET_NAME,
  TracingTeam,
  honeycombTelemetryUrl,
  LearnTeam,
} from "./TracingDestination";
import {
  CombineSpanAndLogProcessor,
  ConstructThePipeline,
  DiagnosticsOnlyExporter,
} from "./ObservaquizSpanProcessor";
import { BUILD_INFO } from "./build_info.tmp";
import { ConfigurationType } from "../Configuration";
import {
  CompositeLogExporter,
  CompositeSpanExporter,
} from "./composite-exporter";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const serviceName = HONEYCOMB_DATASET_NAME;
const collectorUrl = "/";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

const buildInfo = BUILD_INFO || {};
console.log("build stamp: ", buildInfo["build.uuid"]);

const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: serviceName,
  "browser.user_agent": window.navigator.userAgent,
  "browser.language": window.navigator.language,
  "browser.url": window.location.href,
  "http.url": window.location.href,
  ...buildInfo,
});

function initializeTracing(config: ConfigurationType) {
  const tracerProvider = new WebTracerProvider({
    resource,
  });

  const devrelSpanExporter = new CompositeSpanExporter(
    [
      config.diagnostics_for_spans &&
        new DiagnosticsOnlyExporter("DevRel Team Spans"),
      config.send_spans &&
        new OTLPTraceExporter({ url: collectorUrl + "v1/traces" }),
    ]
      .filter((a) => !!a)
      .map((a) => a as any)
  ); // remove falses
  const devRelSpanProcessor = new BatchSpanProcessor(devrelSpanExporter, {
    scheduledDelayMillis: 1000,
  });

  const devrelLogExporter = new CompositeLogExporter(
    [
      config.diagnostics_for_spans &&
        new DiagnosticsOnlyExporter("DevRel Team Logs"),
      config.send_spans &&
        new OTLPLogExporter({ url: collectorUrl + "v1/logs" }),
    ]
      .filter((a) => !!a)
      .map((a) => a as any)
  ); // remove falses
  const devRelLogProcessor = new BatchLogRecordProcessor(devrelLogExporter, {
    scheduledDelayMillis: 1000,
  });

  const exportToDevrelTeam = CombineSpanAndLogProcessor(
    devRelSpanProcessor,
    devRelLogProcessor
  );

  const participantSpanAndLogProcessor = (team: TracingTeam) => {
    // alternative participantSpanProcessor... but it's gonna have the wrong name in its diagnostics
    // const addParticipantApiKeyAndSendToOurCollector = constructExporterThatAddsApiKey(devrelSpanProcessor)

    // these are exporters, because i want the printing to happen after the batching.
    const spanExporter = new CompositeSpanExporter(
      [
        config.diagnostics_for_spans &&
          new DiagnosticsOnlyExporter("Participant Team Spans"),
        config.send_spans &&
          new OTLPTraceExporter({
            url: honeycombTelemetryUrl(team.auth!.region) + "/v1/traces",
            headers: { "x-honeycomb-team": team.auth!.apiKey },
          }),
      ]
        .filter((a) => !!a)
        .map((a) => a as any)
    );
    const spanProcessor = new BatchSpanProcessor(spanExporter, {
      scheduledDelayMillis: 1000,
    });

    const logExporter = new CompositeLogExporter(
      [
        config.diagnostics_for_spans &&
          new DiagnosticsOnlyExporter("Participant Team Logs"),
        config.send_spans &&
          new OTLPLogExporter({
            url: honeycombTelemetryUrl(team.auth!.region) + "/v1/logs",
            headers: { "x-honeycomb-team": team.auth!.apiKey },
          }),
      ]
        .filter((a) => !!a)
        .map((a) => a as any)
    );
    const logProcessor = new BatchLogRecordProcessor(logExporter, {
      scheduledDelayMillis: 1000,
    });

    return CombineSpanAndLogProcessor(spanProcessor, logProcessor);
  };

  const { learnerOfTeam, observaquizProcessor } = ConstructThePipeline({
    devrelExporter: exportToDevrelTeam,
    devrelExporterDescription: "Batch OTLP over HTTP to DevRel team",
    processorForTeam: participantSpanAndLogProcessor,
  });

  console.log(observaquizProcessor.describeSelf());

  tracerProvider.addSpanProcessor(observaquizProcessor);

  tracerProvider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation(),
    ],
  });

  console.log("Tracing initialized, version l");

  const loggerProvider = new LoggerProvider({
    resource,
  });
  loggerProvider.addLogRecordProcessor(observaquizProcessor);
  logsAPI.logs.setGlobalLoggerProvider(loggerProvider);
  console.log("Logging initialized");

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
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: "Unhandled Promise Rejection",
    });
    span.end();
  });
}

export function initializeTelemetry(
  configuration: ConfigurationType
): LearnTeam {
  const { learnerOfTeam, observaquizProcessor } =
    initializeTracing(configuration);
  instrumentGlobalErrors();

  const learnTeam: LearnTeam = {
    learnParticipantTeam(team: TracingTeam) {
      learnerOfTeam.learnParticipantTeam(team);
      // you want to see it! it has reconfigured, see.
      console.log(observaquizProcessor.describeSelf());
    },

    reset() {
      learnerOfTeam.reset();
      console.log("After reset:");
      console.log(observaquizProcessor.describeSelf());
    },
  };
  return learnTeam;
}
