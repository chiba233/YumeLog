import type { LocaleTextMap } from "./common";

export type PlatformId =
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

export type InteractionType = "link" | "modal" | "func";

export interface PlatformConfig {
  id: PlatformId;
  label: string;
  type: InteractionType;
}

export interface SocialConfig {
  platforms: PlatformConfig[];
  socialLinks: Partial<Record<PlatformId, string>>;
}

export interface PersonConfig {
  author: LocaleTextMap;
}
