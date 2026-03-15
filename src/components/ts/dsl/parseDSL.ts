import { DSLNode, DSLTree } from "./ast";
import { syntax } from "./syntax";

function getBlockName(line: string): string | null {
  if (!line.startsWith(syntax.blockPrefix)) {
    return null;
  }

  const name = line.slice(syntax.blockPrefix.length).trim();

  if (!name) {
    return null;
  }

  return name;
}

export function parseDSL(text: string): DSLTree {
  text = text.replace(/^\uFEFF/, "");
  const lines = text.split(/\r\n|\n|\r/);

  const nodes: DSLNode[] = [];

  let currentName: string | null = null;
  let buffer: string[] = [];

  function flush(): void {
    if (!currentName) {
      return;
    }

    nodes.push({
      name: currentName,
      content: buffer.join("\n").trim(),
    });

    buffer = [];
    currentName = null;
  }

  for (const line of lines) {
    const name = getBlockName(line);

    if (name !== null) {
      if (name === syntax.blockEnd) {
        flush();
        continue;
      }
      if (currentName) {
        console.error(`Nested DSL block not allowed: ${name}`);
      }
      flush();
      currentName = name;
      continue;
    }
    buffer.push(line);
  }
  flush();
  if (currentName) {
    console.error(`DSL block not closed: ${currentName}`);
  }
  return nodes;
}
