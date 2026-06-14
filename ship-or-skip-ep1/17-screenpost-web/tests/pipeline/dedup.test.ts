import { describe, it, expect } from "vitest";
import { isNearDuplicate, normalizeForCompare } from "../../src/pipeline/dedup";

describe("dedup", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeForCompare("  Hello   WORLD ")).toBe("hello world");
  });

  it("flags a context that is near-identical to a recent one", () => {
    const recent = ["built the hourly scheduler and wired it up"];
    expect(isNearDuplicate("Built the hourly scheduler and wired it up.", recent)).toBe(true);
  });

  it("does not flag clearly different context", () => {
    const recent = ["built the hourly scheduler"];
    expect(isNearDuplicate("designed the approval queue UI", recent)).toBe(false);
  });
});
