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

export const BLOCK_TYPES = ["info", "warning", "center", "raw-code", "collapse"] as const;
export const TITLED_BLOCK_TYPES = ["info", "warning", "collapse"] as const;

export type RichType = (typeof RICH_TYPES)[number];
export type BlockType = (typeof BLOCK_TYPES)[number];
export type TitledBlockType = (typeof TITLED_BLOCK_TYPES)[number];
export type RichTagName = string;

export interface TextToken {
  type: RichType | "text";
  value: string | TextToken[];
  codeLang?: string;
  label?: string;
  title?: string;
  url?: string;
  temp_id: string;
}

export interface ParseStackNode {
  tag: RichTagName;
  richType: RichType | null;
  tokens: TextToken[];
  openPos: number;
  openLen: number;
}

export interface ParseContext {
  text: string;
  depthLimit: number;
  silent: boolean;
  root: TextToken[];
  stack: ParseStackNode[];
  buffer: string;
  i: number;
}

export interface TagStartInfo {
  tag: string;
  tagOpenPos: number;
  tagNameEnd: number;
  inlineContentStart: number;
}

export interface ComplexTagParseResult {
  handled: boolean;
  nextIndex: number;
  token?: TextToken;
  fallbackText?: string;
  error?: {
    key: "richTextBlockNotClosed" | "richTextRawNotClosed";
    index: number;
    length?: number;
  };
}

export interface TagHead {
  tag: string;
  tagStart: number;
  tagNameEnd: number;
  argStart: number;
}

export type InlineParser = (tokens: TextToken[]) => TextToken;
export type RawParser = (arg: string | undefined, content: string) => TextToken;
export type BlockParser = (arg: string | undefined, content: TextToken[]) => TextToken;

export interface TagHandler {
  inline?: InlineParser;
  raw?: RawParser;
  block?: BlockParser;
}

export type TagHandlerMap = Partial<Record<RichType, TagHandler>>;
