import React from "react";

export const Production = {
  honeycomb_auth_url: "https://api.honeycomb.io/1/auth",
};

export const FakeHoneycomb = {
  honeycomb_auth_url: "/fake-hny-auth",
};

export const RealHoneyomb = {
  honeycomb_auth_url: "https://api.honeycomb.io/1/auth",
};

type ConfigurationType = {
  honeycomb_auth_url: string;
};

export const Configuration = React.createContext<ConfigurationType>(Local);
