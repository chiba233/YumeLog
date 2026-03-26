import type { SupportedCodeLang } from "@/shared/lib/external/codeLang.ts";

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
  "collapse",
  "fromNow",
  "date",
] as const;

export type RichType = (typeof RICH_TYPES)[number];
export const BLOCK_TYPES = ["info", "warning", "center", "raw-code", "collapse"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

const SIMPLE_INLINE_EXCLUDED_TYPES = new Set<RichType>([
  "link",
  "info",
  "warning",
  "raw-code",
  "collapse",
  "fromNow",
  "date",
]);

export const SIMPLE_INLINE_TYPES = RICH_TYPES.filter(
  (
    type,
  ): type is Exclude<
    RichType,
    "link" | "info" | "warning" | "raw-code" | "collapse" | "fromNow" | "date"
  > => !SIMPLE_INLINE_EXCLUDED_TYPES.has(type),
);

export const TITLED_BLOCK_TYPES = BLOCK_TYPES.filter(
  (type): type is Exclude<BlockType, "center" | "raw-code"> =>
    type !== "center" && type !== "raw-code",
);
export type TitledBlockType = (typeof TITLED_BLOCK_TYPES)[number];

export const RAW_CAPABLE_RICH_TYPES = RICH_TYPES.filter(
  (type): type is Extract<RichType, "info" | "warning" | "raw-code" | "collapse"> =>
    type === "info" || type === "warning" || type === "raw-code" || type === "collapse",
);

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

export type TokenDraft = Omit<TextToken, "temp_id" | "id">;

export type { TagHandler } from "yume-dsl-rich-text";
export type TagHandlerMap = Partial<Record<RichType, import("yume-dsl-rich-text").TagHandler>>;
