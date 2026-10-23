import { splitSentences } from "./tokenize";
import { SentimentIntensityAnalyzer } from "./vader/vaderSentiment.js";

export function vaderCompound(sentence: string): number {
  return SentimentIntensityAnalyzer.polarity_scores(sentence).compound;
}

/** Mean VADER compound score across sentences, bounded to [-1, 1]. Empty text scores 0. */
export function sentimentScore(text: string): number {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return 0;
  const total = sentences.reduce((sum, s) => sum + vaderCompound(s), 0);
  return Math.min(1, Math.max(-1, total / sentences.length));
}
