// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { Context } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-web";
import SessionGateway from "./SessionGateway";

const { sessionId } = SessionGateway.getSession();
const SESSION_ID_ATTRIBUTE = "session.id";
const HONEYCOMB_APIKEY_ATTRIBUTE = "app.honeycomb_api_key";
const HONEYCOMB_TEAM_ATTRIBUTE = "session.honeycomb.team_slug";
const HONEYCOMB_ENV_ATTRIBUTE = "session.honeycomb.environment_slug";

export class SessionIdProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onStart(span: Span, parentContext: Context): void {
    span.setAttribute(SESSION_ID_ATTRIBUTE, sessionId);
    // these next ones may not be present at the beginning
    const { apiKey, teamSlug, environmentSlug } = SessionGateway.getSession(); // TODO: don't go to local storage every time. These don't change once they're populated
    span.setAttribute(HONEYCOMB_APIKEY_ATTRIBUTE, apiKey);
    span.setAttribute(HONEYCOMB_TEAM_ATTRIBUTE, teamSlug);
    span.setAttribute(HONEYCOMB_ENV_ATTRIBUTE, environmentSlug);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  onEnd(span: ReadableSpan): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
