import { describe, it, expect } from "vitest";
import { GitFilesCollector } from "../../src/collectors/gitFiles";

describe("GitFilesCollector", () => {
  it("summarizes git diff --stat for each watched folder", async () => {
    const runner = async (cmd: string, _cwd: string): Promise<string> => {
      if (cmd.includes("rev-parse")) return "true";
      if (cmd.includes("diff")) return " src/a.ts | 10 +++++\n 1 file changed";
      return "";
    };
    const c = new GitFilesCollector(["/repo"], runner);
    const sig = await c.collect(0, 1000);
    expect(sig.kind).toBe("gitFiles");
    expect(sig.ok).toBe(true);
    expect(sig.text).toContain("src/a.ts");
  });

  it("returns ok:false when a folder is not a git repo and nothing else changed", async () => {
    const runner = async (cmd: string): Promise<string> => {
      if (cmd.includes("rev-parse")) throw new Error("not a repo");
      return "";
    };
    const c = new GitFilesCollector(["/not-a-repo"], runner);
    const sig = await c.collect(0, 1000);
    expect(sig.ok).toBe(false);
  });
});
