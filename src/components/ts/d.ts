import type { ComputedRef, Ref } from "vue";
import type { TextToken } from "./dsl/BlogRichText/types";

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

export type LocaleTextMap = Record<string, string>;

export interface CommonI18nBlock<TContent = string, TType extends string = string> {
  type: TType;
  content?: TContent;
  temp_id: string;
}
// 抽象所有“块”结构的基类，减少重复定义 type 和 content
export interface BaseBlock<TType extends string, TContent = undefined> {
  type: TType;
  content?: TContent;
}
// 基础元数据
export interface BaseMetadata {
  time: string;
  pin?: string;
}

/**
 * ----------------------------------------------------------------
 * 博客与文章模型
 * ----------------------------------------------------------------
 */

// 图片的结构
export interface ImageContent {
  src: string;
  spareUrl?: string;
  desc?: string;
  temp_id: string;
}

export interface TextPostBlock extends BaseBlock<"text", string> {
  content: string;
  tokens?: TextToken[];
  temp_id: string;
}

export interface ImagePostBlock extends BaseBlock<"image", ImageContent[]> {
  content: ImageContent[];
  tokens?: TextToken[];
  temp_id: string;
}

export interface DividerPostBlock extends BaseBlock<"divider", string> {
  content?: string;
  tokens?: TextToken[];
  temp_id: string;
}

// 核心内容块
export type PostBlock = TextPostBlock | ImagePostBlock | DividerPostBlock;
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
  imageBlocks: ImagePostBlock[];
  temp_id: string;
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
  temp_id: string;
}
export interface NekoYamlResponse {
  img: YamlNekoBlock[];
}
// 倒计时/时间轴模块
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
  socialLinks: Partial<Record<PlatformId, string>>;
}

// 网站所有者配置
export interface PersonConfig {
  author: LocaleTextMap;
}
// 好友列表
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

/**
 * ----------------------------------------------------------------
 * 外部 API 数据
 * ----------------------------------------------------------------
 */

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

export type {
  BlockParser,
  BlockType,
  ComplexTagParseResult,
  InlineParser,
  ParseContext,
  ParseStackNode,
  RawParser,
  RichType,
  TagHandler,
  TagHandlerMap,
  TagHead,
  TagStartInfo,
  TextToken,
  TitledBlockType,
} from "./dsl/BlogRichText/types";
export { BLOCK_TYPES, RICH_TYPES, TITLED_BLOCK_TYPES } from "./dsl/BlogRichText/types";
