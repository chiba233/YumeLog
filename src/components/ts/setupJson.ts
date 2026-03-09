import { shallowRef } from "vue";

type PlatformId =
  | "telegram"
  | "wechat"
  | "line"
  | "email"
  | "twitter"
  | "github"
  | "tron"
  | "eth"
  | "areth"
  | "bsc"
  | "polygon"
  | "solana"
  | "maimai"
  | "cat";

type InteractionType = "link" | "modal" | "func";

interface PlatformConfig {
  id: PlatformId;
  label: string;
  type: InteractionType;
}

export interface SocialConfig {
  platforms: PlatformConfig[];
  socialLinks: Record<string, string>;
}

export const socialRawData = shallowRef<SocialConfig | null>(null);
