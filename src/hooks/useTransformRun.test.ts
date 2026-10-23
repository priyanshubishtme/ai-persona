// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TransformEnvelope } from "@/lib/contract";
import { useTransformRun } from "./useTransformRun";

function envelope(text: string, persona: TransformEnvelope["result"]["persona"] = "c_level"): TransformEnvelope {
  return {
    result: {
      persona,
      rewritten_text: text,
      metrics: {
        word_count_original: 1,
        word_count_new: 1,
        word_count_change: 0,
        sentiment_original: 0,
        sentiment_new: 0,
        sentiment_change: 0,
        readability_original: 0,
        readability_new: 0,
        readability_change: 0,
        phrase_overlap_percent: 0,
      },
    },
    meta: { mode: "live", provider: "gemini", warnings: [] },
  };
}

/** A fetch whose responses are released manually, in any order. */
function controlledFetch() {
  const pending: { body: { original_text: string; persona: string }; resolve: (r: Response) => void; signal?: AbortSignal }[] = [];
  const impl = ((_url: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      pending.push({ body: JSON.parse(String(init?.body)), resolve, signal: init?.signal ?? undefined });
    })) as typeof fetch;
  return { impl, pending };
}

describe("useTransformRun", () => {
  it("sends one request when the same draft is submitted twice", async () => {
    const net = controlledFetch();
    const { result } = renderHook(() => useTransformRun(net.impl));
    act(() => {
      result.current.start("draft", ["c_level"]);
      result.current.start("draft", ["c_level"]);
    });
    expect(net.pending).toHaveLength(1);
    expect(result.current.loading).toBe(true);
    await act(async () => net.pending[0].resolve(Response.json(envelope("done"))));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.run?.items.c_level).toMatchObject({ status: "success" });
  });

  it("never lets a late, older response replace a newer result", async () => {
    const net = controlledFetch();
    const { result } = renderHook(() => useTransformRun(net.impl));
    act(() => void result.current.start("first draft", ["c_level"]));
    act(() => void result.current.start("second draft", ["c_level"]));
    expect(net.pending).toHaveLength(2);
    expect(net.pending[0].signal?.aborted).toBe(true);

    await act(async () => net.pending[1].resolve(Response.json(envelope("new result"))));
    await act(async () => net.pending[0].resolve(Response.json(envelope("old result"))));

    await waitFor(() => expect(result.current.run?.items.c_level?.status).toBe("success"));
    const item = result.current.run?.items.c_level;
    expect(item?.status === "success" && item.envelope.result.rewritten_text).toBe("new result");
    expect(result.current.run?.draft).toBe("second draft");
  });

  it("runs all four personas in parallel and tracks each one", async () => {
    const net = controlledFetch();
    const { result } = renderHook(() => useTransformRun(net.impl));
    act(() => void result.current.start("draft", ["c_level", "peer_feedback", "legal_compliance", "gen_z"]));
    expect(net.pending.map((p) => p.body.persona)).toEqual(["c_level", "peer_feedback", "legal_compliance", "gen_z"]);

    await act(async () => net.pending[2].resolve(Response.json(envelope("legal", "legal_compliance"))));
    expect(result.current.run?.items.legal_compliance?.status).toBe("success");
    expect(result.current.loading).toBe(true);

    await act(async () => {
      net.pending[0].resolve(Response.json(envelope("exec")));
      net.pending[1].resolve(
        Response.json({ error: { code: "PROVIDER_TIMEOUT", message: "slow", retryable: true } }, { status: 504 }),
      );
      net.pending[3].resolve(new Response("<html>oops</html>", { status: 502 }));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.run?.items.peer_feedback).toMatchObject({ status: "error", error: { code: "PROVIDER_TIMEOUT" } });
    expect(result.current.run?.items.gen_z).toMatchObject({ status: "error", error: { code: "HTTP_502" } });
  });

  it("rejects a 200 response with an unexpected shape", async () => {
    const net = controlledFetch();
    const { result } = renderHook(() => useTransformRun(net.impl));
    act(() => void result.current.start("draft", ["c_level"]));
    await act(async () => net.pending[0].resolve(Response.json({ rewritten_text: "no envelope" })));
    await waitFor(() =>
      expect(result.current.run?.items.c_level).toMatchObject({ status: "error", error: { code: "UNEXPECTED_RESPONSE" } }),
    );
  });

  it("keeps the draft after an error and retries only the failed persona", async () => {
    const net = controlledFetch();
    const { result } = renderHook(() => useTransformRun(net.impl));
    act(() => void result.current.start("keep me", ["gen_z"]));
    await act(async () =>
      net.pending[0].resolve(Response.json({ error: { code: "PROVIDER_UNAVAILABLE", message: "down", retryable: true } }, { status: 503 })),
    );
    await waitFor(() => expect(result.current.run?.items.gen_z?.status).toBe("error"));
    expect(result.current.run?.draft).toBe("keep me");

    act(() => result.current.retry("gen_z"));
    expect(net.pending).toHaveLength(2);
    expect(net.pending[1].body).toEqual({ original_text: "keep me", persona: "gen_z" });
    await act(async () => net.pending[1].resolve(Response.json(envelope("recovered", "gen_z"))));
    await waitFor(() => expect(result.current.run?.items.gen_z?.status).toBe("success"));
  });

  it("reports network failures as retryable errors", async () => {
    const failing = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    const { result } = renderHook(() => useTransformRun(failing));
    act(() => void result.current.start("draft", ["c_level"]));
    await waitFor(() =>
      expect(result.current.run?.items.c_level).toMatchObject({ status: "error", error: { code: "NETWORK_ERROR", retryable: true } }),
    );
  });
});
