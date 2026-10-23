/**
 * A word is a maximal run of Unicode letters, combining marks or digits, optionally joined by
 * internal apostrophes ("don't" is one word). Hyphens, punctuation, emoji and whitespace
 * (including line breaks and bullet markers) separate words.
 */
const WORD_PATTERN = /[\p{L}\p{M}\p{N}]+(?:'[\p{L}\p{M}\p{N}]+)*/gu;

/**
 * A sentence ends after . ! ? when followed by whitespace, or at any line break. Terminal
 * punctuation stays with its sentence because VADER reads "!" and "?" as emphasis.
 */
const SENTENCE_BREAK = /(?<=[.!?])\s+|\s*\n\s*/u;

export function normalizeText(text: string): string {
  return text.normalize("NFKC").replace(/[\u2018\u2019\u02BC]/g, "'");
}

export function tokenize(text: string): string[] {
  return normalizeText(text).match(WORD_PATTERN) ?? [];
}

export function countWords(text: string): number {
  return tokenize(text).length;
}

/** Sentences that contain at least one word. */
export function splitSentences(text: string): string[] {
  return normalizeText(text)
    .split(SENTENCE_BREAK)
    .map((s) => s.trim())
    .filter((s) => tokenize(s).length > 0);
}
