import { ActiveLifecycleSpanType } from "./tracing/activeLifecycleSpan";

// This has to be passed down a long way, so make a common type for the doot doot doot
export type HowToReset = {
  howToReset: (span?: ActiveLifecycleSpanType) => void;
};
