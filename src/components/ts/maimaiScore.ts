import maiData from "@/data/components/maimai.json";

export const maiUrl: string =
  "https://" + maiData.baseUrl + "/api/game/maimai2/profile?aimeId=" + maiData.aimeID;

export type UserDataType = {
  userName: string; // "好DDX"
  iconId: number; // 10
  plateId: number; // 50702
  titleId: number; // 6159
  partnerId: number; // 28
  frameId: number; // 300501
  selectMapId: number; // 300005
  totalAwake: number; // 155
  gradeRating: number; // 0
  musicRating: number; // 14561
  playerRating: number; // 14561
  highestRating: number; // 14561
  gradeRank: number; // 0
  classRank: number; // 0
  courseRank: number; // 0
  charaSlot: number; // [350103, 306101, 350101, 400101, 300101]
  charaLockSlot: number; // [350103, 306101, 350101, 400101, 300101]
  playCount: number; // 849
  eventWatchedDate: string; // "2024-01-11 23:53:37.0"
  lastRomVersion: string; // "1.40.05"
  lastDataVersion: string; // "1.40.05"
  lastPlayDate: string; // "2024-01-12 00:10:11.0"
  playVsCount: number; // 0
  playSyncCount: number; // 0
  winCount: number; // 0
  helpCount: number; // 0
  comboCount: number; // 0
  totalDeluxscore: number; // 1282460
  totalBasicDeluxscore: number; // 1827
  totalAdvancedDeluxscore: number; // 59364
  totalExpertDeluxscore: number; // 534798
  totalMasterDeluxscore: number; // 630609
  totalReMasterDeluxscore: number; // 55862
  totalSync: number; // 80
  totalBasicSync: number; // 10
  totalAdvancedSync: number; // 5
  totalExpertSync: number; // 65
  totalMasterSync: number; // 0
  totalReMasterSync: number; // 0
  totalAchievement: number; // 833198365
  totalBasicAchievement: number; // 5340043
  totalAdvancedAchievement: number; // 72782251
  totalExpertAchievement: number; // 392005089
  totalMasterAchievement: number; // 334866298
  totalReMasterAchievement: number; // 28204684
};
