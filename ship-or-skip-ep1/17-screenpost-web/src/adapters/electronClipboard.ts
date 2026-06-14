import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ClipboardSource, ClipboardSnapshot } from "../collectors/clipboard";

export interface NativeImageLike {
  isEmpty(): boolean;
  toPNG(): Buffer;
}

export interface ClipboardLike {
  readText(): string;
  readImage(): NativeImageLike;
}

export class ElectronClipboardSource implements ClipboardSource {
  constructor(
    private readonly clipboard: ClipboardLike,
    private readonly destPath: () => string = () => join(tmpdir(), `clip_${Date.now()}.png`),
    private readonly writeFile: (path: string, bytes: Buffer) => void = (p, b) => writeFileSync(p, b),
  ) {}

  read(): ClipboardSnapshot {
    const text = this.clipboard.readText() ?? "";
    const img = this.clipboard.readImage();
    if (!img.isEmpty()) {
      const path = this.destPath();
      this.writeFile(path, img.toPNG());
      return { text, image: path };
    }
    return { text, image: undefined };
  }
}
