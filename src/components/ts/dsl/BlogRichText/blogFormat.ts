// noinspection DuplicatedCode

import { ParseContext, TextToken } from "../../d.ts";
import { extractText } from "./builders.ts";
import { tryConsumeEscape, tryConsumeTagClose, tryConsumeTagStart } from "./consumers.ts";
import { finalizeUnclosedTags, flushBuffer } from "./context.ts";

export const parseRichText = (text: string, depthLimit = 50, silent = false): TextToken[] => {
  if (!text) return [];

  const ctx: ParseContext = {
    text,
    depthLimit,
    silent,
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
};

export const stripRichText = (text?: string): string => {
  if (!text) return "";
  const tokens = parseRichText(text, 50, true);
  return extractText(tokens);
};
