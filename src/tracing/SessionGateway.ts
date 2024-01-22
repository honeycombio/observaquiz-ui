// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

// jess: why is this called a Gateway? I have no idea. It's just a session store.

import { v4 } from "uuid";

interface ISession {
  sessionId: string;
}

const sessionKey = "session";
const defaultSession = {
  sessionId: v4(),
};

const SessionGateway = () => ({
  getSession(): ISession {
    if (typeof window === "undefined") return defaultSession;
    const sessionString = localStorage.getItem(sessionKey);

    if (!sessionString) localStorage.setItem(sessionKey, JSON.stringify(defaultSession));

    return JSON.parse(sessionString || JSON.stringify(defaultSession)) as ISession;
  },
  setSessionValue<K extends keyof ISession>(key: K, value: ISession[K]) {
    const session = this.getSession();

    localStorage.setItem(sessionKey, JSON.stringify({ ...session, [key]: value }));
  },
});

export default SessionGateway();
