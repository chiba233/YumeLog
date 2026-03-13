import { shallowRef } from "vue";
import { MaiSection, PersonConfig, SocialConfig } from "./d";

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

export const socialRawData = shallowRef<SocialConfig | null>(null);
export const personRawData = shallowRef<PersonConfig | null>(null);
