import { describe, it, expect } from "vitest";
import { ElectronClipboardSource, type ClipboardLike } from "../../src/adapters/electronClipboard";

describe("ElectronClipboardSource", () => {
  it("reads text from the clipboard", () => {
    const clip: ClipboardLike = {
      readText: () => "hello",
      readImage: () => ({ isEmpty: () => true, toPNG: () => Buffer.alloc(0) }),
    };
    const src = new ElectronClipboardSource(clip, () => "/tmp/x.png", () => {});
    expect(src.read()).toEqual({ text: "hello", image: undefined });
  });

  it("writes a non-empty image to a temp file and returns its path", () => {
    let written: { path: string; bytes: number } | null = null;
    const clip: ClipboardLike = {
      readText: () => "",
      readImage: () => ({ isEmpty: () => false, toPNG: () => Buffer.from([1, 2, 3]) }),
    };
    const src = new ElectronClipboardSource(
      clip,
      () => "/tmp/clip.png",
      (path, buf) => { written = { path, bytes: buf.length }; },
    );
    const snap = src.read();
    expect(snap.image).toBe("/tmp/clip.png");
    expect(written).toEqual({ path: "/tmp/clip.png", bytes: 3 });
  });
});
