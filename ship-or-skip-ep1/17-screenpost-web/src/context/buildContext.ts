import type { Signal, FusedContext, SignalKind } from "../domain/types";

const TEXT_BUDGET = 6000;

const LABELS: Record<SignalKind, string> = {
  screenshot: "SCREENSHOT",
  transcript: "CLAUDE TRANSCRIPT (this hour)",
  gitFiles: "CODE CHANGES (git)",
  clipboard: "CLIPBOARD",
};

export function buildContext(signals: Signal[]): FusedContext {
  const used: SignalKind[] = [];
  const sections: string[] = [];
  let imagePath: string | undefined;

  for (const s of signals) {
    if (!s.ok) continue;
    if (s.kind === "screenshot") {
      if (s.imagePath) {
        imagePath = s.imagePath;
        used.push("screenshot");
      }
      continue;
    }
    if (s.text && s.text.trim()) {
      sections.push(`## ${LABELS[s.kind]}\n${s.text.trim()}`);
      used.push(s.kind);
    }
  }

  const text = sections.join("\n\n").slice(0, TEXT_BUDGET);
  return { imagePath, text, signalsUsed: used };
}
