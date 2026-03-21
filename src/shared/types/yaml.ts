import type { CommonI18nBlock } from "./common";

export interface YamlConfigItem {
  listUrl: string;
  url: string;
  spareUrl?: string;
  spareListUrl?: string;
  lang?: string;
}

export type YamlUrlConfig = Record<string, YamlConfigItem>;

export type I18nBlock = CommonI18nBlock<string>;

export interface YamlNekoBlock {
  imgError: string;
  img: string;
  imgName: string;
  temp_id: string;
}

export interface NekoYamlResponse {
  img: YamlNekoBlock[];
}

export interface YamlTimeBlock {
  time: string | number;
  photo?: string;
  names?: I18nBlock[];
  temp_id: string;
}

export interface FromNowYamlResponse {
  fromNow: YamlTimeBlock[];
}

export interface FromNowLanguageConfig {
  title: string;
  button: string;
}

export interface Friend {
  name: string;
  alias: string;
  url: string;
  icon: string;
  spare?: string;
  temp_id: string;
}

export interface FriendsYamlResponse {
  friends: Friend[];
}
