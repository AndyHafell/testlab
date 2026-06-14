import { readFile } from "node:fs/promises";
import type { FusedContext, GeneratedDraft, SwipeEntry } from "../domain/types";
import { buildPrompt, OUTPUT_SCHEMA } from "./prompt";

export interface GenerateOptions {
  persona: string;
  swipeExamples: SwipeEntry[];
}

export interface Generator {
  generate(ctx: FusedContext, opts: GenerateOptions): Promise<GeneratedDraft>;
}

/** Minimal slice of the Anthropic SDK surface we use. */
export interface AnthropicLike {
  messages: {
    create(params: any): Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

export const MODEL = "claude-sonnet-4-6";

export class ClaudeGenerator implements Generator {
  constructor(
    private readonly client: AnthropicLike,
    private readonly readImageBase64: (path: string) => Promise<string> = async (p) =>
      (await readFile(p)).toString("base64"),
  ) {}

  async generate(ctx: FusedContext, opts: GenerateOptions): Promise<GeneratedDraft> {
    const { system, user } = buildPrompt(ctx, opts);

    const content: any[] = [];
    if (ctx.imagePath) {
      const data = await this.readImageBase64(ctx.imagePath);
      content.push({
        type: "image",
        source: { type: "base64", media_type: "image/png", data },
      });
    }
    content.push({ type: "text", text: user });

    const resp = await this.client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      system,
      messages: [{ role: "user", content }],
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock?.text) throw new Error("generator returned no text block");
    return JSON.parse(textBlock.text) as GeneratedDraft;
  }
}
