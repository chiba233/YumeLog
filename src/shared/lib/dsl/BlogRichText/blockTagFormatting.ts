import type { BlockType } from "./types";
import { BLOCK_TYPES_SET } from "./handlers";

export const isBlockTag = (tag: string): boolean => {
  return BLOCK_TYPES_SET.has(tag as BlockType);
};

export const stripSingleLeadingLineBreak = (text: string): string => {
  if (text.startsWith("\r\n")) return text.slice(2);
  if (text.startsWith("\n")) return text.slice(1);
  return text;
};

export const consumeSingleTrailingLineBreak = (text: string, index: number): number => {
  if (text.startsWith("\r\n", index)) return index + 2;
  if (text[index] === "\n") return index + 1;
  return index;
};

export const normalizeBlockTagContent = (tag: string, content: string): string => {
  if (!isBlockTag(tag)) return content;
  return stripSingleLeadingLineBreak(content);
};

export const consumeBlockTagTrailingLineBreak = (
  tag: string,
  text: string,
  index: number,
): number => {
  if (!isBlockTag(tag)) return index;
  return consumeSingleTrailingLineBreak(text, index);
};
