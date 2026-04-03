import type { ParseError, TextToken as LibTextToken } from "yume-dsl-rich-text";
import { createParser } from "yume-dsl-rich-text";
import type { TextToken } from "./types";
import { MULTILINE_TAGS } from "./types";
import { TAG_HANDLERS } from "./handlers";
import { emitLibraryError, withRichTextErrorBatch } from "./errors";

const attachTempIds = (tokens: LibTextToken[]): TextToken[] =>
  tokens.map(
    (token): TextToken => ({
      ...token,
      type: token.type as TextToken["type"],
      temp_id: token.id,
      value: Array.isArray(token.value) ? attachTempIds(token.value) : token.value,
    }),
  );

const BLOG_RICH_TEXT_PARSER = createParser({
  handlers: TAG_HANDLERS,
  blockTags: MULTILINE_TAGS,
});

export const parseRichText = (text: string, depthLimit = 50, silent = false): TextToken[] => {
  if (!text) return [];

  return withRichTextErrorBatch(silent, () => {
    return attachTempIds(
      BLOG_RICH_TEXT_PARSER.parse(text, {
        depthLimit,
        onError: silent ? undefined : (error: ParseError) => emitLibraryError(error, depthLimit),
      }),
    );
  });
};

export const stripRichText = (text?: string): string => {
  if (!text) return "";

  return BLOG_RICH_TEXT_PARSER.strip(text, { depthLimit: 50 });
};
