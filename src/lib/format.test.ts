import { describe, expect, it } from "vitest";
import { formatPercent, formatReadingChange, formatSignedReadability, formatSignedSentiment } from "./format";
import { wordDiff } from "./wordDiff";

describe("display formatting", () => {
  it("rounds only for display and uses a true minus sign", () => {
    expect(formatSignedSentiment(0.12345)).toBe("+0.12");
    expect(formatSignedSentiment(-0.5)).toBe("\u22120.50");
    expect(formatSignedSentiment(-0.001)).toBe("0.00");
    expect(formatSignedReadability(12.06)).toBe("+12.1");
    expect(formatPercent(33.333)).toBe("33%");
  });

  it("describes reading time change", () => {
    expect(formatReadingChange(238, 119)).toBe("30s faster");
    expect(formatReadingChange(10, 10)).toBe("same");
    expect(formatReadingChange(0, 476)).toBe("2m 00s longer");
  });
});

describe("wordDiff", () => {
  it("marks removed and added words and reconstructs both texts", () => {
    const segments = wordDiff("pushing launch to friday", "moving launch to Friday");
    const original = segments.filter((s) => s.kind !== "added").map((s) => s.text).join("");
    const rewritten = segments.filter((s) => s.kind !== "removed").map((s) => s.text).join("");
    expect(original).toBe("pushing launch to friday");
    expect(rewritten).toBe("moving launch to Friday");
    expect(segments.some((s) => s.kind === "removed" && s.text.includes("pushing"))).toBe(true);
  });
});
