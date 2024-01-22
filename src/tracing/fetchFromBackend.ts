import { ActiveLifecycleSpanType } from "./activeLifecycleSpan";
import { Attributes, SpanContext, trace } from "@opentelemetry/api";

type ThingWithTheHeaders = {
  fetchHeaders: Record<string, string>;
}

export function fetchFromBackend(span: ActiveLifecycleSpanType, 
  honeycombTeam: ThingWithTheHeaders, 
  method: string, 
  url: string, 
  body: string): Promise<Response> {
  return span
    .inContext(() =>
      fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...honeycombTeam.fetchHeaders,
        },
        body,
      }).then((response) => {
        console.log("JESS IS HERE");
        const headers = JSON.stringify(response.headers);
        trace.getActiveSpan()?.setAttribute("response.headers", headers);
        const tracechild = response.headers.get("x-tracechild");
        addSpanLink(tracechild, url);
        return response;
      }
    ))
}



const tracer = trace.getTracer("Why is adding span links so hard")

function addSpanLink(tracechild: string | null, url: string) {
  // if otel ever gets kinder and lets us add a link
  // or if hny ever supports links to traces in attributes
  // then change this to not create a useless span. 2 events into hny that should be an attribute :-(
  if (tracechild) {
    const match = tracechild.match(/-(\w+)-(\w+)-/);
    if (match) {
      const traceId = match[1];
      const spanId = match[2];
      const to = { traceId, spanId, traceFlags: 1 };
      tracer.startSpan("links to backend span", { links: [{ context: to, attributes: { "url": url}}]}).end()
    }
  }
}
