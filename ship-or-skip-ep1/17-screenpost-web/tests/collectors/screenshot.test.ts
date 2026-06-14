import { describe, it, expect } from "vitest";
import { ScreenshotCollector } from "../../src/collectors/screenshot";

describe("ScreenshotCollector", () => {
  it("returns the captured image path on success", async () => {
    const capture = async (_dest: string): Promise<boolean> => true;
    const c = new ScreenshotCollector(capture, () => "/tmp/shot.png");
    const sig = await c.collect(0, 1000);
    expect(sig.kind).toBe("screenshot");
    expect(sig.ok).toBe(true);
    expect(sig.imagePath).toBe("/tmp/shot.png");
  });

  it("returns ok:false when capture fails", async () => {
    const capture = async (): Promise<boolean> => false;
    const c = new ScreenshotCollector(capture, () => "/tmp/shot.png");
    const sig = await c.collect(0, 1000);
    expect(sig.ok).toBe(false);
  });
});
