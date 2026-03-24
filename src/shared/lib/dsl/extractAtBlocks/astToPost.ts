// noinspection DuplicatedCode,ES6PreferShortImport

import type {
  DividerPostBlock,
  ImagePostBlock,
  PostBlock,
  TextPostBlock,
} from "../../../types/blog.ts";
import {
  BLOCK_NAME_DIVIDER,
  BLOCK_NAME_IMAGE,
  BLOCK_NAME_META,
  BLOCK_NAME_TEXT,
  RESERVED_META_KEY_BLOCKS,
  TEMP_ID_PREFIX_NODE,
} from "./constants.ts";
import { blockParsers } from "./blockParsers.ts";
import { createDSLTempId } from "./createDSLTempId.ts";
import { DSL_BLOCK_NAMES, type DSLBlockName, type DSLNode, type DSLTree } from "./types.ts";
import type { DSLError } from "./dslError.ts";
import { findKeySeparator, splitTextLines } from "./textLines.ts";

const applyMeta = (
  content: string,
  target: Record<string, unknown>,
  reservedKeys: Set<string> = new Set([RESERVED_META_KEY_BLOCKS]),
) => {
  for (const line of splitTextLines(content)) {
    if (!line) continue;

    const sep = findKeySeparator(line);
    if (!sep) continue;

    const key = line.slice(0, sep.index).trim();
    const value = line.slice(sep.index + sep.length);

    if (reservedKeys.has(key)) {
      console.error(`[DSL Warning] Reserved key: ${key}`);
      continue;
    }

    if (key in target) {
      console.error(`[DSL Warning] Duplicate key: ${key}`);
    }

    target[key] = value;
  }
};

export interface AstToPostOptions {
  onError?: (error: DSLError) => void;
}

type FinalPost = Record<string, unknown> & { blocks: PostBlock[] };
type PostBlockType = PostBlock["type"];
type AstTransformMode = "metadata" | "block" | "chunked-text" | "text-fallback";

const DSL_POST_BLOCK_TYPES = [
  BLOCK_NAME_IMAGE,
  BLOCK_NAME_DIVIDER,
  BLOCK_NAME_TEXT,
] as const satisfies readonly PostBlockType[];
type DSLPostBlockType = (typeof DSL_POST_BLOCK_TYPES)[number];

const AST_TRANSFORM_MODES: Record<DSLBlockName, AstTransformMode> = {
  [BLOCK_NAME_META]: "metadata",
  [BLOCK_NAME_IMAGE]: "block",
  [BLOCK_NAME_DIVIDER]: "block",
  [BLOCK_NAME_TEXT]: "chunked-text",
};

const createTextBlock = (content: string): PostBlock => ({
  type: BLOCK_NAME_TEXT,
  content,
  temp_id: createDSLTempId(TEMP_ID_PREFIX_NODE),
});

const isDslBlockName = (nodeName: string): nodeName is DSLBlockName => {
  return (DSL_BLOCK_NAMES as readonly string[]).includes(nodeName);
};

const isPostBlockType = (nodeName: string): nodeName is DSLPostBlockType => {
  return (DSL_POST_BLOCK_TYPES as readonly string[]).includes(nodeName);
};

const resolveTransformMode = (nodeName: string): AstTransformMode => {
  if (!isDslBlockName(nodeName)) {
    return "text-fallback";
  }

  return AST_TRANSFORM_MODES[nodeName];
};

const createParsedBlock = (
  type: PostBlockType,
  content: string,
  options: AstToPostOptions,
  tempId: string = createDSLTempId(TEMP_ID_PREFIX_NODE),
): PostBlock => {
  const parser = blockParsers[type];
  const parsedContent = parser ? parser(content, { onError: options.onError }) : content;

  switch (type) {
    case BLOCK_NAME_TEXT:
      return {
        type,
        content: typeof parsedContent === "string" ? parsedContent : content,
        temp_id: tempId,
      } satisfies TextPostBlock;
    case BLOCK_NAME_IMAGE:
      return {
        type,
        content: Array.isArray(parsedContent) ? parsedContent : [],
        temp_id: tempId,
      } satisfies ImagePostBlock;
    case BLOCK_NAME_DIVIDER:
      return {
        type,
        content: typeof parsedContent === "string" ? parsedContent : content,
        temp_id: tempId,
      } satisfies DividerPostBlock;
  }
};

const appendChildren = (target: FinalPost, node: DSLNode, options: AstToPostOptions): void => {
  node.children.forEach((child) => appendNode(target, child, options));
};

const appendChunkedTextNode = (
  target: FinalPost,
  node: DSLNode,
  options: AstToPostOptions,
): void => {
  if (node.children.length === 0) {
    target.blocks.push(createParsedBlock(BLOCK_NAME_TEXT, node.content, options, node.temp_id));
    return;
  }

  for (const chunk of node.chunks) {
    if (chunk.type === "text") {
      if (chunk.value !== "") {
        target.blocks.push(createTextBlock(chunk.value));
      }
      continue;
    }

    appendNode(target, chunk.node, options);
  }
};

const appendNode = (target: FinalPost, node: DSLNode, options: AstToPostOptions): void => {
  switch (resolveTransformMode(node.name)) {
    case "metadata":
      applyMeta(node.content, target);
      appendChildren(target, node, options);
      return;
    case "block":
      if (isPostBlockType(node.name)) {
        target.blocks.push(createParsedBlock(node.name, node.content, options, node.temp_id));
      } else {
        target.blocks.push(createTextBlock(node.content));
      }
      appendChildren(target, node, options);
      return;
    case "chunked-text":
      appendChunkedTextNode(target, node, options);
      return;
    case "text-fallback":
      target.blocks.push(createTextBlock(node.content));
      appendChildren(target, node, options);
      return;
  }
};

export const astToPost = (ast: DSLTree, options: AstToPostOptions = {}): FinalPost => {
  const result = { blocks: [] } as FinalPost;

  for (const node of ast) {
    appendNode(result, node, options);
  }

  return result;
};
