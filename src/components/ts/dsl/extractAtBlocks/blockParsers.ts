import type { ImageContent, PostBlock } from "../../d.ts";
import { parseDashObjectList } from "./parseDashList.ts";
import type { DSLError } from "./dslError.ts";

export type BlockContent = PostBlock["content"];

export interface BlockParserContext {
  onError?: (error: DSLError) => void;
}

export type BlockParser = (content: string, ctx?: BlockParserContext) => BlockContent;

export const blockParsers: Record<string, BlockParser> = {
  image(content: string, ctx?: BlockParserContext) {
    return parseDashObjectList(content, {
      onError: ctx?.onError,
    }) as unknown as ImageContent[];
  },
};
