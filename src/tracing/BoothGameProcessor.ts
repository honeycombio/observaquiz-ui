import { Span, ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Context } from "@opentelemetry/api";
import { HoneycombRegion } from "./TracingDestination";

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

  constructor(private readonly normalProcessor: SpanProcessor) {}

  forceFlush(): Promise<void> {
    return this.normalProcessor.forceFlush();
  }
  onStart(span: Span, parentContext: Context): void {
    console.log("BoothGameProcessor.onStart", span);
    if (this.customerTeam) {
      span.setAttribute("honeycomb.region", this.customerTeam.region);
    }
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
