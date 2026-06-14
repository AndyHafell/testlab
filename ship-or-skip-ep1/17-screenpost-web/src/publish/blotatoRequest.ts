import type { Platform } from "../domain/types";

export interface PostBodyInput {
  platform: Platform;
  accountId: string;
  text: string;
  mediaUrls: string[];
  facebookPageId?: string;
}

export interface BlotatoPostBody {
  post: {
    accountId: string;
    content: { text: string; platform: Platform; mediaUrls: string[] };
    target: { targetType: Platform; pageId?: string };
  };
}

export function buildPostBody(input: PostBodyInput): BlotatoPostBody {
  const target: { targetType: Platform; pageId?: string } = {
    targetType: input.platform,
  };
  if (input.platform === "facebook" && input.facebookPageId) {
    target.pageId = input.facebookPageId;
  }
  return {
    post: {
      accountId: input.accountId,
      content: {
        text: input.text,
        platform: input.platform,
        mediaUrls: input.mediaUrls,
      },
      target,
    },
  };
}
