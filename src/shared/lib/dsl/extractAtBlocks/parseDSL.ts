// noinspection DuplicatedCode

import type { DSLError } from "./dslError.ts";
import {
  BLOCK_END,
  BLOCK_NAME_REGEX,
  BLOCK_PREFIX,
  BOM,
  DEFAULT_NESTABLE_BLOCKS,
  ESCAPE_CHAR,
  TEMP_ID_PREFIX_CHUNK,
  TEMP_ID_PREFIX_NODE,
} from "./constants.ts";
import { createDSLTempId } from "./createDSLTempId.ts";
import { trimTrailingEmptyLines } from "./textLines.ts";
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
const DEFAULT_NESTED_BLOCKS: readonly string[] = [...DEFAULT_NESTABLE_BLOCKS];

export interface SyntaxConfig {
  blockPrefix: string;
  blockEnd: string;
}

export const syntax: SyntaxConfig = {
  blockPrefix: BLOCK_PREFIX,
  blockEnd: BLOCK_END,
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

export const parseDirective = <Name extends string>(
  line: string,
  blockNameSet: ReadonlySet<Name>,
): DSLDirective<Name> | null => {
  if (!line.startsWith(syntax.blockPrefix)) return null;

  const raw = line.slice(syntax.blockPrefix.length).trim();
  if (!BLOCK_NAME_REGEX.test(raw)) return null;

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
    temp_id: createDSLTempId(TEMP_ID_PREFIX_CHUNK),
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
    temp_id: createDSLTempId(TEMP_ID_PREFIX_NODE),
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
  parent.chunks.push({ type: "child", node, temp_id: createDSLTempId(TEMP_ID_PREFIX_CHUNK) });
};

const scanLineEnd = (text: string, pos: number): number => {
  while (pos < text.length) {
    const ch = text[pos];
    if (ch === "\n" || ch === "\r") return pos;
    pos++;
  }
  return pos;
};

const consumeLineBreak = (text: string, pos: number): number => {
  if (pos >= text.length) return pos;
  if (text[pos] === "\r") {
    pos++;
    if (pos < text.length && text[pos] === "\n") pos++;
    return pos;
  }
  if (text[pos] === "\n") return pos + 1;
  return pos;
};

const countLeadingBackslashes = (text: string, start: number, end: number): number => {
  let count = 0;
  while (start + count < end && text[start + count] === ESCAPE_CHAR) {
    count++;
  }
  return count;
};

const processLine = <Name extends string>(
  line: string,
  lineNumber: number,
  stack: ParserFrame<Name>[],
  root: DSLNode<Name>[],
  blockNameSet: ReadonlySet<Name>,
  nestableBlocks: ReadonlySet<Name>,
  maxDepth: number,
  onError: ((error: DSLError) => void) | undefined,
): void => {
  const current = stack[stack.length - 1];

  // Escape check: only inside a block
  if (current) {
    const slashCount = countLeadingBackslashes(line, 0, line.length);
    if (slashCount > 0) {
      const rest = line.slice(slashCount);
      if (parseDirective(rest, blockNameSet) !== null) {
        current.textBuffer.push(ESCAPE_CHAR.repeat(Math.max(0, slashCount - 1)) + rest);
        return;
      }
    }
  }

  // Directive check
  const directive = parseDirective(line, blockNameSet);
  if (!directive) {
    if (current) current.textBuffer.push(line);
    return;
  }

  // Block end
  if (directive.type === "blockEnd") {
    if (stack.length === 0) {
      onError?.({ code: "dslUnexpectedBlockEnd", params: { line: String(lineNumber) } });
      return;
    }
    closeFrame(stack, root, lineNumber);
    return;
  }

  // Block start — nesting validation
  if (current) {
    if (!nestableBlocks.has(current.name)) {
      onError?.({
        code: "dslNestedBlockNotAllowed",
        params: { parent: current.name, name: directive.name, line: String(lineNumber) },
      });
      current.textBuffer.push(line);
      return;
    }
    if (stack.length >= maxDepth) {
      onError?.({
        code: "dslMaxDepthExceeded",
        params: { maxDepth: String(maxDepth), name: directive.name, line: String(lineNumber) },
      });
      current.textBuffer.push(line);
      return;
    }
    flushFrameText(current);
  }

  stack.push({
    name: directive.name,
    lineStart: lineNumber,
    textBuffer: [],
    children: [],
    chunks: [],
  });
};

export const parseDSL = <Name extends string = DSLBlockName>(
  text: string,
  options: ParseDSLOptions<Name> = {},
): DSLTree<Name> => {
  const root: DSLNode<Name>[] = [];
  const stack: ParserFrame<Name>[] = [];
  const maxDepth = Math.max(options.maxDepth ?? 2, 1);
  const nestableBlocks = new Set<Name>(
    (options.nestableBlocks ?? DEFAULT_NESTED_BLOCKS) as readonly Name[],
  );
  const blockNameSet = new Set<Name>(
    (options.blockNames ?? DEFAULT_BLOCK_NAMES) as readonly Name[],
  );

  let pos = 0;
  let lineNumber = 1;

  // Skip BOM
  if (text.startsWith(BOM)) pos = BOM.length;

  while (pos <= text.length) {
    const lineStart = pos;
    if (lineStart === text.length) break;

    // Scan to end of line
    const lineEnd = scanLineEnd(text, pos);
    const line = text.slice(lineStart, lineEnd);

    // Advance past line terminator
    pos = consumeLineBreak(text, lineEnd);

    processLine(
      line,
      lineNumber,
      stack,
      root,
      blockNameSet,
      nestableBlocks,
      maxDepth,
      options.onError,
    );
    lineNumber++;
  }

  // Close any unclosed frames
  const totalLines = lineNumber - 1;
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    options.onError?.({
      code: "dslBlockNotClosed",
      params: { name: current.name, line: String(current.lineStart) },
    });
    closeFrame(stack, root, totalLines);
  }

  return root;
};
