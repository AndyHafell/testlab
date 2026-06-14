import type { Draft, Platform, PublishResult } from "../domain/types";
import { buildPostBody } from "./blotatoRequest";

const BLOTATO_BASE = "https://backend.blotato.com/v2";

export interface Publisher {
  publish(draft: Draft, platforms: Platform[]): Promise<PublishResult>;
}

export interface BlotatoConfig {
  apiKey: string;
  accountIds: Partial<Record<Platform, string>>;
  facebookPageId?: string;
  fetchFn?: typeof fetch;
  /** Uploads a local image and returns a public URL (temp host). */
  uploadImage?: (localPath: string) => Promise<string>;
}

function platformText(draft: Draft, platform: Platform): string {
  switch (platform) {
    case "twitter":
      return draft.content.twitter[0] ?? "";
    case "linkedin":
      return draft.content.linkedin;
    case "threads":
      return draft.content.threads;
    case "instagram":
      return draft.content.instagram;
    case "facebook":
      return draft.content.facebook;
  }
}

export class BlotatoPublisher implements Publisher {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly cfg: BlotatoConfig) {
    this.fetchFn = cfg.fetchFn ?? fetch;
  }

  async publish(draft: Draft, platforms: Platform[]): Promise<PublishResult> {
    const perPlatform: PublishResult["perPlatform"] = {};

    let mediaUrl: string | undefined;
    if (draft.imagePath && this.cfg.uploadImage) {
      try {
        const hosted = await this.cfg.uploadImage(draft.imagePath);
        mediaUrl = await this.registerMedia(hosted);
      } catch {
        mediaUrl = undefined; // posts still go out, just without media
      }
    }

    for (const platform of platforms) {
      const accountId = this.cfg.accountIds[platform];
      if (!accountId) {
        perPlatform[platform] = { ok: false, error: "no account id configured" };
        continue;
      }
      try {
        await this.post(platform, accountId, platformText(draft, platform), mediaUrl);
        perPlatform[platform] = { ok: true };
      } catch (e) {
        perPlatform[platform] = { ok: false, error: String(e) };
      }
    }

    return { perPlatform };
  }

  private async registerMedia(hostedUrl: string): Promise<string> {
    const resp = await this.fetchFn(`${BLOTATO_BASE}/media`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ url: hostedUrl }),
    });
    if (!("ok" in resp) || !resp.ok) throw new Error("media upload failed");
    const data = (await resp.json()) as { url: string };
    return data.url;
  }

  private async post(
    platform: Platform,
    accountId: string,
    text: string,
    mediaUrl: string | undefined,
  ): Promise<void> {
    const body = buildPostBody({
      platform,
      accountId,
      text,
      mediaUrls: mediaUrl ? [mediaUrl] : [],
      facebookPageId: this.cfg.facebookPageId,
    });
    const resp = await this.fetchFn(`${BLOTATO_BASE}/posts`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const detail = "text" in resp ? await resp.text() : "";
      throw new Error(`HTTP ${resp.status} ${detail}`);
    }
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.cfg.apiKey}`,
    };
  }
}
