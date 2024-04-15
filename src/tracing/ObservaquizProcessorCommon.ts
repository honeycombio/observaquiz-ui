import { Span, Attributes } from "@opentelemetry/api";
import { LogRecord } from "@opentelemetry/sdk-logs";
export const ATTRIBUTE_NAME_FOR_APIKEY = "honeycomb.customer_api_key";

export const ATTRIBUTE_NAME_FOR_COPIES = "observaquiz.late_span";
export const ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS = "observaquiz.has_a_copy";
export const ATTRIBUTE_NAME_FOR_DESTINATION = "observaquiz.destination";
export const ATTRIBUTE_VALUE_FOR_DEVREL_TEAM = "devrel";
export const ATTRIBUTE_VALUE_FOR_PARTICIPANT_TEAM = "participant";

export const ATTRIBUTE_NAME_FOR_PROCESSING_REPORT = "observaquiz.processing_report";
export const PROCESSING_REPORT_DELIMITER = "\n *-* \n";

export function setAttributesForCopiedOriginals(logOrSpan: LogRecord | Span) {
    logOrSpan.setAttribute(ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS, true);
    logOrSpan.setAttribute(ATTRIBUTE_NAME_FOR_DESTINATION, ATTRIBUTE_VALUE_FOR_DEVREL_TEAM);
}

// call this for spans when, at the end, we gather up their attributes and copy them to the copy, again.
export function removeAttributesForCopiedOriginals(attributes: Attributes) {
    delete attributes[ATTRIBUTE_NAME_FOR_COPIED_ORIGINALS];
    if (attributes[ATTRIBUTE_NAME_FOR_DESTINATION] === ATTRIBUTE_VALUE_FOR_DEVREL_TEAM) {
        delete attributes[ATTRIBUTE_NAME_FOR_DESTINATION];
    }
}

export function attributesForCopies(): Attributes {
    return {
        [ATTRIBUTE_NAME_FOR_COPIES]: true,
        [ATTRIBUTE_NAME_FOR_DESTINATION]: ATTRIBUTE_VALUE_FOR_PARTICIPANT_TEAM
    }
}