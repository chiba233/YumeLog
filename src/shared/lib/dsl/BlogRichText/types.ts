import type { SupportedCodeLang } from "@/shared/lib/external/codeLang.ts";
import {
  type BlockTagInput,
  createTokenGuard,
  declareMultilineTags,
  type NarrowDraft,
  type NarrowTokenUnion,
  type TagHandler,
} from "yume-dsl-rich-text";

const SIMPLE_INLINE_TAGS = ["bold", "thin", "underline", "strike", "center", "code"] as const;
const PIPE_INLINE_TAGS = ["link", "fromNow", "date"] as const;
const TITLED_TAGS = ["info", "warning", "collapse"] as const;
const RAW_ONLY_TAGS = ["raw-code"] as const;

export const RICH_TYPES = [
  ...SIMPLE_INLINE_TAGS,
  ...PIPE_INLINE_TAGS,
  ...TITLED_TAGS,
  ...RAW_ONLY_TAGS,
] as const;
export type RichType = (typeof RICH_TYPES)[number];

export const TITLED_BLOCK_TYPES = [...TITLED_TAGS] as const;
export type TitledBlockType = (typeof TITLED_BLOCK_TYPES)[number];

export const RAW_CAPABLE_RICH_TYPES = [...TITLED_TAGS, ...RAW_ONLY_TAGS] as const;
export const BLOCK_TYPES = [...RAW_CAPABLE_RICH_TYPES] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const MULTILINE_TAGS: BlockTagInput[] = declareMultilineTags([
  "center",
  ...TITLED_TAGS,
  { tag: "raw-code", forms: ["raw"] },
]);

export const BLOG_TAG_GROUPS = {
  pipeInline: PIPE_INLINE_TAGS,
  rawOnly: RAW_ONLY_TAGS,
  simpleInline: SIMPLE_INLINE_TAGS,
  titled: TITLED_TAGS,
} as const;

type BlogTokenFields = {
  text: Record<string, never>;
  bold: Record<string, never>;
  thin: Record<string, never>;
  underline: Record<string, never>;
  strike: Record<string, never>;
  center: Record<string, never>;
  code: Record<string, never>;
  link: { url: string };
  fromNow: { date: string; timeLang?: string };
  date: { date: string; format?: string; timeLang?: string };
  info: { title: string };
  warning: { title: string };
  collapse: { title: string };
  "raw-code": { codeLang: SupportedCodeLang; title: string; label: string };
};
export type BlogTokenMap = BlogTokenFields & Record<string, Record<string, unknown>>;

type BlogTokenBase = NarrowTokenUnion<BlogTokenMap>;
export type BlogTokenType = "text" | RichType;
export type TextToken = Omit<BlogTokenBase, "value"> & {
  type: BlogTokenType;
  temp_id: string;
  value: string | TextToken[];
} & {
  // Convenience optional fields for renderer-side direct access without narrowing every branch.
  codeLang?: SupportedCodeLang;
  label?: string;
  title?: string;
  date?: string;
  format?: string;
  timeLang?: string;
  url?: string;
};

export type RichTokenDraft<
  TType extends keyof BlogTokenMap,
  TExtra extends Record<string, unknown> = BlogTokenMap[TType],
> = NarrowDraft<TType, TExtra>;
export const isRichToken = createTokenGuard<BlogTokenMap>();

export type { TagHandler };
export type TagHandlerMap = Record<RichType, TagHandler>;
