import { ActiveLifecycleSpanType } from "../tracing/ComponentLifecycleTracing";

export type AuthResponse =
  | { result: "ok"; response: HoneycombAuthResponse }
  | { result: "denied" }
  | { result: "error"; message?: string };

type HoneycombAuthResponse = {
  api_key_access: {
    events: boolean;
    markers: boolean;
    createDatasets: boolean;
  };
  environment: {
    name: string;
    slug: string;
  };
  team: {
    name: string;
    slug: string;
  };
};

function convertHoneycombAuthResponse(json: unknown): AuthResponse {
  const response = json as HoneycombAuthResponse;
  if (!response.team?.slug) {
    return { result: "error", message: "team missing from response" };
  }
  if (!response.environment?.slug) {
    return { result: "error", message: "environment missing from response" };
  }
  return { result: "ok", response };
}

export async function callHoneycombAuthEndpoint(
  honeycomb_auth_url: string,
  apiKey: string,
  span: ActiveLifecycleSpanType
): Promise<AuthResponse> {
  span.setAttributes({ "app.honeycomb.apiKey": apiKey });
  return fetch(honeycomb_auth_url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Honeycomb-Team": apiKey,
    },
  })
    .then((response): Promise<AuthResponse> => {
      console.log("Response: ", response);
      span.setAttributes({
        "app.honeycomb.authResponse": JSON.stringify(response),
        "app.honeycomb.authStatus": response.status,
      });

      if (response.ok) {
        return response.json().then((json) => {
          console.log("auth JSON: ", json);
          span.setAttributes({ "app.honeycomb.auth.json": json });
          return convertHoneycombAuthResponse(json);
        });
      }
      if (response.status === 401) {
        const returnMe: AuthResponse = { result: "denied" };
        return Promise.resolve(returnMe);
      }
      const returnMe: AuthResponse = { result: "error" };
      return Promise.resolve(returnMe);
    })
    .catch((error) => {
      console.log("Error: ", error);
      span.addLog("error during auth", {
        "app.honeycomb.authError": error.message,
      });
      const returnMe: AuthResponse = { result: "error" };
      return returnMe;
    });
}
