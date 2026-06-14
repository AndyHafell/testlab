import { describe, it, expect } from "vitest";
import { makeUploader } from "../../src/adapters/imageUpload";

describe("makeUploader", () => {
  it("posts the file bytes and returns the hosted URL", async () => {
    let calledUrl = "";
    const fakeFetch = async (url: string, _init?: any): Promise<any> => {
      calledUrl = url;
      return { ok: true, status: 200, text: async () => "https://host/abc.png" };
    };
    const upload = makeUploader({
      fetchFn: fakeFetch as any,
      readFile: async () => Buffer.from([1, 2, 3]),
      endpoint: "https://0x0.st",
    });
    const url = await upload("/tmp/a.png");
    expect(url).toBe("https://host/abc.png");
    expect(calledUrl).toBe("https://0x0.st");
  });

  it("throws when the host returns non-ok", async () => {
    const fakeFetch = async (): Promise<any> => ({ ok: false, status: 500, text: async () => "" });
    const upload = makeUploader({
      fetchFn: fakeFetch as any,
      readFile: async () => Buffer.alloc(0),
      endpoint: "https://0x0.st",
    });
    await expect(upload("/tmp/a.png")).rejects.toThrow(/500/);
  });
});
