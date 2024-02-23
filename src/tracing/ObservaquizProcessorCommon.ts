import { Span, Attributes } from "@opentelemetry/api";
import { LogRecord } from "@opentelemetry/sdk-logs";
export const ATTRIBUTE_NAME_FOR_APIKEY = "honeycomb.customer_api_key";

export const ATTRIBUTE_NAME_FOR_COPIES = "observaquiz.late_span";
export const ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS = "observaquiz.has_a_copy";
export const ATTRIBUTE_NAME_FOR_DESTINATION = "observaquiz.destination";
export const ATTRIBUTE_VALUE_FOR_DEVREL_TEAM = "devrel";
export const ATTRIBUTE_VALUE_FOR_PARTICIPANT_TEAM = "participant";

export function setAttributesForCopiedOriginals(logOrSpan: LogRecord | Span) {
    logOrSpan.setAttribute(ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS, true);
    logOrSpan.setAttribute(ATTRIBUTE_NAME_FOR_DESTINATION, ATTRIBUTE_VALUE_FOR_DEVREL_TEAM);
}
