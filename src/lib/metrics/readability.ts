import { splitSentences, tokenize } from "./tokenize";

/**
 * Approximate English syllable count:
 * keep Latin letters only; words of three letters or fewer count as one; drop a trailing silent
 * "e", "es" or "ed" (but keep "le", and keep "es"/"ed" where they are voiced, as in "boxes" or
 * "wanted"); drop a leading "y"; count vowel groups; minimum one. Numbers count as one.
 */
export function countSyllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 1;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouytd]ed|[^laeiouysxz]es|[^laeiouy]e)$/, (m) => m[0]);
  w = w.replace(/^y/, "");
  const groups = w.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 0);
}

export type ReadabilityResult = { score: number; words: number; sentences: number; syllables: number };

/** Flesch Reading Ease: 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words). */
export function fleschReadingEase(text: string): ReadabilityResult {
  const words = tokenize(text);
  if (words.length === 0) return { score: 0, words: 0, sentences: 0, syllables: 0 };
  const sentences = Math.max(1, splitSentences(text).length);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const score = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
  return { score, words: words.length, sentences, syllables };
}
