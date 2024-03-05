// Global variable to hold where we're sending the traces
// (that they can view them)
// This is part of the very trickiness of this app.

// Should this be in React state in BoothGame? likely. And available as a context.
// there are dependencies here in TracingComponentLifecycle. not sure how to express those well.

export const HONEYCOMB_DATASET_NAME = "observaquiz-browser";
export const BACKEND_DATASET_NAME = "observaquiz-bff";
export const TRACING_TEAM_VERSION = 4;

export type ExecutionId = string;

export type TracingTeam = {
  version: typeof TRACING_TEAM_VERSION;
  execution: {
    startTime: SecondsSinceEpoch;
    executionId: ExecutionId;
  };
  protagonist?: { moniker: string };
  auth?: TracingTeamFromAuth;
};
export type TracingTeamFromAuth = {
  region: HoneycombRegion;
  team: { name: string; slug: string };
  environment: { name: string; slug: string };
  apiKey: string;
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

export function getUrlToDataset(
  team: {
    region: HoneycombRegion;
    team: { slug: string };
    environment: { slug: string };
  },
  dataset: string = HONEYCOMB_DATASET_NAME
): string {
  // https://ui.honeycomb.io/modernity/environments/quiz-local/datasets/browser/
  return `${honeycombUrl(team.region)}/${team.team.slug}/environments/${team.environment.slug}/datasets/${dataset}`;
}

export function getQueryTemplateLink(
  team: {
    region: HoneycombRegion;
    team: { slug: string };
    environment: { slug: string };
  },
  query: QueryObject,
  dataset: string = HONEYCOMB_DATASET_NAME
) {
  const querystring = encodeURIComponent(JSON.stringify(query));
  return `${getUrlToDataset(team, dataset)}?query=${querystring}`;
}

// This does not describe the full of possibilities but it'll do for now
type Calculation = {
  op: string;
  column?: string;
};

type Filter = {
  column: string;
  op: string;
  value: string;
};

type Order = {
  column?: string;
  op: string;
  order: string;
};

export type QueryObject = {
  time_range: number;
  granularity: number;
  breakdowns?: string[];
  calculations: Calculation[];
  filters?: Filter[];
  orders?: Order[];
  havings?: any[];
  limit?: number;
};
