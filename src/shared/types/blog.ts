import type { TextToken } from "@/shared/lib/dsl/BlogRichText/types";
import type { BaseBlock, BaseMetadata } from "./common";

export interface ImageContent {
  src: string;
  spareUrl?: string;
  desc?: string;
  temp_id: string;
}

export interface TextPostBlock extends BaseBlock<"text", string> {
  content: string;
  tokens?: TextToken[];
  temp_id: string;
}

export interface ImagePostBlock extends BaseBlock<"image", ImageContent[]> {
  content: ImageContent[];
  tokens?: TextToken[];
  temp_id: string;
}

export interface DividerPostBlock extends BaseBlock<"divider", string> {
  content?: string;
  tokens?: TextToken[];
  temp_id: string;
}

export type PostBlock = TextPostBlock | ImagePostBlock | DividerPostBlock;

export interface Post extends BaseMetadata {
  id?: string;
  title: string;
  layout?: string;
  blocks: PostBlock[];
  lang?: string;
}

export interface ProcessedPost extends Post {
  displayDescription: string;
  imageBlocks: ImagePostBlock[];
  temp_id: string;
}
