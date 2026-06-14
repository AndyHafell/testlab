import type { FusedContext, SwipeEntry } from "../domain/types";
import { engagementScore } from "../domain/engagement";

export const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    interesting: { type: "boolean" },
    x_thread: { type: "array", items: { type: "string" } },
    linkedin: { type: "string" },
    threads: { type: "string" },
    instagram: { type: "string" },
    facebook: { type: "string" },
    context: { type: "string" },
    why: { type: "string" },
  },
  required: [
    "interesting",
    "x_thread",
    "linkedin",
    "threads",
    "instagram",
    "facebook",
    "context",
    "why",
  ],
  additionalProperties: false,
} as const;

const STYLE_GUIDE = `Decide first whether this hour of work is interesting enough for a build-in-public post (set "interesting": false if it is just idle browsing, settings screens, or a repeat of a recent post).

If interesting, write:
- x_thread: an array containing exactly ONE standalone tweet (max 280 chars). Write a single strong post, NOT a thread. No hashtags. Casual dev voice.
- linkedin: 400-600 chars, professional but authentic, ends with a thought-provoking line. No hashtags, no emojis.
- threads: under 500 chars, conversational.
- instagram / facebook: a caption suitable for that platform.
- context: one line describing what is on screen / what was built.
- why: one line naming which signals drove this post.

Sound like a real developer sharing the messy process, not marketing. No "excited to announce" or "just shipped". Reference specific tech visible in the work (Claude Code, the actual files, languages).`;

export function buildPrompt(
  ctx: FusedContext,
  opts: { persona: string; swipeExamples: SwipeEntry[] },
): { system: string; user: string } {
  const examples = [...opts.swipeExamples]
    .sort((a, b) => engagementScore(b) - engagementScore(a))
    .map(
      (e, i) =>
        `Example ${i + 1} (${e.likes} likes, ${e.comments} comments): "${e.tweet}"`,
    )
    .join("\n");

  const exampleBlock = examples
    ? `\n\nHere are the creator's top-performing posts. Match this tone, length, and style:\n${examples}`
    : "";

  const system = `${opts.persona}\n\n${STYLE_GUIDE}${exampleBlock}`;

  const user = `Here is the last hour of the creator's work. Signals present: ${ctx.signalsUsed.join(", ")}.\n\n${ctx.text || "(no text signals; rely on the screenshot)"}`;

  return { system, user };
}
