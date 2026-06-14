import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Collector } from "./collector";
import type { Signal } from "../domain/types";

const execFileP = promisify(execFile);

/** Runs a git subcommand string in cwd and returns stdout. */
export type CommandRunner = (cmd: string, cwd: string) => Promise<string>;

export const defaultRunner: CommandRunner = async (cmd, cwd) => {
  const args = cmd.split(" ").filter(Boolean);
  const { stdout } = await execFileP(args[0], args.slice(1), { cwd });
  return stdout;
};

export class GitFilesCollector implements Collector {
  constructor(
    private readonly folders: string[],
    private readonly run: CommandRunner = defaultRunner,
  ) {}

  async collect(_startMs: number, _endMs: number): Promise<Signal> {
    const parts: string[] = [];
    for (const folder of this.folders) {
      try {
        await this.run("git rev-parse --is-inside-work-tree", folder);
        const stat = (await this.run("git diff --stat", folder)).trim();
        if (stat) parts.push(`# ${folder}\n${stat}`);
      } catch {
        // not a repo or git unavailable — skip this folder
      }
    }
    const text = parts.join("\n\n").trim();
    return text
      ? { kind: "gitFiles", ok: true, text }
      : { kind: "gitFiles", ok: false, text: "" };
  }
}
