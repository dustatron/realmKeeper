import { describe, it, expect } from "vitest";
import { summarizeResult } from "./EncounterCascade";
import type { EncounterRollResult } from "@domain/value-objects/EncounterRollResult";

function baseResult(overrides: Partial<EncounterRollResult>): EncounterRollResult {
  return {
    masterRoll: 1,
    category: "creature",
    categoryLabel: "Creature",
    entryIndex: 0,
    entryText: "A pack of wolves",
    rolledAt: 0,
    ...overrides,
  };
}

describe("summarizeResult", () => {
  it("appends the reaction when present", () => {
    const r = baseResult({ reaction: "hostile" });
    expect(summarizeResult(r)).toBe("A pack of wolves — hostile");
  });

  it("omits the reaction separator when absent", () => {
    const r = baseResult({});
    expect(summarizeResult(r)).toBe("A pack of wolves");
  });

  it("falls back to the category label when entry text is empty", () => {
    const r = baseResult({ entryText: "" });
    expect(summarizeResult(r)).toBe("Creature");
  });
});
