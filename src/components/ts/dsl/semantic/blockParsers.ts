import { ImageContent, PostBlock } from "../../d.ts";
import { parseDashObjectList } from "./parseDashList.ts";

export type BlockContent = PostBlock["content"];

export type BlockParser = (content: string) => BlockContent;

export const blockParsers: Record<string, BlockParser> = {
  image(content: string) {
    return parseDashObjectList(content) as unknown as ImageContent[];
  },
};
