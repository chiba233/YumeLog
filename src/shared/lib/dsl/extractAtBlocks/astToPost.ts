// noinspection DuplicatedCode,ES6PreferShortImport

import type {
  DividerPostBlock,
  ImagePostBlock,
  PostBlock,
  TextPostBlock,
} from "../../../types/blog.ts";
import { blockParsers } from "./blockParsers.ts";
import { createDSLTempId } from "./createDSLTempId.ts";
import { DSL_BLOCK_NAMES, type DSLBlockName, type DSLNode, type DSLTree } from "./types.ts";
import type { DSLError } from "./dslError.ts";
import { splitTextLines } from "./textLines.ts";

const applyMeta = (
  content: string,
  target: Record<string, unknown>,
  reservedKeys: Set<string> = new Set(["blocks"]),
) => {
  for (const line of splitTextLines(content)) {
    if (!line) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

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
  "image",
  "divider",
  "text",
] as const satisfies readonly PostBlockType[];
type DSLPostBlockType = (typeof DSL_POST_BLOCK_TYPES)[number];

const AST_TRANSFORM_MODES: Record<DSLBlockName, AstTransformMode> = {
  meta: "metadata",
  image: "block",
  divider: "block",
  text: "chunked-text",
};

const createTextBlock = (content: string): PostBlock => ({
  type: "text",
  content,
  temp_id: createDSLTempId("dsl-node"),
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
  tempId: string = createDSLTempId("dsl-node"),
): PostBlock => {
  const parser = blockParsers[type];
  const parsedContent = parser ? parser(content, { onError: options.onError }) : content;

  switch (type) {
    case "text":
      return {
        type,
        content: typeof parsedContent === "string" ? parsedContent : content,
        temp_id: tempId,
      } satisfies TextPostBlock;
    case "image":
      return {
        type,
        content: Array.isArray(parsedContent) ? parsedContent : [],
        temp_id: tempId,
      } satisfies ImagePostBlock;
    case "divider":
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
    target.blocks.push(createParsedBlock("text", node.content, options, node.temp_id));
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
