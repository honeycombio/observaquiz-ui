import { ActiveLifecycleSpanType } from "./activeLifecycleSpan";

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
      })
    )
}
