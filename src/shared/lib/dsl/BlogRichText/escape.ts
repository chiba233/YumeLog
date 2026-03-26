import { createSyntax, DEFAULT_SYNTAX } from "yume-dsl-rich-text";

export { unescapeInline } from "yume-dsl-rich-text";

const { escapableTokens } = createSyntax();
const ESCAPE_CHAR = DEFAULT_SYNTAX.escapeChar;

export const readEscapedSequence = (text: string, i: number): [string | null, number] => {
  if (!text.startsWith(ESCAPE_CHAR, i)) {
    return [null, i];
  }
  const start = i + ESCAPE_CHAR.length;
  for (const token of escapableTokens) {
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
