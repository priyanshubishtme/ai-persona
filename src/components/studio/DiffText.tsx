import { wordDiff } from "@/lib/wordDiff";

export function DiffText({ original, rewritten }: { original: string; rewritten: string }) {
  return (
    <>
      {wordDiff(original, rewritten).map((segment, index) => {
        if (segment.kind === "added") {
          return (
            <ins key={index} className="diff-added">
              <span className="sr-only">[added: </span>
              {segment.text}
              <span className="sr-only">]</span>
            </ins>
          );
        }
        if (segment.kind === "removed") {
          return (
            <del key={index} className="diff-removed">
              <span className="sr-only">[removed: </span>
              {segment.text}
              <span className="sr-only">]</span>
            </del>
          );
        }
        return <span key={index}>{segment.text}</span>;
      })}
    </>
  );
}
