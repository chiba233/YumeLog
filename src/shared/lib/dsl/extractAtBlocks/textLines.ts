import { KEY_SEPARATOR } from "./constants.ts";

export interface KeySeparatorResult {
  index: number;
  length: number;
}

export const findKeySeparator = (text: string): KeySeparatorResult | null => {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === KEY_SEPARATOR) {
      const length = i + 1 < text.length && text[i + 1] === " " ? 2 : 1;
      return { index: i, length };
    }
  }
  return null;
};

export const splitTextLines = (text: string): string[] => {
  return text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
};

export const trimTrailingEmptyLines = (lines: string[]): string[] => {
  let end = lines.length;

  while (end > 0 && lines[end - 1] === "") {
    end--;
  }

  return lines.slice(0, end);
};
