// It is real tracing for a fake backend
// i don't want the name of the file to be confusing

/*instrumentation.ts*/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { TextMapPropagator, Context } from "@opentelemetry/api";

// I copied this from the api source. There must be a better way to turn off propagation
class NoopTextMapPropagator implements TextMapPropagator {
  /** Noop inject function does nothing */
  inject(_context: Context, _carrier: unknown): void { }
  /** Noop extract function does nothing and returns the input context */
  extract(context: Context, _carrier: unknown): Context {
    return context;
  }
  fields(): string[] {
    return [];
  }
}
const sdk = new NodeSDK({
  textMapPropagator: new NoopTextMapPropagator(),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
    }),
  ],
});

console.log("starting sdk");
sdk.start();

