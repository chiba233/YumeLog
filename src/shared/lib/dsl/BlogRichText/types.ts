import type { SupportedCodeLang } from "@/shared/lib/external/codeLang.ts";
import {
  type BlockTagInput,
  declareMultilineTags,
  type TagHandler,
  type TextToken as LibraryTextToken,
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

export interface TextToken {
  type: RichType | "text";
  value: string | TextToken[];
  id: string;
  temp_id: string;
  codeLang?: SupportedCodeLang;
  label?: string;
  title?: string;
  date?: string;
  format?: string;
  timeLang?: string;
  url?: string;
  [key: string]: unknown;
}

export type { TagHandler };
export type BlogTextToken = TextToken & LibraryTextToken;
export type TagHandlerMap = Record<RichType, TagHandler>;
