"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { isRunLoading, useTransformRun } from "@/hooks/useTransformRun";
import { MAX_INPUT_CHARS, PERSONA_IDS, type PersonaId } from "@/lib/contract";
import { PERSONAS, getPersona } from "@/lib/personas";
import { PRESETS } from "@/lib/presets";
import { ResultCard } from "./ResultCard";

type Selection = PersonaId | "all";

function personasFor(selection: Selection): PersonaId[] {
  return selection === "all" ? [...PERSONA_IDS] : [selection];
}

export function Studio({ live }: { live: boolean }) {
  const [draft, setDraft] = useState("");
  const [selection, setSelection] = useState<Selection>("c_level");
  const [validation, setValidation] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const { run, start, retry, loading } = useTransformRun();
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const wasLoading = useRef(false);
  const draftId = useId();
  const hintId = useId();
  const errorId = useId();

  const length = [...draft.trim()].length;
  const tooLong = length > MAX_INPUT_CHARS;
  const selectedPersonas = personasFor(selection);
  const isStale =
    !!run && !loading && (run.draft !== draft.trim() || run.personas.join() !== selectedPersonas.join());

  useEffect(() => {
    if (wasLoading.current && run && !isRunLoading(run)) {
      const ok = run.personas.filter((p) => run.items[p]?.status === "success").length;
      const total = run.personas.length;
      setAnnouncement(
        ok === total
          ? `${total === 1 ? "Rewrite" : `${total} rewrites`} ready.`
          : `${ok} of ${total} rewrites ready. ${total - ok} failed.`,
      );
      resultsHeadingRef.current?.focus();
    }
    wasLoading.current = loading;
  }, [loading, run]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      setValidation("Write or paste a draft first, or pick an example.");
      return;
    }
    if (tooLong) {
      setValidation(`Shorten the draft to ${MAX_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`);
      return;
    }
    setValidation(null);
    if (start(trimmed, selectedPersonas)) {
      setAnnouncement(
        selection === "all" ? "Rewriting for all four audiences…" : `Rewriting for ${getPersona(selection).name}…`,
      );
    }
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!loading) submit();
    }
  }

  const buttonLabel = selection === "all" ? "Rewrite for all four" : `Rewrite for ${getPersona(selection).name}`;
  const selectedSummary = selection === "all"
    ? "Four rewrites side by side, each measured on its own."
    : getPersona(selection).summary;

  return (
    <div className="overflow-hidden rounded-3xl bg-surface shadow-[inset_0_0_0_1px_var(--color-line),0_40px_120px_-40px_rgba(255,90,31,0.25)]">
      <div className="flex items-center justify-between gap-4 bg-ground/40 px-5 py-3">
        <div aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
        </div>
        <p className="text-sm font-medium text-ink">Alter Studio</p>
        <p className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden className={`size-2 rounded-full ${live ? "bg-added" : "bg-accent"}`} />
          {live ? "Live AI" : "Demo mode: examples only"}
        </p>
      </div>

      <form onSubmit={submit} noValidate className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={draftId} className="font-medium text-ink">
              Your draft
            </label>
            <span className={`text-xs tabular-nums ${tooLong ? "text-removed" : "text-faint"}`} aria-live="polite">
              {length.toLocaleString("en-US")} / {MAX_INPUT_CHARS.toLocaleString("en-US")}
            </span>
          </div>
          <textarea
            id={draftId}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (validation) setValidation(null);
            }}
            onKeyDown={onDraftKeyDown}
            rows={8}
            spellCheck
            placeholder="Paste a rough message: notes, fragments or bullets all work."
            aria-describedby={`${hintId}${validation ? ` ${errorId}` : ""}`}
            aria-invalid={!!validation || tooLong}
            className="mt-2 min-h-44 w-full flex-1 resize-y rounded-xl bg-raised p-4 text-[0.9375rem] leading-relaxed text-ink placeholder:text-faint shadow-[inset_0_0_0_1px_var(--color-line-strong)] focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--color-accent)]"
          />
          <p id={hintId} className="mt-2 text-xs text-faint">
            Ctrl + Enter to rewrite. Your draft is not stored.
          </p>
          {validation && (
            <p id={errorId} role="alert" className="mt-2 text-sm text-removed">
              {validation}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Try an example:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDraft(preset.draft);
                  setValidation(null);
                }}
                className="min-h-9 rounded-full bg-raised px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors hover:bg-line"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <fieldset>
            <legend className="font-medium text-ink">Who is it for?</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[...PERSONAS.map((p) => ({ id: p.id as Selection, name: p.name, audience: p.audience })), {
                id: "all" as Selection,
                name: "All four",
                audience: "Side by side",
              }].map((option) => (
                <label
                  key={option.id}
                  className={`cursor-pointer rounded-xl px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                    option.id === "all" ? "col-span-2" : ""
                  } ${
                    selection === option.id
                      ? "bg-accent/12 shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
                      : "bg-raised shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="persona"
                    value={option.id}
                    checked={selection === option.id}
                    onChange={() => setSelection(option.id)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium text-ink">{option.name}</span>
                  <span className="block text-xs text-muted">{option.audience}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 min-h-10 text-sm leading-snug text-muted">{selectedSummary}</p>
          </fieldset>

          <button type="submit" className="btn-primary mt-auto w-full" disabled={loading} aria-busy={loading}>
            {loading && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
            {loading ? "Rewriting…" : buttonLabel}
          </button>
        </div>
      </form>

      <section aria-labelledby="results-heading" className="bg-ground/30 p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="results-heading" ref={resultsHeadingRef} tabIndex={-1} className="text-lg font-semibold text-ink">
            Results
          </h2>
          {isStale && (
            <p className="text-sm text-accent-soft">
              You changed the draft or audience since this result. Rewrite again to update it.
            </p>
          )}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        {!run ? (
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">
            Your rewrite appears here with what changed, what Fact Guard checked, and how the numbers moved.
            {!live && " Without an API key, Alter runs in demo mode: pick an example above to see the full flow."}
          </p>
        ) : (
          <div className={`mt-5 grid gap-5 ${run.personas.length > 1 ? "xl:grid-cols-2" : ""}`}>
            {run.personas.map((persona) => {
              const state = run.items[persona];
              if (!state) return null;
              return (
                <ResultCard
                  key={`${run.id}-${persona}`}
                  personaId={persona}
                  state={state}
                  draft={run.draft}
                  wide={run.personas.length === 1}
                  onRetry={() => retry(persona)}
                  onAnnounce={setAnnouncement}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
