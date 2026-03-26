import type { ParseError, TagHandler, TextToken as LibTextToken } from "yume-dsl-rich-text";
import { createParser } from "yume-dsl-rich-text";
import type { TextToken } from "./types";
import { BLOCK_TYPES } from "./types";
import { TAG_HANDLERS } from "./handlers";
import { emitLibraryError, withRichTextErrorBatch } from "./errors";

const attachTempIds = (tokens: LibTextToken[]): TextToken[] =>
  tokens.map((t) => ({
    ...t,
    temp_id: t.id,
    value: Array.isArray(t.value) ? attachTempIds(t.value) : t.value,
  })) as TextToken[];

const BLOCK_TAG_LIST: string[] = [...BLOCK_TYPES];
const BLOG_RICH_TEXT_PARSER = createParser({
  handlers: TAG_HANDLERS as Record<string, TagHandler>,
  blockTags: BLOCK_TAG_LIST,
});

export const parseRichText = (
  text: string,
  depthLimit = 50,
  silent = false,
  options: { mode?: "render" | "highlight" } = {},
): TextToken[] => {
  if (!text) return [];

  return withRichTextErrorBatch(silent, () => {
    return attachTempIds(
      BLOG_RICH_TEXT_PARSER.parse(text, {
        depthLimit,
        mode: options.mode ?? "render",
        onError: silent ? undefined : (error: ParseError) => emitLibraryError(error, depthLimit),
      }),
    );
  });
};

export const stripRichText = (text?: string): string => {
  if (!text) return "";

  return BLOG_RICH_TEXT_PARSER.strip(text, {
    depthLimit: 50,
    mode: "render",
  });
};
