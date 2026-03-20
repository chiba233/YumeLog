// noinspection DuplicatedCode

import type { DSLError } from "./dslError.ts";

export const DSL_BLOCK_NAMES = ["image", "meta", "divider", "text"] as const;
export type DSLBlockName = (typeof DSL_BLOCK_NAMES)[number];

export interface DSLNode {
  name: DSLBlockName;
  content: string;
}

export type DSLTree = DSLNode[];

export interface SyntaxConfig {
  blockPrefix: string;
  blockEnd: string;
}

export const syntax: SyntaxConfig = {
  blockPrefix: "@",
  blockEnd: "end",
};

export interface ParseDSLOptions {
  onError?: (error: DSLError) => void;
}

type DSLDirective = { type: "blockStart"; name: DSLBlockName } | { type: "blockEnd" };

const isDSLBlockName = (value: string): value is DSLBlockName => {
  return (DSL_BLOCK_NAMES as readonly string[]).includes(value);
};

const parseDirective = (line: string): DSLDirective | null => {
  if (!line.startsWith(syntax.blockPrefix)) return null;

  const raw = line.slice(syntax.blockPrefix.length).trim();

  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) {
    return null;
  }

  if (raw === syntax.blockEnd) {
    return { type: "blockEnd" };
  }

  if (isDSLBlockName(raw)) {
    return { type: "blockStart", name: raw };
  }

  return null;
};

export const parseDSL = (text: string, options: ParseDSLOptions = {}): DSLTree => {
  const normalizedText = text.replace(/^\uFEFF/, "");
  const lines = normalizedText.split(/\r\n|\n|\r/);

  const nodes: DSLNode[] = [];
  let currentName: DSLBlockName | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (currentName === null) return;

    nodes.push({
      name: currentName,
      content: buffer.join("\n").replace(/\n+$/, ""),
    });

    currentName = null;
    buffer = [];
  };

  for (const line of lines) {
    const escapeMatch = line.match(/^(\\+)/);

    if (escapeMatch && currentName !== null) {
      const slashes = escapeMatch[1];
      const remainingContent = line.slice(slashes.length);

      if (parseDirective(remainingContent) !== null) {
        const remainingSlashes = "\\".repeat(Math.max(0, slashes.length - 1));
        buffer.push(remainingSlashes + remainingContent);
        continue;
      }
    }

    const directive = parseDirective(line);

    if (directive !== null) {
      if (directive.type === "blockEnd") {
        flush();
        continue;
      }

      if (currentName !== null) {
        options.onError?.({
          code: "dslNestedBlockNotAllowed",
          params: { name: directive.name },
        });
      }

      flush();
      currentName = directive.name;
      continue;
    }

    if (currentName !== null) {
      buffer.push(line);
    }
  }

  if (currentName !== null) {
    options.onError?.({
      code: "dslBlockNotClosed",
      params: { name: currentName },
    });
  }

  flush();
  return nodes;
};
