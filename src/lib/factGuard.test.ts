import { describe, expect, it } from "vitest";
import { PERSONA_IDS } from "@/lib/contract";
import { checkFacts } from "./factGuard";
import { PRESETS } from "./presets";

const messages = (original: string, rewritten: string) => checkFacts(original, rewritten).map((w) => w.message);

describe("Fact Guard", () => {
  it("reports nothing when the rewrite equals the draft", () => {
    const draft = "Ship by March 3 with $5k budget. Priya owns QA, not Sam. 30 days notice.";
    expect(checkFacts(draft, draft)).toEqual([]);
  });

  it("flags dropped numbers, money, dates and names", () => {
    const draft = "Pay $5k within 30 days, starting March 3. Contact Priya for details.";
    const found = messages(draft, "Pay the fee soon. Contact the team for details.");
    expect(found).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"$5k"'),
        expect.stringContaining('"30"'),
        expect.stringContaining('"3"'),
        expect.stringContaining('"March"'),
        expect.stringContaining('"Priya"'),
      ]),
    );
  });

  it("treats digits and number words as the same fact", () => {
    expect(checkFacts("We need 3 more days.", "We need three more days.")).toEqual([]);
    expect(checkFacts("We need two more days.", "We need 2 more days.")).toEqual([]);
  });

  it("matches money and thousands separators by value", () => {
    expect(checkFacts("Budget is $48,000.", "The budget is $48k.")).toEqual([]);
  });

  it("flags a lost negation", () => {
    const codes = checkFacts("The bug is not fixed.", "The bug is fixed.").map((w) => w.code);
    expect(codes).toEqual(["negation_missing"]);
    expect(checkFacts("The bug is not fixed.", "The bug isn't fixed.")).toEqual([]);
  });

  it("ignores grammatical capitals such as sentence starts and I", () => {
    expect(checkFacts("Hey there. I think we should go.", "we should go")).toEqual([]);
  });

  it("finds no dropped facts in any built-in demo rewrite", () => {
    for (const preset of PRESETS) {
      for (const persona of PERSONA_IDS) {
        expect(checkFacts(preset.draft, preset.demo[persona]), `${preset.id} / ${persona}`).toEqual([]);
      }
    }
  });
});
