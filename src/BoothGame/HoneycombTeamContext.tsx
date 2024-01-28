import React from "react";
import { TracedState, useTracedState } from "../tracing/TracedState";
import { TracingTeam } from "../tracing/TracingDestination";

export type HoneycombTeamContextType =
  | ({
      populated: true;
      fetchHeaders: Record<string, string>;
    } & TracingTeam)
  | {
      populated: false;
      fetchHeaders: Record<string, string>;
    };

const nilHoneycombTeamContext: HoneycombTeamContextType = {
  populated: false,
  fetchHeaders: {},
};

export const HoneycombTeamContext = React.createContext<HoneycombTeamContextType>(nilHoneycombTeamContext);

export type HoneycombTeamContextProviderProps = {
  tracingTeam: TracedState<TracingTeam | undefined>;
  children: React.ReactNode;
};

export function HoneycombTeamContextProvider(props: HoneycombTeamContextProviderProps) {
  const tracingTeam = useTracedState(props.tracingTeam);
  const honeycombTeamContext: HoneycombTeamContextType = !tracingTeam
    ? nilHoneycombTeamContext
    : {
        populated: true,
        fetchHeaders: {
          "x-Honeycomb-Api-Key": tracingTeam.apiKey,
          "X-Honeycomb-Region": tracingTeam.region,
          "X-Observaquiz-Execution-Id": tracingTeam.observaquizExecutionId,
        },
        ...tracingTeam,
      };
  return <HoneycombTeamContext.Provider value={honeycombTeamContext}>{props.children}</HoneycombTeamContext.Provider>;
}
