import type { ComplexTagParseResult, TextToken } from "./types";
import {
  findBlockClose,
  findRawClose,
  findTagArgClose,
} from "@/components/ts/dsl/BlogRichText/scanner.ts";
import {
  BLOCK_CLOSE,
  BLOCK_OPEN,
  ESCAPE_CHAR,
  RAW_CLOSE,
  RAW_OPEN,
} from "@/components/ts/dsl/BlogRichText/constants.ts";
import { isRichType, TAG_HANDLERS } from "./handlers";
import { consumeBlockTagTrailingLineBreak, normalizeBlockTagContent } from "./blockTagFormatting";

export const tryParseComplexTag = (
  text: string,
  tagOpenPos: number,
  tag: string,
  tagNameEnd: number,
  inlineEnd: number,
  depthLimit: number,
  silent: boolean,
  parseInlineContent: (text: string, depthLimit: number, silent: boolean) => TextToken[],
): ComplexTagParseResult => {
  if (!isRichType(tag)) {
    return { handled: false, nextIndex: tagNameEnd };
  }

  const handler = TAG_HANDLERS[tag];
  if (!handler?.raw && !handler?.block) {
    return { handled: false, nextIndex: tagNameEnd };
  }

  const argClose = findTagArgClose(text, tagNameEnd + 1);
  if (argClose === -1) {
    return { handled: false, nextIndex: tagNameEnd };
  }

  const isBlock = text.startsWith(BLOCK_OPEN, argClose);
  const isRaw = text.startsWith(RAW_OPEN, argClose);

  if (!isBlock && !isRaw) {
    return { handled: false, nextIndex: tagNameEnd };
  }

  if (inlineEnd !== -1 && inlineEnd <= argClose) {
    return { handled: false, nextIndex: tagNameEnd };
  }

  if (isBlock) {
    const contentStart = argClose + BLOCK_OPEN.length;
    const end = findBlockClose(text, contentStart);

    if (end === -1) {
      return {
        handled: true,
        nextIndex: contentStart,
        fallbackText: text.slice(tagOpenPos, contentStart),
        error: { key: "richTextBlockNotClosed", index: tagOpenPos },
      };
    }

    if (!handler.block) {
      return {
        handled: true,
        nextIndex: consumeBlockTagTrailingLineBreak(tag, text, end + BLOCK_CLOSE.length),
        fallbackText: text.slice(tagOpenPos, end + BLOCK_CLOSE.length),
      };
    }

    const arg = text.slice(tagNameEnd + 1, argClose).trim();
    const blockContent = normalizeBlockTagContent(tag, text.slice(contentStart, end));

    return {
      handled: true,
      nextIndex: consumeBlockTagTrailingLineBreak(tag, text, end + BLOCK_CLOSE.length),
      token: handler.block(
        arg,
        parseInlineContent(blockContent, Math.max(depthLimit - 1, 0), silent),
      ),
    };
  }

  const contentStart = argClose + RAW_OPEN.length;
  const end = findRawClose(text, contentStart);

  if (end === -1) {
    return {
      handled: true,
      nextIndex: contentStart,
      fallbackText: text.slice(tagOpenPos, contentStart),
      error: { key: "richTextRawNotClosed", index: tagOpenPos },
    };
  }

  if (!handler.raw) {
    return {
      handled: true,
      nextIndex: consumeBlockTagTrailingLineBreak(tag, text, end + RAW_CLOSE.length),
      fallbackText: text.slice(tagOpenPos, end + RAW_CLOSE.length),
    };
  }

  const arg = text.slice(tagNameEnd + 1, argClose).trim();
  const content = normalizeBlockTagContent(
    tag,
    text
      .slice(contentStart, end)
      .split(ESCAPE_CHAR + RAW_CLOSE)
      .join(RAW_CLOSE),
  );

  return {
    handled: true,
    nextIndex: consumeBlockTagTrailingLineBreak(tag, text, end + RAW_CLOSE.length),
    token: handler.raw(arg, content),
  };
};
