import { ImageContent } from "../d";
import { parseDashObjectList } from "./parseDashList";
import { PostBlock } from "@/components/ts/d.ts";

export type BlockContent = PostBlock["content"];

export type BlockParser = (content: string) => BlockContent;

export const blockParsers: Record<string, BlockParser> = {
  image(content: string) {
    return parseDashObjectList(content) as unknown as ImageContent[];
  },
};
