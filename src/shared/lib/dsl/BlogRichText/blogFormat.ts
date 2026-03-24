// noinspection DuplicatedCode

import type { ParseContext, ParseRichTextOptions, TextToken } from "./types";
import { extractText } from "./builders.ts";
import { tryConsumeEscape, tryConsumeTagClose, tryConsumeTagStart } from "./consumers.ts";
import { finalizeUnclosedTags, flushBuffer } from "./context.ts";
import { withRichTextErrorBatch } from "./errors";

export const parseRichText = (
  text: string,
  depthLimit = 50,
  silent = false,
  options: ParseRichTextOptions = {},
): TextToken[] => {
  if (!text) return [];

  return withRichTextErrorBatch(silent, () => {
    const ctx: ParseContext = {
      text,
      depthLimit,
      silent,
      mode: options.mode ?? "render",
      root: [],
      stack: [],
      buffer: "",
      i: 0,
    };

    while (ctx.i < ctx.text.length) {
      if (tryConsumeTagStart(ctx, parseRichText)) continue;
      if (tryConsumeTagClose(ctx)) continue;
      if (tryConsumeEscape(ctx)) continue;

      ctx.buffer += ctx.text[ctx.i];
      ctx.i++;
    }

    flushBuffer(ctx);
    finalizeUnclosedTags(ctx);
    return ctx.root;
  });
};

export const stripRichText = (text?: string): string => {
  if (!text) return "";
  const tokens = parseRichText(text, 50, true);
  return extractText(tokens);
};
