/*
 * Credit to: @uidotdev
 * I have copied this locally because the original is only ESM, and I am using CommonJS modules
 * https://github.com/uidotdev/usehooks/blob/dfa6623fcc2dcad3b466def4e0495b3f38af962b/index.js#L616
 */

import React from "react";

function dispatchStorageEvent(key: string, newValue: any) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
}

const setLocalStorageItem = (key: string, value: any) => {
  const stringifiedValue = JSON.stringify(value);
  window.localStorage.setItem(key, stringifiedValue);
  dispatchStorageEvent(key, stringifiedValue);
};

const removeLocalStorageItem = (key: string) => {
  window.localStorage.removeItem(key);
  dispatchStorageEvent(key, null);
};

const getLocalStorageItem = (key: string) => {
  return window.localStorage.getItem(key);
};

const useLocalStorageSubscribe = (callback: any) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

const getLocalStorageServerSnapshot = () => {
  throw Error("useLocalStorage is a client-only hook");
};

export function useLocalStorage<T>(key: string, initialValue?: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const getSnapshot = () => getLocalStorageItem(key);

  const store = React.useSyncExternalStore(useLocalStorageSubscribe, getSnapshot, getLocalStorageServerSnapshot);

  const setState = React.useCallback(
    (v: any) => {
      try {
        const nextState = typeof v === "function" ? v(JSON.parse(store!)) : v;

        if (nextState === undefined || nextState === null) {
          removeLocalStorageItem(key);
        } else {
          setLocalStorageItem(key, nextState);
        }
      } catch (e) {
        console.warn(e);
      }
    },
    [key, store]
  );

  React.useEffect(() => {
    if (getLocalStorageItem(key) === null && typeof initialValue !== "undefined") {
      setLocalStorageItem(key, initialValue);
    }
  }, [key, initialValue]);

  return [store ? JSON.parse(store) : initialValue, setState];
}
