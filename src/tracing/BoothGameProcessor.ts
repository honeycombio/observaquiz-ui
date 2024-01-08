import { ReadableSpan, SpanProcessor, Span as TraceBaseSpan } from "@opentelemetry/sdk-trace-base";
import { Context, trace, Span } from "@opentelemetry/api";
import { HONEYCOMB_DATASET_NAME, HoneycombRegion } from "./TracingDestination";

export type BoothGameCustomerTeam = {
  region: HoneycombRegion;
  team: { slug: string };
  environment: { slug: string };
  apiKey: string;
};

export const BOOTH_GAME_TELEMETRY_DESTINATION = "boothGame.telemetry.destination";

export class BoothGameProcessor implements SpanProcessor {
  private customerTeam?: BoothGameCustomerTeam = undefined;
  private customerSpanProcessor?: SpanProcessor = undefined;

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
      this.customerSpanProcessor?.onStart(span, parentContext);
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

    // now the original gets to go on its way, marked as such
    span.setAttribute(BOOTH_GAME_TELEMETRY_DESTINATION, "devrel");
    this.normalProcessor.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    this.normalProcessor.onEnd(span);
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
    return copy;
  }
}
