import { describe, it, expect } from "vitest";
import { buildContext } from "../../src/context/buildContext";
import type { Signal } from "../../src/domain/types";

describe("buildContext", () => {
  it("fuses text signals and takes the screenshot path, listing used signals", () => {
    const signals: Signal[] = [
      { kind: "screenshot", ok: true, imagePath: "/tmp/a.png" },
      { kind: "transcript", ok: true, text: "added scheduler.ts" },
      { kind: "gitFiles", ok: true, text: "src/a.ts | 10 +++" },
      { kind: "clipboard", ok: false, text: "" },
    ];
    const ctx = buildContext(signals);
    expect(ctx.imagePath).toBe("/tmp/a.png");
    expect(ctx.text).toContain("added scheduler.ts");
    expect(ctx.text).toContain("src/a.ts");
    expect(ctx.signalsUsed).toEqual(["screenshot", "transcript", "gitFiles"]);
  });

  it("omits the image when the screenshot signal failed", () => {
    const ctx = buildContext([
      { kind: "screenshot", ok: false },
      { kind: "transcript", ok: true, text: "x" },
    ]);
    expect(ctx.imagePath).toBeUndefined();
    expect(ctx.signalsUsed).toEqual(["transcript"]);
  });
});
