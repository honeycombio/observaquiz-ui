import { Span, ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Context } from "@opentelemetry/api";
import { HONEYCOMB_DATASET_NAME, HoneycombRegion } from "./TracingDestination";

export type BoothGameCustomerTeam = {
  region: HoneycombRegion;
  team: { slug: string };
  environment: { slug: string };
  apiKey: string;
};

export class BoothGameProcessor implements SpanProcessor {
  private customerTeam?: BoothGameCustomerTeam = undefined;

  learnCustomerTeam(customerTeam: BoothGameCustomerTeam) {
    if (this.customerTeam && this.customerTeam?.apiKey != customerTeam.apiKey) {
      throw new Error("You can only set the customer team once");
    }
    this.customerTeam = customerTeam;
  }

  clearCustomerTeam() {
    this.customerTeam = undefined;
  }

  constructor(private readonly normalProcessor: SpanProcessor, private readonly spinUpCustomerProcessor: (apikey: string) => SpanProcessor) {}

  forceFlush(): Promise<void> {
    return this.normalProcessor.forceFlush();
  }
  onStart(span: Span, parentContext: Context): void {
    if (this.customerTeam) {
      span.setAttribute("honeycomb.region", this.customerTeam.region);
      span.setAttribute("honeycomb.team.slug", this.customerTeam.team.slug);
      span.setAttribute("honeycomb.env.slug", this.customerTeam.environment.slug);
    }
    span.setAttribute("honeycomb.dataset", HONEYCOMB_DATASET_NAME); // should we be pulling the service name off the resource?
    span.setAttribute("boothGame.telemetry.destination", "devrel");
    this.normalProcessor.onStart(span, parentContext);
  }
  onEnd(span: ReadableSpan): void {
    this.normalProcessor.onEnd(span);
  }
  shutdown(): Promise<void> {
    return this.normalProcessor.shutdown();
  }
}
