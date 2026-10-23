import type { Warning } from "@/lib/contract";
import { normalizeText, tokenize } from "@/lib/metrics/tokenize";

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
};
// "one" is left out: it is far more often a pronoun ("one of the things") than a quantity.

const MONTHS = [
  "january", "february", "march", "april", "june", "july", "august", "september", "october",
  "november", "december",
];
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const NEGATIONS = new Set([
  "not", "no", "never", "cannot", "without", "unless", "none", "nobody", "nothing", "neither", "nor",
  "nowhere", "nope", "nah",
]);

/** Words that are capitalised for grammar, not because they name something. */
const CAPITALISED_NON_NAMES = new Set([
  "i", "i'm", "i'll", "i've", "i'd", "ok", "okay", "hi", "hey", "hello", "thanks", "please",
]);

const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/g;
const NUMBER = /([$€£₹]\s?)?(\d[\d,]*(?:\.\d+)?)\s?(%|am|pm|k|m|bn)?(?![\p{L}\d])/giu;
const MULTIPLIER: Record<string, number> = { k: 1e3, m: 1e6, bn: 1e9 };

type NumberFact = { surface: string; value: number };

function extractNumbers(text: string): NumberFact[] {
  const facts: NumberFact[] = [];
  for (const match of text.replace(ISO_DATE, " ").matchAll(NUMBER)) {
    const core = Number(match[2].replace(/,/g, ""));
    if (!Number.isFinite(core)) continue;
    const suffix = match[3]?.toLowerCase();
    const value = core * (suffix && MULTIPLIER[suffix] ? MULTIPLIER[suffix] : 1);
    facts.push({ surface: match[0].trim(), value });
  }
  for (const word of tokenize(text)) {
    const value = NUMBER_WORDS[word.toLowerCase()];
    if (value !== undefined) facts.push({ surface: word, value });
  }
  return facts;
}

function numberValues(text: string): Set<number> {
  return new Set(extractNumbers(text).map((f) => f.value));
}

function hasNegation(words: string[]): boolean {
  return words.some((w) => {
    const lower = w.toLowerCase();
    return NEGATIONS.has(lower) || lower.endsWith("n't");
  });
}

/** Capitalised words, and runs of them, that do not start a sentence or line. */
function extractNames(text: string): string[] {
  const names: string[] = [];
  for (const line of text.split(/\n+/)) {
    const sentences = line.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      const words = sentence.replace(/^[\s\-*•–—\d.)]+/, "").split(/\s+/).filter(Boolean);
      let run: string[] = [];
      const flush = () => {
        if (run.length) names.push(run.join(" "));
        run = [];
      };
      words.forEach((raw, index) => {
        const word = raw.replace(/^[^\p{L}]+|[^\p{L}']+$/gu, "");
        const isCapitalised = /^\p{Lu}/u.test(word);
        const isCandidate =
          index > 0 &&
          isCapitalised &&
          !CAPITALISED_NON_NAMES.has(word.toLowerCase()) &&
          !MONTHS.includes(word.toLowerCase()) &&
          !WEEKDAYS.includes(word.toLowerCase());
        if (isCandidate) run.push(word.replace(/'s$/, ""));
        else flush();
        if (/[,;:]$/.test(raw)) flush();
      });
      flush();
    }
  }
  return names;
}

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Heuristic, warn-only check that facts in the original still appear in the rewrite.
 * Matching is case-insensitive; numbers match by value, so "3", "three" and "3.0" are equal.
 */
export function checkFacts(original: string, rewritten: string): Warning[] {
  const source = normalizeText(original);
  const target = normalizeText(rewritten);
  const targetLower = target.toLowerCase();
  const targetWords = new Set(tokenize(target).map((w) => w.toLowerCase()));
  const targetNumbers = numberValues(target);
  const warnings: Warning[] = [];

  for (const fact of unique(extractNumbers(source), (f) => String(f.value))) {
    if (!targetNumbers.has(fact.value)) {
      warnings.push({ code: "fact_missing", message: `"${fact.surface}" from the draft is not in the rewrite.` });
    }
  }

  for (const date of unique(source.match(ISO_DATE) ?? [], (d) => d)) {
    if (!target.includes(date)) {
      warnings.push({ code: "fact_missing", message: `The date "${date}" from the draft is not in the rewrite.` });
    }
  }

  const sourceWords = tokenize(source);
  for (const word of unique(sourceWords.map((w) => w.toLowerCase()), (w) => w)) {
    if ((MONTHS.includes(word) || WEEKDAYS.includes(word)) && !targetWords.has(word)) {
      const surface = word[0].toUpperCase() + word.slice(1);
      warnings.push({ code: "fact_missing", message: `"${surface}" from the draft is not in the rewrite.` });
    }
  }

  for (const name of unique(extractNames(source), (n) => n.toLowerCase())) {
    if (!targetLower.includes(name.toLowerCase())) {
      warnings.push({ code: "fact_missing", message: `"${name}" from the draft is not in the rewrite.` });
    }
  }

  if (hasNegation(sourceWords) && !hasNegation(tokenize(target))) {
    warnings.push({
      code: "negation_missing",
      message: "The draft contains a negation (such as \"not\" or \"never\"), but the rewrite has none. Check that the meaning did not flip.",
    });
  }

  return warnings;
}
