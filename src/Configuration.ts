import React from "react";

export const Production = {
  honeycomb_auth_url: "https://api.honeycomb.io/1/auth",
  airplane_mode: false,
};

export const Airplane = {
  honeycomb_auth_url: "/fake-hny-auth",
  airplane_mode: true,
};

export type ConfigurationType = {
  honeycomb_auth_url: string;
  airplane_mode: boolean;
};

export const Configuration = React.createContext<ConfigurationType>(Production);
