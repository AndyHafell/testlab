import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Collector } from "./collector";
import type { Signal } from "../domain/types";

const execFileP = promisify(execFile);

/** Captures the screen to `dest`; resolves true if the file now exists. */
export type CaptureFn = (dest: string) => Promise<boolean>;

/** Default macOS capture: silent, full-screen, via /usr/sbin/screencapture. */
export const macScreencapture: CaptureFn = async (dest) => {
  try {
    await execFileP("/usr/sbin/screencapture", ["-x", dest]);
  } catch {
    return false;
  }
  return existsSync(dest);
};

export class ScreenshotCollector implements Collector {
  constructor(
    private readonly capture: CaptureFn = macScreencapture,
    private readonly destPath: () => string = () =>
      join(tmpdir(), `screenpost_${Date.now()}.png`),
  ) {}

  async collect(_startMs: number, _endMs: number): Promise<Signal> {
    const dest = this.destPath();
    try {
      const ok = await this.capture(dest);
      return ok
        ? { kind: "screenshot", ok: true, imagePath: dest }
        : { kind: "screenshot", ok: false };
    } catch (e) {
      return { kind: "screenshot", ok: false, error: String(e) };
    }
  }
}
