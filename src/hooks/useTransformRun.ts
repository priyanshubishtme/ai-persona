"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonaId } from "@/lib/contract";
import { requestTransform, type ItemState } from "@/lib/transformClient";

export type Run = {
  id: number;
  draft: string;
  personas: PersonaId[];
  items: Partial<Record<PersonaId, ItemState>>;
};

export function isRunLoading(run: Run | null): boolean {
  return !!run && run.personas.some((p) => run.items[p]?.status === "loading");
}

/**
 * Owns the request lifecycle for one draft sent to one or more personas.
 * A new run aborts the previous one; responses from superseded runs or retries are discarded.
 */
export function useTransformRun(fetchImpl?: typeof fetch) {
  const [run, setRun] = useState<Run | null>(null);
  const runIdRef = useRef(0);
  const attemptRef = useRef(new Map<PersonaId, number>());
  const controllersRef = useRef(new Map<PersonaId, AbortController>());
  const inFlightKeyRef = useRef<string | null>(null);
  const pendingRef = useRef(0);

  const abortAll = useCallback(() => {
    for (const controller of controllersRef.current.values()) controller.abort();
    controllersRef.current.clear();
    pendingRef.current = 0;
    inFlightKeyRef.current = null;
  }, []);

  useEffect(() => abortAll, [abortAll]);

  const send = useCallback(
    async (runId: number, draft: string, persona: PersonaId) => {
      controllersRef.current.get(persona)?.abort();
      const controller = new AbortController();
      controllersRef.current.set(persona, controller);
      const attempt = (attemptRef.current.get(persona) ?? 0) + 1;
      attemptRef.current.set(persona, attempt);
      pendingRef.current++;

      const state = await requestTransform(fetchImpl ?? fetch, draft, persona, controller.signal);

      const isCurrent = runIdRef.current === runId && attemptRef.current.get(persona) === attempt;
      if (!isCurrent) return;
      pendingRef.current = Math.max(0, pendingRef.current - 1);
      if (pendingRef.current === 0) inFlightKeyRef.current = null;
      controllersRef.current.delete(persona);
      setRun((prev) => (prev && prev.id === runId ? { ...prev, items: { ...prev.items, [persona]: state } } : prev));
    },
    [fetchImpl],
  );

  const start = useCallback(
    (draft: string, personas: PersonaId[]) => {
      const key = `${personas.join(",")}\u0000${draft}`;
      if (inFlightKeyRef.current === key) return false;
      abortAll();
      inFlightKeyRef.current = key;
      const id = ++runIdRef.current;
      setRun({ id, draft, personas, items: Object.fromEntries(personas.map((p) => [p, { status: "loading" }])) });
      for (const persona of personas) void send(id, draft, persona);
      return true;
    },
    [abortAll, send],
  );

  const retry = useCallback(
    (persona: PersonaId) => {
      if (!run || run.items[persona]?.status === "loading") return;
      const { id, draft } = run;
      setRun((prev) => (prev && prev.id === id ? { ...prev, items: { ...prev.items, [persona]: { status: "loading" } } } : prev));
      void send(id, draft, persona);
    },
    [run, send],
  );

  return { run, start, retry, loading: isRunLoading(run) };
}
