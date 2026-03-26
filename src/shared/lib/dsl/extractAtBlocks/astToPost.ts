// noinspection DuplicatedCode,ES6PreferShortImport

import type { PostBlock } from "../../../types/blog.ts";
import { RESERVED_META_KEY_BLOCKS } from "./constants.ts";
import { BLOCK_HANDLERS, createFallbackTextBlock } from "./blockHandlers.ts";
import { DSL_BLOCK_NAMES, type DSLBlockName, type DSLNode, type DSLTree } from "./types.ts";
import type { DSLError } from "./dslError.ts";
import { findKeySeparator, splitTextLines } from "./textLines.ts";

const RESERVED_META_KEYS: ReadonlySet<string> = new Set([RESERVED_META_KEY_BLOCKS]);

const applyMeta = (content: string, target: Record<string, unknown>) => {
  for (const line of splitTextLines(content)) {
    if (!line) continue;

    const sep = findKeySeparator(line);
    if (!sep) continue;

    const key = line.slice(0, sep.index).trim();
    const value = line.slice(sep.index + sep.length);

    if (RESERVED_META_KEYS.has(key)) {
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

const isDslBlockName = (name: string): name is DSLBlockName =>
  (DSL_BLOCK_NAMES as readonly string[]).includes(name);

const buildBlock = (node: DSLNode, onError?: (error: DSLError) => void): PostBlock => {
  const handler = isDslBlockName(node.name) ? BLOCK_HANDLERS[node.name] : null;
  return (
    handler?.buildBlock?.(node.content, node.temp_id, onError) ??
    createFallbackTextBlock(node.content)
  );
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
    target.blocks.push(buildBlock(node, options.onError));
    return;
  }

  for (const chunk of node.chunks) {
    if (chunk.type === "text") {
      if (chunk.value !== "") {
        target.blocks.push(createFallbackTextBlock(chunk.value));
      }
      continue;
    }

    appendNode(target, chunk.node, options);
  }
};

const appendNode = (target: FinalPost, node: DSLNode, options: AstToPostOptions): void => {
  const handler = isDslBlockName(node.name) ? BLOCK_HANDLERS[node.name] : null;

  if (!handler) {
    target.blocks.push(createFallbackTextBlock(node.content));
    appendChildren(target, node, options);
    return;
  }

  switch (handler.transform) {
    case "metadata":
      applyMeta(node.content, target);
      appendChildren(target, node, options);
      return;
    case "block":
      target.blocks.push(buildBlock(node, options.onError));
      appendChildren(target, node, options);
      return;
    case "chunked-text":
      appendChunkedTextNode(target, node, options);
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
