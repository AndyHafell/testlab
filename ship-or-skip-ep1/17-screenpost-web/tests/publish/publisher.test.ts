import { describe, it, expect } from "vitest";
import { BlotatoPublisher } from "../../src/publish/publisher";
import type { Draft } from "../../src/domain/types";

function draft(): Draft {
  return {
    id: "d1",
    createdAt: "2026-06-14T10:00:00.000Z",
    status: "pending",
    context: "c",
    why: "w",
    imagePath: "/tmp/a.png",
    content: {
      twitter: ["hook", "reply"],
      linkedin: "li",
      threads: "th",
      instagram: "ig",
      facebook: "fb",
    },
  };
}

describe("BlotatoPublisher", () => {
  it("uploads the image once and posts each enabled platform", async () => {
    const calls: string[] = [];
    const fakeFetch = async (url: string, _init?: any): Promise<any> => {
      calls.push(url);
      return { ok: true, status: 200, json: async () => ({ url: "https://blotato/m.png" }) };
    };
    const pub = new BlotatoPublisher({
      apiKey: "k",
      accountIds: { twitter: "1", linkedin: "2" },
      facebookPageId: "fb1",
      fetchFn: fakeFetch as any,
      uploadImage: async () => "https://host/a.png",
    });
    const res = await pub.publish(draft(), ["twitter", "linkedin"]);
    expect(res.perPlatform.twitter.ok).toBe(true);
    expect(res.perPlatform.linkedin.ok).toBe(true);
    // media endpoint + 2 platform posts (twitter has 1 image-bearing first tweet here)
    expect(calls.filter((u) => u.includes("/posts")).length).toBeGreaterThanOrEqual(2);
  });

  it("marks a platform failed when the API returns non-ok", async () => {
    const fakeFetch = async (url: string): Promise<any> => {
      if (url.includes("/media")) return { ok: true, json: async () => ({ url: "u" }) };
      return { ok: false, status: 500, text: async () => "boom" };
    };
    const pub = new BlotatoPublisher({
      apiKey: "k",
      accountIds: { twitter: "1" },
      fetchFn: fakeFetch as any,
      uploadImage: async () => "https://host/a.png",
    });
    const res = await pub.publish(draft(), ["twitter"]);
    expect(res.perPlatform.twitter.ok).toBe(false);
    expect(res.perPlatform.twitter.error).toContain("500");
  });
});
