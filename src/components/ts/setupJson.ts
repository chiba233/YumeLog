import { shallowRef } from "vue";

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

export interface MaiSectionItem {
  label: string;
  value: string;
}

export interface MaiSection {
  titleKey: string;
  name: string;
  items: MaiSectionItem[];
}

export const maiSections: MaiSection[] = [
  {
    titleKey: "mainInfo",
    name: "1",
    items: [
      { label: "dxName", value: "userName" },
      { label: "dxRatingName", value: "playerRating" },
      { label: "dxLastPlay", value: "lastPlayDate" },
      { label: "dxPlayCount", value: "playCount" },
      { label: "dxVersion", value: "lastDataVersion" },
    ],
  },
  {
    titleKey: "otherInfo",
    name: "2",
    items: [
      { label: "BasicDeluxscore", value: "totalBasicDeluxscore" },
      { label: "AdvancedDeluxscore", value: "totalAdvancedDeluxscore" },
      { label: "ExpertDeluxscore", value: "totalExpertDeluxscore" },
      { label: "MasterDeluxscore", value: "totalMasterDeluxscore" },
      { label: "ReMasterDeluxscore", value: "totalReMasterDeluxscore" },
      { label: "totalDeluxscore", value: "totalDeluxscore" },
    ],
  },
  {
    titleKey: "historyInfo",
    name: "3",
    items: [{ label: "highestRating", value: "highestRating" }],
  },
];
export interface SocialConfig {
  platforms: PlatformConfig[];
  socialLinks: Record<string, string>;
}

export const socialRawData = shallowRef<SocialConfig | null>(null);
