import { trace } from "@opentelemetry/api";

const span = trace.getTracer("test").startSpan("test span");

span.setAttribute("do nothing", "at all");

span.end();
