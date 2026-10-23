import { diffWords } from "diff";

export type DiffSegment = { kind: "same" | "added" | "removed"; text: string };

/** Word-level visual diff. Independent of the bigram phrase-overlap metric. */
export function wordDiff(original: string, rewritten: string): DiffSegment[] {
  return diffWords(original, rewritten).map((change) => ({
    kind: change.added ? "added" : change.removed ? "removed" : "same",
    text: change.value,
  }));
}
