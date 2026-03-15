import { PostBlock } from "../d.ts";
import { DSLTree } from "../dsl/ast.ts";
import { blockParsers } from "../semantic/blockParsers.ts";

function applyMeta(content: string, target: Record<string, unknown>) {
  const lines = content.split(/\r\n|\n|\r/);
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    target[key] = line.slice(i + 1).trim();
  }
}

export function astToPost(ast: DSLTree): Record<string, unknown> & { blocks: PostBlock[] } {
  const meta: Record<string, unknown> = {};
  const blocks: PostBlock[] = [];

  for (const node of ast) {
    if (node.name === "meta") {
      applyMeta(node.content, meta);
      continue;
    }

    const block: PostBlock = {
      type: node.name,
    };

    const parser = blockParsers[node.name];

    if (parser) {
      block.content = parser(node.content);
    } else {
      block.content = node.content;
    }

    blocks.push(block);
  }

  return {
    ...meta,
    blocks,
  };
}
