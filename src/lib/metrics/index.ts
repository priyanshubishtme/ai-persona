import type { Metrics, Warning } from "@/lib/contract";
import { phraseOverlap } from "./overlap";
import { fleschReadingEase } from "./readability";
import { sentimentScore } from "./sentiment";
import { countWords } from "./tokenize";

export const SHORT_TEXT_WORDS = 30;

function latinShare(text: string): number | null {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return null;
  const latin = text.match(/\p{Script=Latin}/gu)?.length ?? 0;
  return latin / letters;
}

/** All ten contract metrics, unrounded. Every change is new minus original. */
export function computeMetrics(original: string, rewritten: string): { metrics: Metrics; warnings: Warning[] } {
  const wordsOriginal = countWords(original);
  const wordsNew = countWords(rewritten);
  const sentimentOriginal = sentimentScore(original);
  const sentimentNew = sentimentScore(rewritten);
  const readabilityOriginal = fleschReadingEase(original).score;
  const readabilityNew = fleschReadingEase(rewritten).score;
  const overlap = phraseOverlap(original, rewritten);

  const warnings: Warning[] = [];
  if (wordsOriginal === 0 || wordsNew === 0) {
    warnings.push({
      code: "empty_text_metrics",
      message: "One of the texts has no words, so its readability and sentiment are reported as 0.",
    });
  } else if (wordsOriginal < SHORT_TEXT_WORDS || wordsNew < SHORT_TEXT_WORDS) {
    warnings.push({
      code: "short_text_low_reliability",
      message: `Readability and sentiment are less reliable for texts under ${SHORT_TEXT_WORDS} words.`,
    });
  }
  if (!overlap.meaningful) {
    warnings.push({
      code: "overlap_not_meaningful",
      message: "Neither text has two words in a row, so phrase overlap is not meaningful here.",
    });
  }
  const share = latinShare(original);
  if (share !== null && share < 0.5) {
    warnings.push({
      code: "non_english_metrics",
      message: "Readability and sentiment are calibrated for English and are unreliable for this text.",
    });
  }

  return {
    metrics: {
      word_count_original: wordsOriginal,
      word_count_new: wordsNew,
      word_count_change: wordsNew - wordsOriginal,
      sentiment_original: sentimentOriginal,
      sentiment_new: sentimentNew,
      sentiment_change: sentimentNew - sentimentOriginal,
      readability_original: readabilityOriginal,
      readability_new: readabilityNew,
      readability_change: readabilityNew - readabilityOriginal,
      phrase_overlap_percent: overlap.percent,
    },
    warnings,
  };
}
