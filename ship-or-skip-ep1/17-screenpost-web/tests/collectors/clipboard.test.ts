import { describe, it, expect } from "vitest";
import { Store } from "../../src/store/store";
import { ClipboardCollector, type ClipboardSource } from "../../src/collectors/clipboard";

describe("ClipboardCollector", () => {
  it("records a new text clip and digests it; dedups on second read", async () => {
    const store = new Store(":memory:");
    const source: ClipboardSource = {
      read: () => ({ text: "copied a useful snippet", image: undefined }),
    };
    const c = new ClipboardCollector(store, source, () => "2026-06-14T10:00:00.000Z");

    const first = await c.collect(0, 1000);
    expect(first.ok).toBe(true);
    expect(first.text).toContain("useful snippet");
    expect(store.listClips(10, 0)).toHaveLength(1);

    const second = await c.collect(0, 1000);
    expect(second.ok).toBe(false); // same content → deduped → no new signal
    expect(store.listClips(10, 0)).toHaveLength(1);
  });

  it("returns ok:false when the clipboard is empty", async () => {
    const store = new Store(":memory:");
    const source: ClipboardSource = { read: () => ({ text: "", image: undefined }) };
    const c = new ClipboardCollector(store, source, () => "2026-06-14T10:00:00.000Z");
    const sig = await c.collect(0, 1000);
    expect(sig.ok).toBe(false);
  });
});
