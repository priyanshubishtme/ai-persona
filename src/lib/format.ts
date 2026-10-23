/** Average adult silent-reading speed used for the reading-time estimate. */
export const WORDS_PER_MINUTE = 238;

const MINUS = "\u2212";

function signed(value: number, digits: number): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return (0).toFixed(digits);
  return rounded > 0 ? `+${rounded.toFixed(digits)}` : `${MINUS}${Math.abs(rounded).toFixed(digits)}`;
}

function plain(value: number, digits: number): string {
  const rounded = Number(value.toFixed(digits));
  return rounded < 0 ? `${MINUS}${Math.abs(rounded).toFixed(digits)}` : rounded.toFixed(digits);
}

export const formatInteger = (n: number) => plain(n, 0);
export const formatSignedInteger = (n: number) => signed(n, 0);
export const formatSentiment = (n: number) => plain(n, 2);
export const formatSignedSentiment = (n: number) => signed(n, 2);
export const formatReadability = (n: number) => plain(n, 1);
export const formatSignedReadability = (n: number) => signed(n, 1);
export const formatPercent = (n: number) => `${plain(n, 0)}%`;

export function readingSeconds(words: number): number {
  return (words / WORDS_PER_MINUTE) * 60;
}

export function formatDuration(seconds: number): string {
  const total = Math.round(Math.abs(seconds));
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
}

export function formatReadingChange(originalWords: number, newWords: number): string {
  const delta = readingSeconds(newWords) - readingSeconds(originalWords);
  const rounded = Math.round(delta);
  if (rounded === 0) return "same";
  return rounded < 0 ? `${formatDuration(delta)} faster` : `${formatDuration(delta)} longer`;
}
