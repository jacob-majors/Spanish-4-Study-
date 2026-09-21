"use client";

import { useSyncExternalStore } from "react";
import { load, subscribe, EMPTY } from "./storage";
import { AppData } from "./types";

export function useAppData(): AppData {
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => load(),
    () => EMPTY,
  );
}
