import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { api, errorMessage, type RequestOptions } from "./api";

/** Loads an API resource when the screen gains focus. Exposes loading/error/refresh for every screen. */
export function useApi<T>(path: string | null, opts: RequestOptions = {}, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown> | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!path) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await api<T>(path, optsRef.current);
        setData(res.data);
        setMeta(res.meta);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, ...deps],
  );

  useFocusEffect(
    useCallback(() => {
      void load(data ? "refresh" : "initial");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  return { data, meta, error, loading, refreshing, reload: () => load("refresh"), setData };
}
