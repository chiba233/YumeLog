import type { ParseContext, ParseStackNode, TagStartInfo, TextToken } from "./types";
import {
  BLOCK_CLOSE,
  BLOCK_OPEN,
  END_TAG,
  ESCAPE_CHAR,
  RAW_CLOSE,
  RAW_OPEN,
} from "@/shared/lib/dsl/BlogRichText/constants.ts";
import { isRichType } from "@/shared/lib/dsl/BlogRichText/handlers.ts";
import { readEscaped, unescapeInline } from "@/shared/lib/dsl/BlogRichText/escape.ts";
import { TAG_HANDLERS } from "./handlers.ts";
import { emitI18nError } from "./errors";
import { flushBuffer, getCurrentTokens, pushTextToCurrent } from "./context";
import {
  findBlockClose,
  findInlineClose,
  findRawClose,
  getTagCloserType,
  readTagStartInfo,
  skipDegradedInline,
} from "../BlogRichText/scanner.ts";
import { tryParseComplexTag } from "./complex.ts";
import { createToken } from "./createToken.ts";
import { consumeBlockTagTrailingLineBreak } from "./blockTagFormatting";

export const tryConsumeDepthLimitedTag = (ctx: ParseContext, info: TagStartInfo): boolean => {
  if (ctx.stack.length < ctx.depthLimit) return false;

  if (ctx.stack.length === ctx.depthLimit) {
    emitI18nError("richTextDepthLimit", { depthLimit: ctx.depthLimit, i: ctx.i }, ctx.silent);
  }

  const tagInfo = getTagCloserType(ctx.text, info.tagNameEnd + 1);

  if (!tagInfo) {
    ctx.buffer += ctx.text.slice(ctx.i, info.inlineContentStart);
    ctx.i = info.inlineContentStart;
    return true;
  }

  if (tagInfo.closer === END_TAG) {
    const end = findInlineClose(ctx.text, info.inlineContentStart);
    if (end === -1) {
      const degradedEnd = skipDegradedInline(ctx.text, info.inlineContentStart);
      ctx.buffer += ctx.text.slice(ctx.i, degradedEnd);
      ctx.i = degradedEnd;
      return true;
    }

    ctx.buffer += ctx.text.slice(ctx.i, end + END_TAG.length);
    ctx.i = end + END_TAG.length;
    return true;
  }

  if (tagInfo.closer === BLOCK_CLOSE) {
    const contentStart = tagInfo.argClose + BLOCK_OPEN.length;
    const end = findBlockClose(ctx.text, contentStart);

    if (end === -1) {
      ctx.buffer += ctx.text.slice(ctx.i, contentStart);
      ctx.i = contentStart;
      return true;
    }

    ctx.buffer += ctx.text.slice(ctx.i, end + BLOCK_CLOSE.length);
    ctx.i = end + BLOCK_CLOSE.length;
    return true;
  }

  if (tagInfo.closer === RAW_CLOSE) {
    const contentStart = tagInfo.argClose + RAW_OPEN.length;
    const end = findRawClose(ctx.text, contentStart);

    if (end === -1) {
      ctx.buffer += ctx.text.slice(ctx.i, contentStart);
      ctx.i = contentStart;
      return true;
    }

    ctx.buffer += ctx.text.slice(ctx.i, end + RAW_CLOSE.length);
    ctx.i = consumeBlockTagTrailingLineBreak(info.tag, ctx.text, end + RAW_CLOSE.length);
    return true;
  }

  return false;
};

export const tryConsumeComplexTag = (
  ctx: ParseContext,
  info: TagStartInfo,
  inlineEnd: number,
  parseInlineContent: (text: string, depthLimit: number, silent: boolean) => TextToken[],
): boolean => {
  const result = tryParseComplexTag(
    ctx.text,
    info.tagOpenPos,
    info.tag,
    info.tagNameEnd,
    inlineEnd,
    ctx.depthLimit,
    ctx.silent,
    parseInlineContent,
  );

  if (!result.handled) return false;

  if (result.error) {
    emitI18nError(result.error.key, { i: result.error.index }, ctx.silent);
  }

  if (result.fallbackText) {
    ctx.buffer += result.fallbackText;
  }

  if (result.token) {
    flushBuffer(ctx);
    getCurrentTokens(ctx).push(result.token);
  }

  ctx.i = result.nextIndex;
  return true;
};

export const tryConsumeInlineTag = (
  ctx: ParseContext,
  info: TagStartInfo,
  inlineEnd: number,
): boolean => {
  if (inlineEnd === -1) {
    ctx.buffer += ctx.text.slice(ctx.i, info.inlineContentStart);
    ctx.i = info.inlineContentStart;
    return true;
  }

  ctx.stack.push({
    tag: info.tag,
    richType: isRichType(info.tag) ? info.tag : null,
    tokens: [],
  });
  ctx.i = info.inlineContentStart;
  return true;
};

export const tryConsumeTagStart = (
  ctx: ParseContext,
  parseInlineContent: (text: string, depthLimit: number, silent: boolean) => TextToken[],
): boolean => {
  const info = readTagStartInfo(ctx.text, ctx.i);
  if (!info) return false;

  flushBuffer(ctx);

  if (tryConsumeDepthLimitedTag(ctx, info)) return true;

  const inlineEnd = findInlineClose(ctx.text, info.inlineContentStart);

  if (tryConsumeComplexTag(ctx, info, inlineEnd, parseInlineContent)) return true;
  return tryConsumeInlineTag(ctx, info, inlineEnd);
};

export const finalizeClosedNode = (ctx: ParseContext, node: ParseStackNode) => {
  if (!node.richType) {
    emitI18nError("richTextUnknownTag", { tag: node.tag, i: ctx.i }, ctx.silent);

    node.tokens.forEach((t) => {
      if (t.type === "text" && typeof t.value === "string") {
        pushTextToCurrent(ctx, unescapeInline(t.value));
      } else {
        getCurrentTokens(ctx).push(t);
      }
    });

    return;
  }

  const handler = TAG_HANDLERS[node.richType];
  getCurrentTokens(ctx).push(
    handler?.inline
      ? handler.inline(node.tokens)
      : createToken({
          type: node.richType,
          value: node.tokens,
        }),
  );
};

export const tryConsumeTagClose = (ctx: ParseContext): boolean => {
  if (!ctx.text.startsWith(END_TAG, ctx.i)) return false;

  if (ctx.stack.length === 0) {
    emitI18nError("richTextUnexpectedClose", { i: ctx.i }, ctx.silent);
    ctx.buffer += END_TAG;
    ctx.i += END_TAG.length;
    return true;
  }

  flushBuffer(ctx);

  const node = ctx.stack.pop()!;
  finalizeClosedNode(ctx, node);

  ctx.i += END_TAG.length;
  ctx.i = consumeBlockTagTrailingLineBreak(node.tag, ctx.text, ctx.i);

  return true;
};

export const tryConsumeEscape = (ctx: ParseContext): boolean => {
  if (ctx.text[ctx.i] !== ESCAPE_CHAR || ctx.i + 1 >= ctx.text.length) {
    return false;
  }

  const [char, next] = readEscaped(ctx.text, ctx.i);
  ctx.buffer += char;
  ctx.i = next;
  return true;
};
