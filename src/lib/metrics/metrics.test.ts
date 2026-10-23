import { describe, expect, it } from "vitest";
import { metricsSchema } from "@/lib/contract";
import { computeMetrics } from "./index";
import { phraseOverlap } from "./overlap";
import { countSyllables, fleschReadingEase } from "./readability";
import { sentimentScore, vaderCompound } from "./sentiment";
import { countWords, splitSentences, tokenize } from "./tokenize";

describe("tokenize", () => {
  it.each([
    ["", 0],
    ["   \n\t ", 0],
    ["hello", 1],
    ["don't stop", 2],
    ["don\u2019t stop", 2],
    ["follow-up meeting", 3],
    ["Wait... what?!", 2],
    ["ship it 🚀🔥 now", 3],
    ["line one\nline two\r\nline three", 6],
    ["- first item\n- second item\n• third", 5],
    ["café naïve résumé", 3],
    ["3.5 million, 20% and $48k", 6],
    ["<script>alert('x')</script>", 4],
    ["東京 is big", 3],
  ])("counts words in %j as %i", (text, expected) => {
    expect(countWords(text)).toBe(expected);
  });

  it("keeps contractions and possessives as single tokens", () => {
    expect(tokenize("We can't use Priya's notes")).toEqual(["We", "can't", "use", "Priya's", "notes"]);
  });

  it("splits sentences on terminal punctuation and line breaks, not decimals", () => {
    expect(splitSentences("Revenue is 3.5 million. Great!\n- next item\n\n...")).toEqual([
      "Revenue is 3.5 million.",
      "Great!",
      "- next item",
    ]);
  });
});

describe("phrase overlap", () => {
  it("is 100 for identical texts regardless of case and punctuation", () => {
    expect(phraseOverlap("The launch moves.", "the LAUNCH moves").percent).toBe(100);
  });

  it("is 0 for disjoint texts", () => {
    expect(phraseOverlap("red green blue", "one two three")).toEqual({ percent: 0, meaningful: true });
  });

  it("computes Jaccard of unique bigrams", () => {
    // {a b, b c} vs {a b, b d}: intersection 1, union 3.
    expect(phraseOverlap("a b c", "a b d").percent).toBeCloseTo(100 / 3, 10);
  });

  it("is not meaningful when neither text has a bigram", () => {
    expect(phraseOverlap("hi", "hello")).toEqual({ percent: 0, meaningful: false });
  });

  it("does not let punctuation break a pair", () => {
    expect(phraseOverlap("launch, friday", "launch friday").percent).toBe(100);
  });
});

describe("readability", () => {
  it.each([
    ["the", 1],
    ["cake", 1],
    ["simple", 2],
    ["jumped", 1],
    ["wanted", 2],
    ["boxes", 2],
    ["readability", 5],
    ["yellow", 2],
    ["2026", 1],
  ])("estimates %s as %i syllables", (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });

  it("applies the Flesch formula", () => {
    // 4 words, 1 sentence, 4 syllables.
    const expected = 206.835 - 1.015 * 4 - 84.6 * 1;
    expect(fleschReadingEase("The cat sat down.").score).toBeCloseTo(expected, 10);
  });

  it("returns 0 for empty text and allows scores outside 0-100", () => {
    expect(fleschReadingEase("").score).toBe(0);
    expect(fleschReadingEase("Go.").score).toBeGreaterThan(100);
  });
});

describe("sentiment", () => {
  it("matches the reference VADER implementation", () => {
    expect(vaderCompound("VADER is smart, handsome, and funny.")).toBe(0.8316);
    expect(vaderCompound("VADER is not smart, handsome, nor funny.")).toBe(-0.7424);
    expect(vaderCompound("The book was kind of good.")).toBe(0.3832);
  });

  it("flips polarity under negation and stays within [-1, 1]", () => {
    expect(sentimentScore("This is not good.")).toBeLessThan(0);
    const extreme = sentimentScore("AMAZING!!! WONDERFUL!!! BEST EVER!!! LOVE LOVE LOVE!!!");
    expect(extreme).toBeLessThanOrEqual(1);
    expect(extreme).toBeGreaterThan(0.5);
  });

  it("averages sentence scores and returns 0 for empty text", () => {
    const a = vaderCompound("This is great");
    const b = vaderCompound("This is terrible");
    expect(sentimentScore("This is great. This is terrible.")).toBeCloseTo((a + b) / 2, 10);
    expect(sentimentScore("")).toBe(0);
  });
});

describe("computeMetrics", () => {
  const original = "hey guys, pushing launch to friday. few things to fix.";
  const rewritten = "Launch moves to Friday so we can fix a few remaining issues.";

  it("returns every change as new minus original, unrounded", () => {
    const { metrics } = computeMetrics(original, rewritten);
    expect(metrics.word_count_change).toBe(metrics.word_count_new - metrics.word_count_original);
    expect(metrics.sentiment_change).toBe(metrics.sentiment_new - metrics.sentiment_original);
    expect(metrics.readability_change).toBe(metrics.readability_new - metrics.readability_original);
  });

  it("always produces finite numbers that satisfy the contract schema", () => {
    for (const [a, b] of [
      [original, rewritten],
      ["hi", "hello"],
      ["", "x"],
      ["🚀", "🔥"],
      ["東京は大きい", "東京はとても大きい"],
    ]) {
      const { metrics } = computeMetrics(a, b);
      expect(metricsSchema.safeParse(metrics).success).toBe(true);
      for (const value of Object.values(metrics)) expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("warns about short text, missing bigrams and non-English input", () => {
    expect(computeMetrics("hi", "hello").warnings.map((w) => w.code)).toEqual([
      "short_text_low_reliability",
      "overlap_not_meaningful",
    ]);
    expect(computeMetrics("東京はとても大きい都市です", "東京は大都市です").warnings.map((w) => w.code)).toContain(
      "non_english_metrics",
    );
    expect(computeMetrics("", "x").warnings.map((w) => w.code)).toContain("empty_text_metrics");
  });
});
