"use client";

import Link from "next/link";
import { Braces, CircleAlert, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { PersonaId } from "@/lib/contract";
import { getPersona } from "@/lib/personas";
import type { ItemState } from "@/lib/transformClient";
import { CopyButton } from "./CopyButton";
import { DiffText } from "./DiffText";
import { ListenButton } from "./ListenButton";
import { MetricsTable } from "./MetricsTable";

type Props = {
  personaId: PersonaId;
  state: ItemState;
  draft: string;
  wide: boolean;
  onRetry: () => void;
  onAnnounce: (message: string) => void;
};

const PROVIDER_LABEL = { gemini: "Gemini", openai_compatible: "OpenAI-compatible", demo: "Demo" } as const;

export function ResultCard({ personaId, state, draft, wide, onRetry, onAnnounce }: Props) {
  const persona = getPersona(personaId);
  const [showChanges, setShowChanges] = useState(false);
  const headingId = `result-${personaId}`;

  return (
    <article aria-labelledby={headingId} className="rounded-2xl bg-raised p-5 shadow-[inset_0_0_0_1px_var(--color-line)] sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 id={headingId} className="font-semibold text-ink">
          {persona.name} <span className="font-normal text-muted">for {persona.audience.toLowerCase()}</span>
        </h3>
        {state.status === "success" &&
          (state.envelope.meta.mode === "demo" ? (
            <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-soft">
              Demo · written by hand, not AI
            </span>
          ) : (
            <span className="rounded-full bg-added/10 px-2.5 py-1 text-xs font-medium text-added">
              Live AI · {PROVIDER_LABEL[state.envelope.meta.provider]}
            </span>
          ))}
      </header>

      {personaId === "legal_compliance" && (
        <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
          Writing aid, not legal advice. Have a qualified person review anything with legal effect.
        </p>
      )}

      {state.status === "loading" && (
        <div className="mt-5 space-y-2.5" aria-hidden>
          <div className="animate-shimmer h-3.5 w-11/12 rounded bg-line-strong/60" />
          <div className="animate-shimmer h-3.5 w-10/12 rounded bg-line-strong/60" />
          <div className="animate-shimmer h-3.5 w-8/12 rounded bg-line-strong/60" />
        </div>
      )}
      {state.status === "loading" && <p className="mt-4 text-sm text-muted">Rewriting for {persona.name}…</p>}

      {state.status === "error" && (
        <div className="mt-5 flex gap-3 rounded-xl bg-surface p-4">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-removed" />
          <div className="space-y-3">
            <p className="text-sm text-ink">{state.error.message}</p>
            {state.error.code === "LIVE_AI_NOT_CONFIGURED" && (
              <p className="text-sm text-muted">Pick one of the examples above to see the full flow in demo mode.</p>
            )}
            {state.error.retryable && (
              <button type="button" onClick={onRetry} className="btn-secondary min-h-9 text-sm">
                <RotateCcw aria-hidden className="size-4" />
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {state.status === "success" && (
        <SuccessBody
          state={state}
          draft={draft}
          wide={wide}
          showChanges={showChanges}
          onToggleChanges={() => setShowChanges((v) => !v)}
          onAnnounce={onAnnounce}
        />
      )}
    </article>
  );
}

function SuccessBody({
  state,
  draft,
  wide,
  showChanges,
  onToggleChanges,
  onAnnounce,
}: {
  state: Extract<ItemState, { status: "success" }>;
  draft: string;
  wide: boolean;
  showChanges: boolean;
  onToggleChanges: () => void;
  onAnnounce: (message: string) => void;
}) {
  const { result, meta } = state.envelope;
  const facts = meta.warnings.filter((w) => w.code === "fact_missing" || w.code === "negation_missing");
  const notes = meta.warnings.filter((w) => w.code !== "fact_missing" && w.code !== "negation_missing");
  const overlapMeaningful = !meta.warnings.some((w) => w.code === "overlap_not_meaningful");

  return (
    <div className={`mt-5 grid gap-6 ${wide ? "lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10" : ""}`}>
      <div className="min-w-0 space-y-4">
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            role="switch"
            checked={showChanges}
            onChange={onToggleChanges}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-5 w-9 rounded-full bg-line-strong transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-ink after:transition-transform peer-checked:after:translate-x-4"
          />
          Show changes
        </label>

        <div className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-ink">
          {showChanges ? <DiffText original={draft} rewritten={result.rewritten_text} /> : result.rewritten_text}
        </div>

        {showChanges && (
          <p className="text-xs text-faint">
            <span className="diff-removed px-1">Removed</span> and <span className="diff-added px-1">added</span> words.
            This highlight is a visual word diff, separate from the phrase overlap number.
          </p>
        )}

        <div className="-ml-3 flex flex-wrap gap-1">
          <CopyButton text={result.rewritten_text} label="Copy text" onAnnounce={onAnnounce} />
          <CopyButton
            text={JSON.stringify(result, null, 2)}
            label="Copy JSON"
            icon={<Braces aria-hidden className="size-4" />}
            onAnnounce={onAnnounce}
          />
          <ListenButton text={result.rewritten_text} />
        </div>

        <section aria-label="Fact Guard" className="rounded-xl bg-surface p-4">
          {facts.length === 0 ? (
            <p className="flex gap-2 text-sm text-muted">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-added" />
              Fact Guard found every number, date, name and negation from your draft in this rewrite.
            </p>
          ) : (
            <>
              <p className="flex gap-2 text-sm font-medium text-ink">
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                Fact Guard: possible dropped details
              </p>
              <ul className="mt-2 space-y-1.5 pl-6 text-sm text-muted">
                {facts.map((w, i) => (
                  <li key={i} className="list-disc">
                    {w.message}
                  </li>
                ))}
              </ul>
              <p className="mt-2 pl-6 text-xs text-faint">
                These are pattern checks, not proof.{" "}
                <Link href="/methodology#fact-guard" className="underline underline-offset-2 hover:text-ink">
                  What Fact Guard looks for
                </Link>
              </p>
            </>
          )}
        </section>
      </div>

      <div className="min-w-0 space-y-3">
        <MetricsTable metrics={result.metrics} overlapMeaningful={overlapMeaningful} />
        {notes.length > 0 && (
          <ul className="space-y-1 text-xs text-faint">
            {notes.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
