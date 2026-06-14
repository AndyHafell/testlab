import { describe, it, expect } from "vitest";
import { buildPostBody } from "../../src/publish/blotatoRequest";

describe("buildPostBody", () => {
  it("builds a twitter post body with account id and media", () => {
    const body = buildPostBody({
      platform: "twitter",
      accountId: "13469",
      text: "hello world",
      mediaUrls: ["https://host/x.png"],
    });
    expect(body.post.accountId).toBe("13469");
    expect(body.post.content.platform).toBe("twitter");
    expect(body.post.content.text).toBe("hello world");
    expect(body.post.content.mediaUrls).toEqual(["https://host/x.png"]);
    expect(body.post.target.targetType).toBe("twitter");
  });

  it("adds the facebook page id to the target", () => {
    const body = buildPostBody({
      platform: "facebook",
      accountId: "2517",
      text: "fb",
      mediaUrls: [],
      facebookPageId: "1512666705493261",
    });
    expect(body.post.target.targetType).toBe("facebook");
    expect((body.post.target as any).pageId).toBe("1512666705493261");
  });
});
