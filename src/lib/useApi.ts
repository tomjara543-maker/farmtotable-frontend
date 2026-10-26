"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

const POLL_MS = 1500;

export function useApi<T>(path: string | null, pollWhile?: (data: T) => boolean) {
  const [state, setState] = useState<{ path: string | null; data?: T; error?: string }>({ path: null });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!path) return;
    let ignore = false;
    api<T>(path)
      .then((data) => !ignore && setState({ path, data }))
      .catch((e: Error) => !ignore && setState((s) => ({ path, data: s.path === path ? s.data : undefined, error: e.message })));
    return () => {
      ignore = true;
    };
  }, [path, version]);

  const current = state.path === path;
  const shouldPoll = current && state.data !== undefined && !!pollWhile?.(state.data);
  useEffect(() => {
    if (!shouldPoll) return;
    const timer = setTimeout(reload, POLL_MS);
    return () => clearTimeout(timer);
  }, [shouldPoll, state, reload]);

  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: !!path && (!current || (state.data === undefined && !state.error)),
    reload,
  };
}
