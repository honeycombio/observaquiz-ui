import { ReadableSpan, SpanProcessor, Span as TraceBaseSpan } from "@opentelemetry/sdk-trace-base";
import { Context, trace, Span, HrTime } from "@opentelemetry/api";
import { HONEYCOMB_DATASET_NAME, HoneycombRegion } from "./TracingDestination";
import { logs as logApi, SeverityNumber } from "@opentelemetry/api-logs";

export type BoothGameCustomerTeam = {
  region: HoneycombRegion;
  team: { slug: string };
  environment: { slug: string };
  apiKey: string;
};

type DoubleSendState = {
  copy: Span;
  started: boolean;
  onStartSpan?: TraceBaseSpan; // populated if we got the copy in onStart, but didn't have the customer team yet
  onStartParentContext?: Context; // ditto
  endTime?: HrTime; // populated if we got the original span in onEnd, but didn't have the customer team yet
};

export const BOOTH_GAME_TELEMETRY_DESTINATION = "boothGame.telemetry.destination";

const ownLogger = logApi.getLogger("booth game processor");

function warn(message: string) {
  ownLogger.emit({
    body: message,
    severityText: "warning",
    severityNumber: SeverityNumber.WARN,
  });
}

type SpanId = string;

export class BoothGameProcessor implements SpanProcessor {
  private customerTeam?: BoothGameCustomerTeam = undefined;
  private customerSpanProcessor?: SpanProcessor = undefined;

  private openSpanCopies: Record<SpanId, DoubleSendState> = {};

  constructor(
    private readonly normalProcessor: SpanProcessor,
    private readonly spinUpCustomerProcessor: (apikey: string) => SpanProcessor
  ) {}

  learnCustomerTeam(customerTeam: BoothGameCustomerTeam) {
    if (this.customerTeam && this.customerTeam?.apiKey != customerTeam.apiKey) {
      throw new Error("You can only set the customer team once");
    }
    this.customerTeam = customerTeam;
    this.customerSpanProcessor = this.spinUpCustomerProcessor(customerTeam.apiKey);
    this.sendAnySpansThatWereWaitingForCustomerTeam();
  }

  sendAnySpansThatWereWaitingForCustomerTeam() {
    for (const spanId in this.openSpanCopies) {
      const copyState = this.openSpanCopies[spanId];
      if (!copyState.started && copyState.onStartSpan && copyState.onStartParentContext) {
        // god there are so many weird state edge cases
        this.customerSpanProcessor?.onStart(copyState.onStartSpan, copyState.onStartParentContext);
        copyState.started = true;
        copyState.onStartSpan = undefined;
        copyState.onStartParentContext = undefined;
      }
      if (copyState.endTime) {
        copyState.copy.end(copyState.endTime);
      }
    }
  }

  clearCustomerTeam() {
    this.customerTeam = undefined;
    const goodbyeOldCustomerSpanProcessor = this.customerSpanProcessor;
    this.customerSpanProcessor = undefined;
    // seems like a good idea to do this now, asynchronously:
    goodbyeOldCustomerSpanProcessor?.forceFlush().then(() => goodbyeOldCustomerSpanProcessor?.shutdown());
  }

  forceFlush(): Promise<void> {
    this.customerSpanProcessor?.forceFlush(); // if it's around
    return this.normalProcessor.forceFlush();
  }

  onStart(span: TraceBaseSpan, parentContext: Context): void {
    console.log("span received with attributes", JSON.stringify(span.attributes));
    if (span.attributes[BOOTH_GAME_TELEMETRY_DESTINATION] === "customer") {
      const copy = this.openSpanCopies[span.spanContext().spanId];
      if (!copy) {
        warn("In onStart, no copy found of span " + JSON.stringify(span.spanContext()));
        return;
      }
      if (this.customerSpanProcessor) {
        this.customerSpanProcessor.onStart(span, parentContext);
        copy.started = true;
      } else {
        copy.onStartSpan = span;
        copy.onStartParentContext = parentContext;
      }
      return;
    }

    if (this.customerTeam) {
      span.setAttribute("honeycomb.region", this.customerTeam.region);
      span.setAttribute("honeycomb.team.slug", this.customerTeam.team.slug);
      span.setAttribute("honeycomb.env.slug", this.customerTeam.environment.slug);
    }
    span.setAttribute("honeycomb.dataset", HONEYCOMB_DATASET_NAME); // should we be pulling the service name off the resource?

    // at this point, it is time to copy the span for the customer team.
    // it will come back through here, and we will process it as a customer span.
    // When its corresponding `span` ends, we will end `copy`.
    const copy = this.copySpanToCustomerTeam(span, parentContext);
    this.openSpanCopies[span.spanContext().spanId] = { copy, started: false };

    // now the original gets to go on its way, marked as such
    span.setAttribute(BOOTH_GAME_TELEMETRY_DESTINATION, "devrel");
    this.normalProcessor.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    if (span.attributes[BOOTH_GAME_TELEMETRY_DESTINATION] === "customer") {
      // it has looped back around, send it on
      if (this.customerSpanProcessor) {
        this.customerSpanProcessor.onEnd(span);
      } else {
        warn("No customer span processor for the end of span" + JSON.stringify(span.spanContext()));
      }
      delete this.openSpanCopies[span.spanContext().spanId];
      return;
    }
    this.normalProcessor.onEnd(span);
    const copyState = this.openSpanCopies[span.spanContext().spanId];
    if (!copyState) {
      warn("No copy found of span " + JSON.stringify(span.spanContext()));
      return;
    }
    // TODO: copy any additions to the span since we copied it
    if (copyState.started) {
      // good, we can end it
      this.openSpanCopies[span.spanContext().spanId].copy.end(span.endTime);
    } else {
      // record that it is ready to be ended
      copyState.endTime = span.endTime;
    }
  }

  shutdown(): Promise<void> {
    this.customerSpanProcessor?.shutdown(); // if it's around
    return this.normalProcessor.shutdown();
  }

  copySpanToCustomerTeam(span: TraceBaseSpan, itsContext: Context) {
    // start by just sending it
    const itsLibraryName = span.instrumentationLibrary.name;
    const copy: Span = trace.getTracer(itsLibraryName).startSpan(
      span.name,
      {
        kind: span.kind,
        startTime: span.startTime,
        attributes: { ...span.attributes, "boothGame.telemetry.destination": "customer" },
        links: [...span.links],
      },
      itsContext
    );
    // now the cheaty bit. Good thing this is JavaScript.
    copy.spanContext().spanId = span.spanContext().spanId;
    copy.spanContext().traceId = span.spanContext().traceId; // should be the same already except on the root span
    return copy;
  }
}
