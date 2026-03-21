import type { SelectOption } from "./common";

export interface UserDataType {
  userName: string;
  iconId: number;
  plateId: number;
  titleId: number;
  partnerId: number;
  frameId: number;
  selectMapId: number;
  totalAwake: number;
  gradeRating: number;
  musicRating: number;
  playerRating: number;
  highestRating: number;
  gradeRank: number;
  classRank: number;
  courseRank: number;
  charaSlot: number[];
  charaLockSlot: number[];
  playCount: number;
  eventWatchedDate: string;
  lastRomVersion: string;
  lastDataVersion: string;
  lastPlayDate: string;
  playVsCount: number;
  playSyncCount: number;
  winCount: number;
  helpCount: number;
  comboCount: number;
  totalDeluxscore: number;
  totalBasicDeluxscore: number;
  totalAdvancedDeluxscore: number;
  totalExpertDeluxscore: number;
  totalMasterDeluxscore: number;
  totalReMasterDeluxscore: number;
  totalSync: number;
  totalBasicSync: number;
  totalAdvancedSync: number;
  totalExpertSync: number;
  totalMasterSync: number;
  totalReMasterSync: number;
  totalAchievement: number;
  totalBasicAchievement: number;
  totalAdvancedAchievement: number;
  totalExpertAchievement: number;
  totalMasterAchievement: number;
  totalReMasterAchievement: number;
}

export interface MaiSection {
  titleKey: string;
  name: string;
  items: SelectOption[];
}

export interface MaiConfig {
  baseUrl: string;
  aimeID: string | number;
}
