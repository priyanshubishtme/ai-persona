"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PERSONAS } from "@/lib/personas";
import { PRESETS } from "@/lib/presets";

const EXAMPLE = PRESETS[0];
const ROTATE_MS = 4500;

export function HeroStack() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const stackRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % PERSONAS.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = stackRef.current;
    if (!el || reducedMotion || event.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1200px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg)`;
  }

  function resetTilt() {
    if (stackRef.current) stackRef.current.style.transform = "";
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + PERSONAS.length) % PERSONAS.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div
      className="relative mx-auto mt-16 w-full max-w-5xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        resetTilt();
      }}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,0.85fr)_3rem_minmax(0,1.15fr)] md:gap-0">
        <figure className="rounded-2xl bg-surface p-5 shadow-[inset_0_0_0_1px_var(--color-line)]">
          <figcaption className="text-sm font-medium text-muted">Your draft</figcaption>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink">{EXAMPLE.draft}</p>
        </figure>

        <div aria-hidden className="hidden h-px w-full bg-accent/70 md:block" />

        <div
          ref={stackRef}
          onPointerMove={onPointerMove}
          className="relative transition-transform duration-300 ease-out will-change-transform"
        >
          <div aria-hidden className="absolute inset-x-6 -bottom-3 h-full rounded-2xl bg-raised/60" />
          <div aria-hidden className="absolute inset-x-3 -bottom-1.5 h-full rounded-2xl bg-raised/80" />
          {PERSONAS.map((persona, index) => (
            <div
              key={persona.id}
              id={`hero-panel-${persona.id}`}
              role="tabpanel"
              aria-labelledby={`hero-tab-${persona.id}`}
              hidden={index !== active}
              className="relative min-h-52 rounded-2xl bg-raised p-6 shadow-[inset_0_0_0_1px_var(--color-line-strong)]"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-semibold text-ink">{persona.name}</p>
                <p className="text-sm text-muted">{persona.audience}</p>
              </div>
              <div aria-hidden className="mt-3 h-0.5 w-full rounded bg-accent" />
              <p className="animate-rise mt-4 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink" key={active}>
                {EXAMPLE.demo[persona.id]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 md:items-end">
        <div role="tablist" aria-label="Example rewrites by audience" className="flex flex-wrap justify-center gap-2">
          {PERSONAS.map((persona, index) => (
            <button
              key={persona.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`hero-tab-${persona.id}`}
              role="tab"
              type="button"
              aria-selected={index === active}
              aria-controls={`hero-panel-${persona.id}`}
              tabIndex={index === active ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
              className={`min-h-9 rounded-full px-3.5 text-sm font-medium transition-colors ${
                index === active ? "bg-accent text-ground" : "bg-raised text-muted hover:text-ink"
              }`}
            >
              {persona.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-faint">Sample rewrites written for the built-in example, not generated live.</p>
      </div>
    </div>
  );
}
