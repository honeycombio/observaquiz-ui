import { send } from "process";
import React from "react";

export const Production = {
  honeycomb_auth_url: "https://api.honeycomb.io/1/auth",
  send_spans: true,
  diagnostics_for_spans: false,
};

export const Airplane = {
  honeycomb_auth_url: "/fake-hny-auth",
  airplane_mode: true,
  send_spans: false,
};

export const Test = {
  honeycomb_auth_url: "https://api.honeycomb.io/1/auth",
  send_spans: true,
  diagnostics_for_spans: true,
};

export type ConfigurationType = {
  honeycomb_auth_url: string;
  diagnostics_for_spans: boolean;
  send_spans: boolean;
};

export const Configuration = React.createContext<ConfigurationType>(Production);
