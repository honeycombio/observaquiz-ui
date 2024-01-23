import { ActiveLifecycleSpanType } from "./activeLifecycleSpan";
import { trace, Span, SpanStatusCode } from "@opentelemetry/api";

type ThingWithTheHeaders = {
  fetchHeaders: Record<string, string>;
};

export function fetchFromBackend(
  span: ActiveLifecycleSpanType,
  honeycombTeam: ThingWithTheHeaders,
  method: string,
  url: string,
  body: string
): Promise<Response> {
  return span.inSpanAsync(
    "fetch from backend",
    { "request.url": url, "http.method": method, "request.body": body },
    () =>
      fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...honeycombTeam.fetchHeaders,
        },
        body,
      }).then((response) => {
        const span = trace.getActiveSpan();
        span?.setAttributes({
          "response.headers": getTheStupidHeaders(response),
          "response.status_code": response.status,
          "response.status_text": response.statusText,
        });
        if (!response.ok) {
          span?.setStatus({ code: SpanStatusCode.ERROR, message: response.statusText });
        }
        const tracechild = response.headers.get("x-tracechild");
        addSpanLink(tracechild, url);
        return response;
      })
  );
}

const tracer = trace.getTracer("I wish we could add span links to an existing span");

function getTheStupidHeaders(response: Response) {
  const headersObj: { [key: string]: string } = {};
  response.headers.forEach((value, name) => {
    headersObj[name] = value;
  });
  return JSON.stringify(headersObj);
}

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
      tracer.startSpan("links to backend span", { links: [{ context: to, attributes: { url: url } }] }).end();
    }
  }
}
