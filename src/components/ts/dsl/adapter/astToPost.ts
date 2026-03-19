// noinspection DuplicatedCode

import { PostBlock } from "../../d.ts";
import { blockParsers } from "../semantic/blockParsers.ts";
import { DSLTree } from "../parseDSL.ts";

const applyMeta = (
  content: string,
  target: Record<string, unknown>,
  reservedKeys: Set<string> = new Set(["blocks"]),
) => {
  const len = content.length;
  let start = 0;
  while (start < len) {
    let nextNewline = -1;
    for (let i = start; i < len; i++) {
      const char = content[i];
      if (char === "\n" || char === "\r") {
        nextNewline = i;
        break;
      }
    }
    const end = nextNewline === -1 ? len : nextNewline;
    if (end > start) {
      const line = content.slice(start, end);
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
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
    }
    if (nextNewline === -1) {
      break;
    } else {
      if (
        content[nextNewline] === "\r" &&
        nextNewline + 1 < len &&
        content[nextNewline + 1] === "\n"
      ) {
        start = nextNewline + 2;
      } else {
        start = nextNewline + 1;
      }
    }
  }
};

type FinalPost = Record<string, unknown> & { blocks: PostBlock[] };
export const astToPost = (ast: DSLTree): FinalPost => {
  const result = { blocks: [] } as FinalPost;
  for (const node of ast) {
    if (node.name === "meta") {
      applyMeta(node.content, result);
      continue;
    }
    const parser = blockParsers[node.name];
    result.blocks.push({
      type: node.name as PostBlock["type"],
      content: parser ? parser(node.content) : node.content,
    });
  }

  return result;
};
