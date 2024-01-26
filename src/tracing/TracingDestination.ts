// Global variable to hold where we're sending the traces
// (that they can view them)
// This is part of the very trickiness of this app.

// Should this be in React state in BoothGame? likely. And available as a context.
// there are dependencies here in TracingComponentLifecycle. not sure how to express those well.

export const HONEYCOMB_DATASET_NAME = "observaquiz-browser";

export type TracingTeam = {
  region: HoneycombRegion;
  team: { name: string; slug: string };
  environment: { name: string; slug: string };
  apiKey: string;
  observaquizStartTime: SecondsSinceEpoch; // this is the unix timestamp when any tracing for this execution can begin
};

export type SecondsSinceEpoch = number;

export type HoneycombRegion = "us" | "eu"; // could add dogfood if we want to test there

function honeycombUrl(region: HoneycombRegion): string {
  switch (region) {
    case "us":
      return "https://ui.honeycomb.io";
    case "eu":
      return "https://ui.eu1.honeycomb.io";
  }
}

export function honeycombTelemetryUrl(region: HoneycombRegion): string {
  switch (region) {
    case "us":
      return "https://api.honeycomb.io";
    case "eu":
      return "https://api.eu1.honeycomb.io";
  }
}

export function getUrlToDataset(team: {
  region: HoneycombRegion;
  team: { slug: string };
  environment: { slug: string };
}): string {
  // https://ui.honeycomb.io/modernity/environments/quiz-local/datasets/browser/
  return `${honeycombUrl(team.region)}/${team.team.slug}/environments/${
    team.environment.slug
  }/datasets/${HONEYCOMB_DATASET_NAME}`;
}
