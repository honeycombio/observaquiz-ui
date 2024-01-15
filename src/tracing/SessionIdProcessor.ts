// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { Context } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-web";
import SessionGateway from "./SessionGateway";
import { LogRecord, LogRecordProcessor } from "@opentelemetry/sdk-logs";

const { sessionId } = SessionGateway.getSession();
const SESSION_ID_ATTRIBUTE = "session.id";

export class SessionIdProcessor implements SpanProcessor {
  onStart(span: Span, _parentContext: Context): void {
    span.setAttribute(SESSION_ID_ATTRIBUTE, sessionId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  onEnd(span: ReadableSpan): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

export class SessionIdLogProcessor implements LogRecordProcessor {
  onEmit(span: LogRecord, _parentContext: Context): void {
    span.setAttribute(SESSION_ID_ATTRIBUTE, sessionId);
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}
