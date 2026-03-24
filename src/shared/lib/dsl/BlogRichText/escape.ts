import { BLOCK_CLOSE, ESCAPE_CHAR, RAW_CLOSE, TAG_CLOSE, TAG_DIVIDER, TAG_OPEN } from "./constants";

const ESCAPABLE_TOKENS = [
  RAW_CLOSE,
  BLOCK_CLOSE,
  TAG_OPEN,
  TAG_CLOSE,
  TAG_DIVIDER,
  ESCAPE_CHAR,
].sort((a, b) => b.length - a.length);
export const readEscapedSequence = (text: string, i: number): [string | null, number] => {
  if (!text.startsWith(ESCAPE_CHAR, i)) {
    return [null, i];
  }
  const start = i + ESCAPE_CHAR.length;
  for (const token of ESCAPABLE_TOKENS) {
    if (text.startsWith(token, start)) {
      return [token, start + token.length];
    }
  }

  return [null, i];
};

export const readEscaped = (text: string, i: number): [string, number] => {
  const [escaped, next] = readEscapedSequence(text, i);
  if (escaped !== null) {
    return [escaped, next];
  }
  return [text.slice(i, i + 1), i + 1];
};

export const unescapeInline = (str: string): string => {
  let result = "";
  let i = 0;

  while (i < str.length) {
    const [chunk, next] = readEscaped(str, i);
    result += chunk;
    i = next;
  }

  return result;
};
