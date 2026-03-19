import { ComputedRef, Ref } from "vue";

/** * ----------------------------------------------------------------
 * 基础工具与抽象
 * ----------------------------------------------------------------
 */

// 缓存包装
export interface CacheEntry<T> {
  data: T;
  lastFetch: number;
}
// 网站选项类型
export interface SelectOption {
  label: string;
  value: string;
}
export interface CommonI18nBlock<T = string> {
  type: string;
  content?: T;
}
// 抽象所有“块”结构的基类，减少重复定义 type 和 content
export interface BaseBlock<T = string> {
  type: "image" | "text" | "divider";
  content?: T;
}
// 基础元数据
export interface BaseMetadata {
  time: string;
  pin?: boolean;
  [key: string]: unknown;
}

/**
 * ----------------------------------------------------------------
 * 博客与富文本系统
 * ----------------------------------------------------------------
 */
export const RICH_TYPES = [
  "bold",
  "thin",
  "underline",
  "strike",
  "center",
  "link",
  "code",
  "info",
  "warning",
  "raw-code",
] as const;
export const BLOCK_TYPES = ["info", "warning", "center", "raw-code"] as const;
export type RichType = (typeof RICH_TYPES)[number];
export type BlockType = (typeof BLOCK_TYPES)[number];

export type InlineParser = (tokens: TextToken[]) => TextToken;

type BlockParser = (arg: string | undefined, content: string) => TextToken;

export type TagHandler = {
  inline?: InlineParser;
  raw?: BlockParser;
};

// 递归定义的文本 Token
export interface TextToken {
  type: RichType | "text";
  value: string | TextToken[];
  codeLang?: string;
  label?: string;
  title?: string;
  url?: string;
}
// 图片的结构
export interface ImageContent {
  src: string;
  spareUrl?: string;
  desc?: string;
}
// 核心内容块
export interface PostBlock extends BaseBlock<string | ImageContent[]> {
  tokens?: TextToken[];
}
// 原始文章结构
export interface Post extends BaseMetadata {
  id?: string;
  title: string;
  layout?: string;
  blocks: PostBlock[];
  lang?: string;
}
// 处理后的文章（用于 UI 展示）
export interface ProcessedPost extends Post {
  displayDescription: string;
  imageBlocks: PostBlock[];
}

/**
 * ----------------------------------------------------------------
 * 业务逻辑模块
 * ----------------------------------------------------------------
 */

// YAML 配置相关
export interface YamlConfigItem {
  listUrl: string;
  url: string;
  spareUrl?: string;
  spareListUrl?: string;
  lang?: string;
}
export type YamlUrlConfig = Record<string, YamlConfigItem>;
// 国际化文本块
export type I18nBlock = CommonI18nBlock<string>;
// 喵喵图模块
export interface YamlNekoBlock {
  imgError: string;
  img: string;
  imgName: string;
}
export interface NekoYamlResponse {
  img: YamlNekoBlock[];
}
// 倒计时/时间轴模块
export interface YamlTimeBlock {
  time: string | number;
  photo?: string;
  names?: I18nBlock[];
}
export interface FromNowYamlResponse {
  fromNow: YamlTimeBlock[];
}
export interface FromNowLanguageConfig {
  title: string;
  button: string;
}

/**
 * ----------------------------------------------------------------
 * 社交与交互
 * ----------------------------------------------------------------
 */

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
  socialLinks: Record<string, string>;
}

// 网站所有者配置
export interface PersonConfig {
  author: Record<string, string>;
}
// 好友列表
export interface Friend {
  name: string;
  alias: string;
  url: string;
  icon: string;
  spare?: string;
}
export interface FriendsYamlResponse {
  friends: Friend[];
}

/**
 * ----------------------------------------------------------------
 * 外部 API 数据
 * ----------------------------------------------------------------
 */

export type UserDataType = {
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
};
export interface MaiSection {
  titleKey: string;
  name: string;
  items: SelectOption[];
}
export interface MaiConfig {
  baseUrl: string;
  aimeID: string | number;
}

/**
 * ----------------------------------------------------------------
 * 系统与路由控制
 * ----------------------------------------------------------------
 */

export interface ModalOptions {
  modals: Ref<Record<string, Ref<boolean>>> | Record<string, Ref<boolean>>;
  paramKey: string;
  paramSource?: "query" | "path";
  baseRouteName?: string;
  isReady?: Ref<boolean> | ComputedRef<boolean>;
  loadHandlers?:
    | Ref<Record<string, () => Promise<void> | void>>
    | Record<string, () => Promise<void> | void>;
  onAllClosed?: () => void;
  onInvalidId?: (id: string) => Promise<void> | void;
}
