import { GitCompareArrows } from "lucide-react";

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-[1.0625rem] font-semibold tracking-tight text-ink">
      <GitCompareArrows aria-hidden className="size-5 text-accent" strokeWidth={2.25} />
      alter
    </span>
  );
}
