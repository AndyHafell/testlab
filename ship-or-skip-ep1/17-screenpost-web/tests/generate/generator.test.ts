import { describe, it, expect } from "vitest";
import { ClaudeGenerator, type AnthropicLike } from "../../src/generate/generator";
import type { FusedContext } from "../../src/domain/types";

const ctx: FusedContext = { text: "built the scheduler", signalsUsed: ["transcript"] };

describe("ClaudeGenerator", () => {
  it("returns the parsed structured output and forwards model + schema", async () => {
    let received: any;
    const fake: AnthropicLike = {
      messages: {
        create: async (params: any) => {
          received = params;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  interesting: true,
                  x_thread: ["hook", "detail"],
                  linkedin: "li",
                  threads: "th",
                  instagram: "ig",
                  facebook: "fb",
                  context: "built the scheduler",
                  why: "transcript",
                }),
              },
            ],
          };
        },
      },
    };
    const gen = new ClaudeGenerator(fake);
    const out = await gen.generate(ctx, { persona: "P", swipeExamples: [] });
    expect(out.interesting).toBe(true);
    expect(out.x_thread).toEqual(["hook", "detail"]);
    expect(received.model).toBe("claude-sonnet-4-6");
    expect(received.output_config.format.schema.required).toContain("interesting");
  });

  it("sends the screenshot as a base64 image block when present", async () => {
    let received: any;
    const fake: AnthropicLike = {
      messages: {
        create: async (params: any) => {
          received = params;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  interesting: false,
                  x_thread: [],
                  linkedin: "",
                  threads: "",
                  instagram: "",
                  facebook: "",
                  context: "",
                  why: "",
                }),
              },
            ],
          };
        },
      },
    };
    const gen = new ClaudeGenerator(fake, async () => "BASE64DATA");
    await gen.generate(
      { ...ctx, imagePath: "/tmp/a.png" },
      { persona: "P", swipeExamples: [] },
    );
    const blocks = received.messages[0].content;
    const image = blocks.find((b: any) => b.type === "image");
    expect(image.source.data).toBe("BASE64DATA");
    expect(image.source.media_type).toBe("image/png");
  });
});
