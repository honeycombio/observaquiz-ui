import {
  AttributeValue,
  Attributes,
  Context,
  Exception,
  SpanContext,
  SpanStatus,
  SpanStatusCode,
  TimeInput,
  SpanKind,
} from "@opentelemetry/api";
import { IResource } from "@opentelemetry/resources";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";

export class TestSpanProcessor implements SpanProcessor {
  public wasShutdown: boolean = false;
  public wasForceFlushed: boolean = false;

  startedSpans: Array<[Span, Context]> = [];
  endedSpans: ReadableSpan[] = [];
  onlyStartedSpan() {
    if (this.startedSpans.length != 1) {
      throw new Error("Expected exactly one started span, had " + this.startedSpans.length);
    }
    return this.startedSpans[0][0];
  }

  forceFlush(): Promise<void> {
    this.wasForceFlushed = true;
    return Promise.resolve();
  }
  onStart(span: Span, parentContext: Context): void {
    this.startedSpans.push([span, parentContext]);
  }
  onEnd(span: ReadableSpan): void {
    this.endedSpans.push(span);
  }
  shutdown(): Promise<void> {
    this.wasShutdown = true;
    return Promise.resolve();
  }
}

// could we get the SDK to give us a real one? sounds hard.
export function createTestSpan(name: string, attributes?: Attributes): Span {
  const yoAttributes: Attributes = { ...attributes };
  function setAttribute(key: string, value?: AttributeValue | undefined): Span {
    yoAttributes[key] = value;
    return s;
  }
  const s: Span = {
    kind: SpanKind.INTERNAL,
    links: [],
    attributes: yoAttributes,
    events: [],
    startTime: [0, 0],
    resource: {
      attributes: {},
      merge: function (other: IResource | null): IResource {
        throw new Error("Function not implemented.");
      },
    },
    instrumentationLibrary: {
      name: "jesss",
    },
    name,
    status: { code: SpanStatusCode.UNSET },
    endTime: [0, 0],
    spanContext: function (): SpanContext {
      throw new Error("Function not implemented.");
    },
    setAttribute,
    setAttributes: function (attributes: Attributes): Span {
      Object.entries(attributes).forEach(([key, value]) => {
        setAttribute(key, value);
      });
      return s;
    },
    addEvent: function (
      name: string,
      attributesOrStartTime?: Attributes | TimeInput | undefined,
      timeStamp?: TimeInput | undefined
    ): Span {
      throw new Error("Function not implemented.");
    },
    setStatus: function (status: SpanStatus): Span {
      throw new Error("Function not implemented.");
    },
    updateName: function (name: string): Span {
      throw new Error("Function not implemented.");
    },
    end: function (endTime?: TimeInput | undefined): void {
      throw new Error("Function not implemented.");
    },
    _getTime: undefined,
    isRecording: function (): boolean {
      throw new Error("Function not implemented.");
    },
    recordException: function (exception: Exception, time?: TimeInput | undefined): void {
      throw new Error("Function not implemented.");
    },
    duration: [0, 0],
    ended: false,
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
  } as unknown as Span;
  return s;
}
