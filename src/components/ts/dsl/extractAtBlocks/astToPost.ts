// noinspection DuplicatedCode

import type { PostBlock } from "../../d.ts";
import { blockParsers } from "./blockParsers.ts";
import type { DSLTree } from "./parseDSL.ts";
import type { DSLError } from "./dslError.ts";

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
        } else {
          if (key in target) {
            console.error(`[DSL Warning] Duplicate key: ${key}`);
          }
          target[key] = value;
        }
      }
    }

    if (nextNewline === -1) {
      break;
    }

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
};

export interface AstToPostOptions {
  onError?: (error: DSLError) => void;
}

type FinalPost = Record<string, unknown> & { blocks: PostBlock[] };

export const astToPost = (ast: DSLTree, options: AstToPostOptions = {}): FinalPost => {
  const result = { blocks: [] } as FinalPost;

  for (const node of ast) {
    if (node.name === "meta") {
      applyMeta(node.content, result);
      continue;
    }

    const parser = blockParsers[node.name];

    result.blocks.push({
      type: node.name,
      content: parser ? parser(node.content, { onError: options.onError }) : node.content,
    });
  }

  return result;
};
