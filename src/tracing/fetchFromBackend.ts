import { ActiveLifecycleSpanType } from "./activeLifecycleSpan";
import { trace, Attributes, SpanStatusCode } from "@opentelemetry/api";

type ThingWithTheHeaders = {
  fetchHeaders: Record<string, string>;
};

/**
 * this does parse the json, jess. But it doesn't cast it to a type
 * @param params
 * @returns
 */
export function fetchFromBackend(params: {
  span: ActiveLifecycleSpanType;
  honeycombTeam: ThingWithTheHeaders;
  method: string;
  url: string;
  body?: string;
  attributesFromJson?: (json: any) => Attributes;
}): Promise<unknown> {
  const { span, honeycombTeam, method, url, body, attributesFromJson } = params;
  return span.inSpanAsync(
    "fetch from backend",
    { "request.url": url, "http.method": method, "request.body": body },
    (span) =>
      fetch("https://quiz.onlyspans.com/" + url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...honeycombTeam.fetchHeaders,
        },
        body,
      })
        .then((response) => {
          span?.setAttributes({
            "response.headers": getTheStupidHeaders(response),
            "response.status_code": response.status,
            "response.status_text": response.statusText,
            "response.header.contentType": response.headers.get("Content-Type") || "unset",
          });
          const tracechild = response.headers.get("x-tracechild");
          addSpanLink(tracechild, url);
          if (!response.ok) {
            span?.setStatus({ code: SpanStatusCode.ERROR, message: response.statusText });
            throw new Error(`Response not ok: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then((json) => {
          span?.setAttributes({
            "response.body": JSON.stringify(json),
          });
          if (attributesFromJson) {
            // should i catch errors here? yes, later
            span?.setAttributes(attributesFromJson(json));
          }
          return json;
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
