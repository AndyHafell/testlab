import { createHash, randomUUID } from "node:crypto";
import type { Collector } from "./collector";
import type { Signal, ClipItem } from "../domain/types";
import type { Store } from "../store/store";

export interface ClipboardSnapshot {
  text: string;
  /** Absolute path to a saved clipboard image, if any. */
  image?: string;
}

export interface ClipboardSource {
  read(): ClipboardSnapshot;
}

export class ClipboardCollector implements Collector {
  constructor(
    private readonly store: Store,
    private readonly source: ClipboardSource,
    private readonly nowIso: () => string,
  ) {}

  async collect(_startMs: number, _endMs: number): Promise<Signal> {
    const snap = this.source.read();
    const hasText = snap.text.trim().length > 0;
    const hasImage = Boolean(snap.image);
    if (!hasText && !hasImage) {
      return { kind: "clipboard", ok: false, text: "" };
    }
    const hash = createHash("sha1")
      .update(hasImage ? `img:${snap.image}` : `txt:${snap.text}`)
      .digest("hex");
    if (this.store.hasClipHash(hash)) {
      return { kind: "clipboard", ok: false, text: "" };
    }
    const clip: ClipItem = {
      id: randomUUID(),
      kind: hasImage ? "image" : "text",
      createdAt: this.nowIso(),
      sourceApp: "",
      textContent: hasText ? snap.text : undefined,
      imagePath: snap.image,
      hash,
    };
    this.store.addClip(clip);
    const text = hasText ? `clipboard: ${snap.text.slice(0, 500)}` : "clipboard: [image copied]";
    return { kind: "clipboard", ok: true, text };
  }
}
