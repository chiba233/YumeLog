// noinspection DuplicatedCode

import type { DSLError } from "./dslError.ts";
import { createDSLTempId } from "./createDSLTempId.ts";
import { splitTextLines, trimTrailingEmptyLines } from "./textLines.ts";
import {
  DSL_BLOCK_NAMES,
  type DSLBlockName,
  type DSLChunk,
  type DSLNode,
  type DSLTextChunk,
  type DSLTree,
} from "./types.ts";

export { DSL_BLOCK_NAMES } from "./types.ts";
export type { DSLBlockName, DSLChunk, DSLNode, DSLTextChunk, DSLTree } from "./types.ts";
const DEFAULT_BLOCK_NAMES = [...DSL_BLOCK_NAMES];
const DEFAULT_NESTED_BLOCKS: readonly string[] = ["text"];

export interface SyntaxConfig {
  blockPrefix: string;
  blockEnd: string;
}

export const syntax: SyntaxConfig = {
  blockPrefix: "@",
  blockEnd: "end",
};

export interface ParseDSLOptions<Name extends string = string> {
  onError?: (error: DSLError) => void;
  maxDepth?: number;
  nestableBlocks?: readonly Name[];
  blockNames?: readonly Name[];
}

type DSLDirective<Name extends string> = { type: "blockStart"; name: Name } | { type: "blockEnd" };

interface ParserFrame<Name extends string> {
  name: Name;
  lineStart: number;
  textBuffer: string[];
  children: DSLNode<Name>[];
  chunks: DSLChunk<Name>[];
}

const parseDirective = <Name extends string>(
  line: string,
  blockNameSet: ReadonlySet<Name>,
): DSLDirective<Name> | null => {
  if (!line.startsWith(syntax.blockPrefix)) return null;

  const raw = line.slice(syntax.blockPrefix.length).trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) return null;

  if (raw === syntax.blockEnd) {
    return { type: "blockEnd" };
  }

  if (blockNameSet.has(raw as Name)) {
    return { type: "blockStart", name: raw as Name };
  }

  return null;
};

const flushFrameText = <Name extends string>(
  frame: ParserFrame<Name>,
  trimTrailing = false,
): void => {
  if (frame.textBuffer.length === 0) return;

  const lines = trimTrailing ? trimTrailingEmptyLines(frame.textBuffer) : frame.textBuffer;
  frame.textBuffer = [];

  if (lines.length === 0) return;

  frame.chunks.push({
    type: "text",
    value: lines.join("\n"),
    temp_id: createDSLTempId("dsl-chunk"),
  });
};

const buildNode = <Name extends string>(
  frame: ParserFrame<Name>,
  depth: number,
  lineEnd: number,
): DSLNode<Name> => {
  flushFrameText(frame, true);

  const textContent = frame.chunks
    .filter((chunk): chunk is DSLTextChunk => chunk.type === "text")
    .map((chunk) => chunk.value)
    .join("");

  return {
    name: frame.name,
    content: textContent,
    children: frame.children,
    chunks: frame.chunks,
    depth,
    lineStart: frame.lineStart,
    lineEnd,
    temp_id: createDSLTempId("dsl-node"),
  };
};

const closeFrame = <Name extends string>(
  stack: ParserFrame<Name>[],
  root: DSLNode<Name>[],
  lineEnd: number,
): void => {
  const frame = stack.pop();
  if (!frame) return;

  const node = buildNode(frame, stack.length, lineEnd);

  if (stack.length === 0) {
    root.push(node);
    return;
  }

  const parent = stack[stack.length - 1];
  parent.children.push(node);
  parent.chunks.push({ type: "child", node, temp_id: createDSLTempId("dsl-chunk") });
};

export const parseDSL = <Name extends string = DSLBlockName>(
  text: string,
  options: ParseDSLOptions<Name> = {},
): DSLTree<Name> => {
  const lines = splitTextLines(text);
  const root: DSLNode<Name>[] = [];
  const stack: ParserFrame<Name>[] = [];
  const maxDepth = Math.max(options.maxDepth ?? 2, 1);
  const nestableBlocks = new Set<Name>(
    (options.nestableBlocks ?? DEFAULT_NESTED_BLOCKS) as readonly Name[],
  );
  const blockNameSet = new Set<Name>(
    (options.blockNames ?? DEFAULT_BLOCK_NAMES) as readonly Name[],
  );

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const current = stack[stack.length - 1];

    const escapeMatch = current ? line.match(/^(\\+)/) : null;
    if (escapeMatch) {
      const slashes = escapeMatch[1];
      const remainingContent = line.slice(slashes.length);

      if (parseDirective(remainingContent, blockNameSet) !== null) {
        const remainingSlashes = "\\".repeat(Math.max(0, slashes.length - 1));
        current.textBuffer.push(remainingSlashes + remainingContent);
        continue;
      }
    }

    const directive = parseDirective(line, blockNameSet);
    if (!directive) {
      if (current) {
        current.textBuffer.push(line);
      }
      continue;
    }

    if (directive.type === "blockEnd") {
      if (stack.length === 0) {
        options.onError?.({
          code: "dslUnexpectedBlockEnd",
          params: { line: String(lineIndex + 1) },
        });
        continue;
      }

      closeFrame(stack, root, lineIndex + 1);
      continue;
    }

    if (current) {
      const canNest = nestableBlocks.has(current.name);
      if (!canNest) {
        options.onError?.({
          code: "dslNestedBlockNotAllowed",
          params: { parent: current.name, name: directive.name, line: String(lineIndex + 1) },
        });
        current.textBuffer.push(line);
        continue;
      }

      if (stack.length >= maxDepth) {
        options.onError?.({
          code: "dslMaxDepthExceeded",
          params: { maxDepth: String(maxDepth), name: directive.name, line: String(lineIndex + 1) },
        });
        current.textBuffer.push(line);
        continue;
      }

      flushFrameText(current);
    }

    stack.push({
      name: directive.name,
      lineStart: lineIndex + 1,
      textBuffer: [],
      children: [],
      chunks: [],
    });
  }

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    options.onError?.({
      code: "dslBlockNotClosed",
      params: { name: current.name, line: String(current.lineStart) },
    });
    closeFrame(stack, root, lines.length);
  }

  return root;
};
