import { TagHead, TagStartInfo } from "../../d";
import { getLineEnd, isTagChar, isTagStartChar, isWholeLineToken } from "./chars";
import {
  BLOCK_CLOSE,
  BLOCK_OPEN,
  END_TAG,
  RAW_CLOSE,
  RAW_OPEN,
  TAG_CLOSE,
  TAG_OPEN,
  TAG_PREFIX,
} from "./constants";
import { readEscapedSequence } from "./escape";

export const findTagArgClose = (text: string, start: number): number => {
  let pos = start;
  let depth = 1;

  while (pos < text.length) {
    const [escaped, next] = readEscapedSequence(text, pos);
    if (escaped !== null) {
      pos = next;
      continue;
    }

    if (text[pos] === TAG_OPEN) {
      depth++;
    } else if (text[pos] === TAG_CLOSE) {
      depth--;
      if (depth === 0) return pos;
    }

    pos++;
  }

  return -1;
};
const readTagHeadAt = (text: string, pos: number): TagHead | null => {
  if (!text.startsWith(TAG_PREFIX, pos)) return null;

  const tagStart = pos + TAG_PREFIX.length;
  if (tagStart >= text.length || !isTagStartChar(text[tagStart])) {
    return null;
  }

  let tagNameEnd = tagStart + 1;
  while (tagNameEnd < text.length && isTagChar(text[tagNameEnd])) {
    tagNameEnd++;
  }

  if (text[tagNameEnd] !== TAG_OPEN) {
    return null;
  }

  return {
    tag: text.slice(tagStart, tagNameEnd),
    tagStart: pos,
    tagNameEnd,
    argStart: tagNameEnd + TAG_OPEN.length,
  };
};

const scanInlineBoundary = (
  text: string,
  start: number,
  returnCloseStart: boolean,
  fallbackToTextEnd: boolean,
): number => {
  let pos = start;
  let depth = 1;

  while (pos < text.length) {
    const [escaped, next] = readEscapedSequence(text, pos);
    if (escaped !== null) {
      pos = next;
      continue;
    }

    const head = readTagHeadAt(text, pos);
    if (head) {
      depth++;
      pos = head.argStart;
      continue;
    }

    if (text.startsWith(END_TAG, pos)) {
      depth--;
      const closeEnd = pos + END_TAG.length;

      if (depth === 0) {
        return returnCloseStart ? pos : closeEnd;
      }

      pos = closeEnd;
      continue;
    }

    pos++;
  }

  return fallbackToTextEnd ? text.length : -1;
};
export const getTagCloserType = (
  text: string,
  tagOpenIndex: number,
): { closer: string; argClose: number } | null => {
  const argClose = findTagArgClose(text, tagOpenIndex);
  if (argClose === -1) return null;

  if (text.startsWith(BLOCK_OPEN, argClose)) {
    return { closer: BLOCK_CLOSE, argClose };
  }

  if (text.startsWith(RAW_OPEN, argClose)) {
    return { closer: RAW_CLOSE, argClose };
  }

  return { closer: END_TAG, argClose };
};

export const findInlineClose = (text: string, start: number): number => {
  return scanInlineBoundary(text, start, true, false);
};

export const findBlockClose = (text: string, start: number): number => {
  let pos = start;
  let depth = 1;

  while (pos < text.length) {
    const [escaped, next] = readEscapedSequence(text, pos);
    if (escaped !== null) {
      pos = next;
      continue;
    }

    if (isWholeLineToken(text, pos, BLOCK_CLOSE)) {
      depth--;
      if (depth === 0) return pos;
      pos = getLineEnd(text, pos) + 1;
      continue;
    }

    const head = readTagHeadAt(text, pos);
    if (head) {
      const tagInfo = getTagCloserType(text, head.argStart);

      if (tagInfo?.closer === RAW_CLOSE) {
        const rawStart = tagInfo.argClose + RAW_OPEN.length;
        const rawEnd = findRawClose(text, rawStart);
        if (rawEnd === -1) return -1;
        pos = rawEnd + RAW_CLOSE.length;
        continue;
      }

      if (tagInfo?.closer === BLOCK_CLOSE) {
        depth++;
        pos = tagInfo.argClose + BLOCK_OPEN.length;
        continue;
      }

      if (tagInfo?.closer === END_TAG) {
        const inlineEnd = findInlineClose(text, head.argStart);
        if (inlineEnd === -1) {
          pos = head.argStart;
          continue;
        }
        pos = inlineEnd + END_TAG.length;
        continue;
      }
    }

    pos++;
  }

  return -1;
};
export const findRawClose = (text: string, start: number): number => {
  let pos = start;

  while (pos < text.length) {
    if (isWholeLineToken(text, pos, RAW_CLOSE)) {
      return pos;
    }

    const lineEnd = text.indexOf("\n", pos);
    if (lineEnd === -1) break;
    pos = lineEnd + 1;
  }

  return -1;
};
export const skipDegradedInline = (text: string, start: number): number => {
  return scanInlineBoundary(text, start, false, true);
};
export const readTagStartInfo = (text: string, i: number): TagStartInfo | null => {
  const head = readTagHeadAt(text, i);
  if (!head) return null;

  return {
    tag: head.tag,
    tagOpenPos: head.tagStart,
    tagNameEnd: head.tagNameEnd,
    inlineContentStart: head.argStart,
  };
};
