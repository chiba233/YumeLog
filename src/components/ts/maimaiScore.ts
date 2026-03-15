import { MaiConfig } from "./d";

let memoizedConfig: MaiConfig | null = null;

const getMaiConfig = async (): Promise<MaiConfig> => {
  if (memoizedConfig) return memoizedConfig;
  const res = await fetch("/data/config/maimai.json");
  memoizedConfig = (await res.json()) as MaiConfig;
  return memoizedConfig;
};

export const getMaiUrl = async (): Promise<string> => {
  const config = await getMaiConfig();
  return `https://${config.baseUrl}/api/game/maimai2/profile?aimeId=${config.aimeID}`;
};
