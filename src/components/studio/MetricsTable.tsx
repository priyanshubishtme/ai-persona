import Link from "next/link";
import type { Metrics } from "@/lib/contract";
import {
  formatDuration,
  formatInteger,
  formatPercent,
  formatReadability,
  formatReadingChange,
  formatSentiment,
  formatSignedInteger,
  formatSignedReadability,
  formatSignedSentiment,
  readingSeconds,
} from "@/lib/format";

type Row = { label: string; hint: string; original: string; rewritten: string; change: string };

export function MetricsTable({ metrics, overlapMeaningful }: { metrics: Metrics; overlapMeaningful: boolean }) {
  const rows: Row[] = [
    {
      label: "Words",
      hint: "Counted by Alter",
      original: formatInteger(metrics.word_count_original),
      rewritten: formatInteger(metrics.word_count_new),
      change: formatSignedInteger(metrics.word_count_change),
    },
    {
      label: "Reading time",
      hint: "At 238 words a minute",
      original: formatDuration(readingSeconds(metrics.word_count_original)),
      rewritten: formatDuration(readingSeconds(metrics.word_count_new)),
      change: formatReadingChange(metrics.word_count_original, metrics.word_count_new),
    },
    {
      label: "Sentiment",
      hint: "Estimate, −1 to +1",
      original: formatSentiment(metrics.sentiment_original),
      rewritten: formatSentiment(metrics.sentiment_new),
      change: formatSignedSentiment(metrics.sentiment_change),
    },
    {
      label: "Readability",
      hint: "Flesch, higher is easier",
      original: formatReadability(metrics.readability_original),
      rewritten: formatReadability(metrics.readability_new),
      change: formatSignedReadability(metrics.readability_change),
    },
  ];

  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">How the rewrite differs from your draft</caption>
        <thead>
          <tr className="text-left text-faint">
            <th scope="col" className="pb-2 font-normal">
              Metric
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Draft
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Rewrite
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Change
            </th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-line">
              <th scope="row" className="py-2 pr-2 text-left font-normal">
                <span className="block text-ink">{row.label}</span>
                <span className="block text-xs text-faint">{row.hint}</span>
              </th>
              <td className="py-2 text-right text-muted">{row.original}</td>
              <td className="py-2 text-right text-ink">{row.rewritten}</td>
              <td className="py-2 pl-2 text-right font-medium text-ink">{row.change}</td>
            </tr>
          ))}
          <tr className="border-t border-line">
            <th scope="row" className="py-2 pr-2 text-left font-normal">
              <span className="block text-ink">Phrase overlap</span>
              <span className="block text-xs text-faint">Shared word pairs</span>
            </th>
            <td colSpan={3} className="py-2 text-right font-medium text-ink">
              {overlapMeaningful ? formatPercent(metrics.phrase_overlap_percent) : "Not meaningful"}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-faint">
        Measured by Alter, not by the AI.{" "}
        <Link href="/methodology" className="text-muted underline underline-offset-2 hover:text-ink">
          How each number works
        </Link>
      </p>
    </div>
  );
}
