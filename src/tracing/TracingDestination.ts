// Global variable to hold where we're sending the traces
// (that they can view them)
// This is part of the very trickiness of this app.

// Should this be in React state in BoothGame? likely. And available as a context.
// there are dependencies here in TracingComponentLifecycle. not sure how to express those well.

export const datasetName = "observaquiz-browser";

export type HoneycombRegion = "us" | "eu"; // could add dogfood if we want to test there

function honeycombUrl(region: HoneycombRegion): string {
  switch (region) {
    case "us":
      return "https://ui.honeycomb.io";
    case "eu":
      return "https://ui.eu1.honeycomb.io";
  }
}

export class TracingDestination {
  constructor(
    private honeycombRegion: HoneycombRegion,
    private teamSlug: string,
    private envSlug: string,
    private datasetSlug: string
  ) {}

  public getUrlToDataset(): string {
    // https://ui.honeycomb.io/modernity/environments/quiz-local/datasets/browser/
    return `${honeycombUrl(this.honeycombRegion)}/${this.teamSlug}/environments/${this.envSlug}/datasets/${
      this.datasetSlug
    }`;
  }
}

export var KnownTracingDestination: null | TracingDestination = null;

export function learnTracingDestination(params: {
  honeycombRegion: HoneycombRegion;
  teamSlug: string;
  envSlug: string;
}) {
  KnownTracingDestination = new TracingDestination(
    params.honeycombRegion,
    params.teamSlug,
    params.envSlug,
    datasetName
  );
  console.log("learnTracingDestination", params);
}
