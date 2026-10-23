import { tokenize } from "./tokenize";

/** Unique adjacent-word pairs after lowercasing. Punctuation is dropped by the tokenizer, so it never breaks a pair. */
export function bigramSet(text: string): Set<string> {
  const words = tokenize(text).map((w) => w.toLowerCase());
  const pairs = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    pairs.add(`${words[i]} ${words[i + 1]}`);
  }
  return pairs;
}

export type OverlapResult = { percent: number; meaningful: boolean };

/** Jaccard similarity of the two bigram sets, times 100. */
export function phraseOverlap(original: string, rewritten: string): OverlapResult {
  const a = bigramSet(original);
  const b = bigramSet(rewritten);
  let intersection = 0;
  for (const pair of a) if (b.has(pair)) intersection++;
  const union = a.size + b.size - intersection;
  if (union === 0) return { percent: 0, meaningful: false };
  return { percent: (intersection / union) * 100, meaningful: true };
}
