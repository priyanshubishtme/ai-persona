"use client";

import { GitCompareArrows, Layers, ScanSearch, ShieldCheck, type LucideIcon } from "lucide-react";
import { useState } from "react";

type Feature = { id: string; icon: LucideIcon; title: string; line: string; detail: string };

const FEATURES: Feature[] = [
  {
    id: "diff",
    icon: GitCompareArrows,
    title: "Live diff inspector",
    line: "See exactly what changed, word by word.",
    detail:
      "Turn on Show changes to see removed words struck through and added words underlined. The highlight is a visual word diff and is kept separate from the phrase overlap number.",
  },
  {
    id: "grid",
    icon: Layers,
    title: "Persona grid",
    line: "One draft, four audiences at once.",
    detail:
      "Choose All four to rewrite for executives, colleagues, compliance readers and social feeds in one go. Each rewrite gets its own metrics and its own Fact Guard check.",
  },
  {
    id: "guard",
    icon: ScanSearch,
    title: "Fact Guard",
    line: "Flags dropped numbers, dates and names.",
    detail:
      "After every rewrite, Alter checks that the numbers, money amounts, dates, names and negations in your draft still appear. Anything missing is listed as a possible problem for you to check.",
  },
  {
    id: "storage",
    icon: ShieldCheck,
    title: "Nothing stored",
    line: "Alter keeps no copy of your drafts.",
    detail:
      "Drafts go to the AI provider to be rewritten and are never saved or logged by Alter. Free-tier AI providers may keep submitted text under their own terms, so use a paid key for confidential drafts.",
  },
];

export function FeatureCards() {
  const [open, setOpen] = useState<string | null>("grid");

  return (
    <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((feature) => {
        const Icon = feature.icon;
        const expanded = open === feature.id;
        const detailId = `feature-${feature.id}`;
        return (
          <li
            key={feature.id}
            onMouseEnter={() => setOpen(feature.id)}
            className={`flex flex-col rounded-2xl p-6 transition-colors duration-200 ${
              expanded
                ? "bg-raised shadow-[inset_0_0_0_1px_var(--color-accent)]"
                : "bg-surface shadow-[inset_0_0_0_1px_var(--color-line)]"
            }`}
          >
            <Icon aria-hidden className="size-5 text-accent" />
            <h3 className="mt-5 font-semibold text-ink">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{feature.line}</p>
            <p id={detailId} hidden={!expanded} className="mt-3 text-sm leading-relaxed text-muted">
              {feature.detail}
            </p>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={detailId}
              onClick={() => setOpen(expanded ? null : feature.id)}
              className="mt-auto self-start pt-5 text-sm font-medium text-accent-soft hover:text-ink"
            >
              {expanded ? "Less detail" : "More detail"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
