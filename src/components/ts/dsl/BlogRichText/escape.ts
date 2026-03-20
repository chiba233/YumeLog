import { BLOCK_CLOSE, ESCAPE_CHAR, RAW_CLOSE, TAG_CLOSE, TAG_DIVIDER, TAG_OPEN } from "./constants";

export const ESCAPABLE_CHARS = new Set(
  [TAG_OPEN, TAG_CLOSE, TAG_DIVIDER, ESCAPE_CHAR]
    .flatMap((str) => str.split(""))
    .filter((char) => !/[a-zA-Z0-9]/.test(char))
    .filter((char, i, self) => self.indexOf(char) === i),
);
export const readEscapedSequence = (text: string, i: number): [string | null, number] => {
  if (text[i] !== ESCAPE_CHAR || i + 1 >= text.length) {
    return [null, i];
  }

  if (text.startsWith(RAW_CLOSE, i + 1)) {
    return [RAW_CLOSE, i + 1 + RAW_CLOSE.length];
  }

  if (text.startsWith(BLOCK_CLOSE, i + 1)) {
    return [BLOCK_CLOSE, i + 1 + BLOCK_CLOSE.length];
  }

  const nextChar = text[i + 1];
  if (ESCAPABLE_CHARS.has(nextChar)) {
    return [nextChar, i + 2];
  }

  return [null, i];
};
export const readEscaped = (text: string, i: number): [string, number] => {
  const [escaped, next] = readEscapedSequence(text, i);
  if (escaped !== null) {
    return [escaped, next];
  }
  return [text[i], i + 1];
};
export const unescapeInline = (str: string): string => {
  let result = "";
  let i = 0;

  while (i < str.length) {
    const [escaped, next] = readEscapedSequence(str, i);
    if (escaped !== null) {
      result += escaped;
      i = next;
      continue;
    }

    result += str[i];
    i++;
  }

  return result;
};
