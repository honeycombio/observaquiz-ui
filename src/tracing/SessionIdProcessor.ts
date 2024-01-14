// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { Context } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-web";
import SessionGateway from "./SessionGateway";

const { sessionId } = SessionGateway.getSession();
const SESSION_ID_ATTRIBUTE = "session.id";

export class SessionIdProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onStart(span: Span, parentContext: Context): void {
    span.setAttribute(SESSION_ID_ATTRIBUTE, sessionId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  onEnd(span: ReadableSpan): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
