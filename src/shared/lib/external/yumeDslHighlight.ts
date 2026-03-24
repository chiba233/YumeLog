import {
  analyzeDashListLine,
  analyzePropertyLine,
} from "@/shared/lib/dsl/extractAtBlocks/parseDashList.ts";
import {
  DSL_BLOCK_NAMES,
  type DSLNode,
  parseDirective,
  parseDSL,
  syntax,
} from "@/shared/lib/dsl/extractAtBlocks/parseDSL.ts";
import { splitTextLines } from "@/shared/lib/dsl/extractAtBlocks/textLines.ts";
import {
  BLOCK_CLOSE,
  BLOCK_OPEN,
  END_TAG,
  ESCAPE_CHAR,
  RAW_CLOSE,
  RAW_OPEN,
  TAG_CLOSE,
  TAG_DIVIDER,
  TAG_OPEN,
  TAG_PREFIX,
} from "@/shared/lib/dsl/BlogRichText/constants.ts";
import { readEscapedSequence } from "@/shared/lib/dsl/BlogRichText/escape.ts";
import {
  findBlockClose,
  findInlineClose,
  findRawClose,
  getTagCloserType,
  readTagStartInfo,
  skipDegradedInline,
} from "@/shared/lib/dsl/BlogRichText/scanner.ts";

export interface HighlightToken {
  content: string;
  color?: string;
  fontStyle?: string;
}

const COLORS = {
  plain: undefined,
  tagName: "#0550AE",
  punct: "#CF222E",
  bracket: "#6639BA",
  separator: "#953800",
  operator: "#1A7F37",
  end: "#8250DF",
  property: "#0A3069",
  value: "#0A7EA4",
  richTextArg: "#0A3069",
  richTextContent: "#0A7EA4",
  escape: "#116329",
} as const;

type BlockName = (typeof DSL_BLOCK_NAMES)[number];
type LineRole = { kind: "start" | "end" | "content"; blockName: BlockName } | null;
type RichTextTreeNode =
  | { type: "text"; value: string }
  | { type: "escape"; raw: string }
  | { type: "separator" }
  | { type: "inline"; tag: string; args: RichTextTreeNode[] }
  | { type: "raw"; tag: string; args: RichTextTreeNode[]; content: string }
  | { type: "block"; tag: string; args: RichTextTreeNode[]; content: RichTextTreeNode[] };

const BLOCK_NAME_SET = new Set<string>(DSL_BLOCK_NAMES);
const RAW_MARKER = RAW_OPEN.slice(TAG_CLOSE.length);
const BLOCK_MARKER = BLOCK_OPEN.slice(TAG_CLOSE.length);

const pushToken = (
  line: HighlightToken[],
  content: string,
  color?: string,
  fontStyle?: string,
): void => {
  if (!content) return;
  line.push({ content, color, fontStyle });
};

const pushPlain = (line: HighlightToken[], content: string): void => pushToken(line, content);

const isMultilinePropertyLine = (line: string, mode: "dash" | "plain"): boolean => {
  if (mode === "dash") return analyzeDashListLine(line)?.isMultiline ?? false;
  return analyzePropertyLine(line)?.isMultiline ?? false;
};

const colorizeEscapes = (text: string, valueColor?: string): HighlightToken[] => {
  const tokens: HighlightToken[] = [];
  let i = 0;
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    pushToken(tokens, buffer, valueColor);
    buffer = "";
  };

  while (i < text.length) {
    const [escaped, next] = readEscapedSequence(text, i);
    if (escaped === null) {
      buffer += text[i];
      i++;
      continue;
    }

    flush();
    pushToken(tokens, text.slice(i, next), COLORS.escape);
    i = next;
  }

  flush();
  return tokens;
};

const tokenizeDirectiveFragmentLine = (line: string): HighlightToken[] => {
  const tokens: HighlightToken[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] !== ESCAPE_CHAR) {
      const nextSlash = line.indexOf(ESCAPE_CHAR, i);
      if (nextSlash === -1) {
        pushPlain(tokens, line.slice(i));
        break;
      }
      pushPlain(tokens, line.slice(i, nextSlash));
      i = nextSlash;
      continue;
    }

    let slashEnd = i;
    while (line[slashEnd] === ESCAPE_CHAR) slashEnd++;

    if (!line.startsWith(syntax.blockPrefix, slashEnd)) {
      pushPlain(tokens, line.slice(i, slashEnd));
      i = slashEnd;
      continue;
    }

    const directive = parseDirective(line.slice(slashEnd), BLOCK_NAME_SET);
    if (!directive) {
      pushPlain(tokens, line.slice(i, slashEnd + syntax.blockPrefix.length));
      i = slashEnd + syntax.blockPrefix.length;
      continue;
    }

    pushToken(tokens, ESCAPE_CHAR, COLORS.escape);
    if (slashEnd - i > 1) pushPlain(tokens, ESCAPE_CHAR.repeat(slashEnd - i - 1));
    pushToken(tokens, syntax.blockPrefix, COLORS.punct, "bold");

    const name = directive.type === "blockEnd" ? syntax.blockEnd : directive.name;
    pushToken(tokens, name, directive.type === "blockEnd" ? COLORS.end : COLORS.tagName, "bold");
    i = slashEnd + syntax.blockPrefix.length + name.length;
  }

  return tokens;
};

const renderPropertyAnalysis = (
  analysis: {
    indent: string;
    key: string;
    spacingAfterSeparator: string;
    rawValue: string;
    isMultiline: boolean;
  },
  listMarker: string | null,
): HighlightToken[] => {
  const tokens: HighlightToken[] = [];
  pushPlain(tokens, analysis.indent);
  if (listMarker) pushToken(tokens, listMarker, COLORS.separator, "bold");
  pushToken(tokens, analysis.key, COLORS.property);
  pushToken(tokens, ":", COLORS.separator, "bold");
  if (analysis.spacingAfterSeparator) pushPlain(tokens, analysis.spacingAfterSeparator);

  if (analysis.isMultiline) {
    pushToken(tokens, "|", COLORS.operator, "bold");
  } else {
    colorizeEscapes(analysis.rawValue, COLORS.value).forEach((token) => tokens.push(token));
  }

  return tokens;
};

const renderDashListLine = (line: string): HighlightToken[] => {
  const analysis = analyzeDashListLine(line);
  if (!analysis) return [{ content: line, color: COLORS.value }];
  return renderPropertyAnalysis(analysis, analysis.isListItem ? "- " : null);
};

const renderKeyValueLine = (line: string): HighlightToken[] => {
  const analysis = analyzePropertyLine(line);
  if (!analysis) return [{ content: line, color: COLORS.value }];
  return renderPropertyAnalysis(analysis, null);
};

const tokenizeScalarContentLine = (line: string): HighlightToken[] => [
  { content: line, color: COLORS.value },
];

const findNextSpecialIndex = (text: string, start: number): number => {
  let next = text.length;
  const nextEscape = text.indexOf(ESCAPE_CHAR, start);
  const nextTag = text.indexOf(TAG_PREFIX, start);
  const nextDivider = text.indexOf(TAG_DIVIDER, start);

  if (nextEscape !== -1) next = Math.min(next, nextEscape);
  if (nextTag !== -1) next = Math.min(next, nextTag);
  if (nextDivider !== -1) next = Math.min(next, nextDivider);
  return next;
};

const findTagBoundary = (text: string, info: ReturnType<typeof readTagStartInfo>): number => {
  if (!info) return -1;

  const closerInfo = getTagCloserType(text, info.tagNameEnd + TAG_OPEN.length);
  if (!closerInfo) {
    return info.inlineContentStart;
  }

  if (closerInfo.closer === END_TAG) {
    const closeStart = findInlineClose(text, info.inlineContentStart);
    return closeStart === -1
      ? skipDegradedInline(text, info.inlineContentStart)
      : closeStart + END_TAG.length;
  }

  if (closerInfo.closer === RAW_CLOSE) {
    const contentStart = closerInfo.argClose + RAW_OPEN.length;
    const closeStart = findRawClose(text, contentStart);
    return closeStart === -1 ? contentStart : closeStart + RAW_CLOSE.length;
  }

  const contentStart = closerInfo.argClose + BLOCK_OPEN.length;
  const closeStart = findBlockClose(text, contentStart);
  return closeStart === -1 ? contentStart : closeStart + BLOCK_CLOSE.length;
};

const parseRichTextTree = (text: string, depth = 0, depthLimit = 50): RichTextTreeNode[] => {
  const nodes: RichTextTreeNode[] = [];
  let i = 0;
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    nodes.push({ type: "text", value: buffer });
    buffer = "";
  };

  while (i < text.length) {
    const [escaped, next] = readEscapedSequence(text, i);
    if (escaped !== null) {
      flush();
      nodes.push({ type: "escape", raw: text.slice(i, next) });
      i = next;
      continue;
    }

    if (text[i] === TAG_DIVIDER) {
      flush();
      nodes.push({ type: "separator" });
      i++;
      continue;
    }

    const info = readTagStartInfo(text, i);
    if (!info) {
      const nextSpecial = findNextSpecialIndex(text, i);
      if (nextSpecial <= i) {
        buffer += text[i];
        i++;
        continue;
      }
      buffer += text.slice(i, nextSpecial);
      i = nextSpecial;
      continue;
    }

    if (depth >= depthLimit) {
      const degradedEnd = findTagBoundary(text, info);
      buffer += text.slice(i, degradedEnd);
      i = degradedEnd;
      continue;
    }

    const closerInfo = getTagCloserType(text, info.tagNameEnd + TAG_OPEN.length);
    if (!closerInfo) {
      buffer += text.slice(i, info.inlineContentStart);
      i = info.inlineContentStart;
      continue;
    }

    if (closerInfo.closer === END_TAG) {
      const closeStart = findInlineClose(text, info.inlineContentStart);
      if (closeStart === -1) {
        buffer += text.slice(i, info.inlineContentStart);
        i = info.inlineContentStart;
        continue;
      }

      flush();
      nodes.push({
        type: "inline",
        tag: info.tag,
        args: parseRichTextTree(
          text.slice(info.inlineContentStart, closeStart),
          depth + 1,
          depthLimit,
        ),
      });
      i = closeStart + END_TAG.length;
      continue;
    }

    if (closerInfo.closer === RAW_CLOSE) {
      const contentStart = closerInfo.argClose + RAW_OPEN.length;
      const closeStart = findRawClose(text, contentStart);
      if (closeStart === -1) {
        buffer += text.slice(i, contentStart);
        i = contentStart;
        continue;
      }

      flush();
      nodes.push({
        type: "raw",
        tag: info.tag,
        args: parseRichTextTree(
          text.slice(info.inlineContentStart, closerInfo.argClose),
          depth + 1,
          depthLimit,
        ),
        content: text.slice(contentStart, closeStart),
      });
      i = closeStart + RAW_CLOSE.length;
      continue;
    }

    const contentStart = closerInfo.argClose + BLOCK_OPEN.length;
    const closeStart = findBlockClose(text, contentStart);
    if (closeStart === -1) {
      buffer += text.slice(i, contentStart);
      i = contentStart;
      continue;
    }

    flush();
    nodes.push({
      type: "block",
      tag: info.tag,
      args: parseRichTextTree(
        text.slice(info.inlineContentStart, closerInfo.argClose),
        depth + 1,
        depthLimit,
      ),
      content: parseRichTextTree(text.slice(contentStart, closeStart), depth + 1, depthLimit),
    });
    i = closeStart + BLOCK_CLOSE.length;
  }

  flush();
  return nodes;
};

const renderRichTextTree = (nodes: RichTextTreeNode[], textColor?: string): HighlightToken[] => {
  const tokens: HighlightToken[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      pushToken(tokens, node.value, textColor);
      continue;
    }

    if (node.type === "escape") {
      pushToken(tokens, node.raw, COLORS.escape);
      continue;
    }

    if (node.type === "separator") {
      pushToken(tokens, TAG_DIVIDER, COLORS.separator, "bold");
      continue;
    }

    pushToken(tokens, TAG_PREFIX, COLORS.punct, "bold");
    pushToken(tokens, node.tag, COLORS.tagName, "bold");
    pushToken(tokens, TAG_OPEN, COLORS.bracket);
    renderRichTextTree(node.args, COLORS.richTextArg).forEach((token) => tokens.push(token));
    pushToken(tokens, TAG_CLOSE, COLORS.bracket);

    if (node.type === "inline") {
      pushToken(tokens, TAG_PREFIX, COLORS.punct, "bold");
      continue;
    }

    if (node.type === "raw") {
      pushToken(tokens, RAW_MARKER, COLORS.operator, "bold");
      colorizeEscapes(node.content, COLORS.value).forEach((token) => tokens.push(token));
      pushToken(tokens, RAW_MARKER, COLORS.operator, "bold");
      pushToken(tokens, syntax.blockEnd, COLORS.end, "bold");
      pushToken(tokens, TAG_PREFIX, COLORS.punct, "bold");
      continue;
    }

    pushToken(tokens, BLOCK_MARKER, COLORS.operator, "bold");
    renderRichTextTree(node.content, COLORS.richTextContent).forEach((token) => tokens.push(token));
    pushToken(tokens, BLOCK_MARKER, COLORS.operator, "bold");
    pushToken(tokens, syntax.blockEnd, COLORS.end, "bold");
    pushToken(tokens, TAG_PREFIX, COLORS.punct, "bold");
  }

  return tokens;
};

const tokenizeTextLine = (line: string): HighlightToken[] => {
  const richTokens = renderRichTextTree(parseRichTextTree(line));
  const hasStructured = richTokens.some((token) => token.color !== undefined);
  return hasStructured ? richTokens : tokenizeDirectiveFragmentLine(line);
};

const splitTokensByLineBreak = (tokens: HighlightToken[]): HighlightToken[][] => {
  const lines: HighlightToken[][] = [[]];

  for (const token of tokens) {
    const parts = token.content.split("\n");

    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        lines[lines.length - 1].push({
          content: parts[i],
          color: token.color,
          fontStyle: token.fontStyle,
        });
      }

      if (i < parts.length - 1) {
        lines.push([]);
      }
    }
  }

  return lines;
};

const tokenizeTextBlockLines = (lines: string[]): HighlightToken[][] => {
  const joined = lines.join("\n");
  const rendered = renderRichTextTree(parseRichTextTree(joined));
  const splitLines = splitTokensByLineBreak(rendered);

  if (splitLines.length !== lines.length) {
    return lines.map((line) => tokenizeTextLine(line));
  }

  return lines.map((line, index) => {
    const tokens = splitLines[index];
    const hasStructured = tokens.some((token) => token.color !== undefined);
    return hasStructured ? tokens : tokenizeTextLine(line);
  });
};

const isStandaloneTextLine = (line: string, role: LineRole): boolean => {
  if (role) return false;
  return analyzeDashListLine(line) === null;
};

const createLineRoles = (lineCount: number, tree: DSLNode<BlockName>[]): LineRole[] => {
  const roles: LineRole[] = Array.from({ length: lineCount }, () => null);

  const visit = (nodes: DSLNode<BlockName>[]) => {
    for (const node of nodes) {
      const startIndex = node.lineStart - 1;
      const endIndex = node.lineEnd - 1;

      if (startIndex >= 0 && startIndex < roles.length) {
        roles[startIndex] = { kind: "start", blockName: node.name };
      }

      if (endIndex >= 0 && endIndex < roles.length) {
        roles[endIndex] = { kind: "end", blockName: node.name };
      }

      for (let i = startIndex + 1; i < endIndex; i++) {
        if (i >= 0 && i < roles.length) {
          roles[i] = { kind: "content", blockName: node.name };
        }
      }

      visit(node.children);
    }
  };

  visit(tree);
  return roles;
};

const tokenizeAstDirectiveLine = (role: {
  kind: "start" | "end";
  blockName: BlockName;
}): HighlightToken[] => {
  const tokens: HighlightToken[] = [];
  pushToken(tokens, syntax.blockPrefix, COLORS.punct, "bold");
  pushToken(
    tokens,
    role.kind === "end" ? syntax.blockEnd : role.blockName,
    role.kind === "end" ? COLORS.end : COLORS.tagName,
    "bold",
  );
  return tokens;
};

export const tokenizeYumeDsl = (code: string): HighlightToken[][] => {
  const normalizedCode = code.replace(/\t/g, "  ");
  const lines = splitTextLines(normalizedCode);
  const tree = parseDSL<BlockName>(normalizedCode);
  const roles = createLineRoles(lines.length, tree);
  const tokenLines: HighlightToken[][] = [];
  let scalarIndent: number | null = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const role = roles[index];
    const indent = line.length - line.trimStart().length;

    if (role?.kind === "start" || role?.kind === "end") {
      tokenLines.push(tokenizeAstDirectiveLine({ kind: role.kind, blockName: role.blockName }));
      scalarIndent = null;
      continue;
    }

    if (scalarIndent !== null) {
      if (line.trim().length === 0 || indent > scalarIndent) {
        tokenLines.push(tokenizeScalarContentLine(line));
        continue;
      }
      scalarIndent = null;
    }

    if (role?.kind === "content" && role.blockName === "meta") {
      tokenLines.push(renderKeyValueLine(line));
      if (isMultilinePropertyLine(line, "plain")) scalarIndent = indent;
      continue;
    }

    if (role?.kind === "content" && role.blockName === "image") {
      tokenLines.push(renderDashListLine(line));
      if (isMultilinePropertyLine(line, "dash")) scalarIndent = indent;
      continue;
    }

    if (role?.kind === "content" && role.blockName === "text") {
      let endIndex = index;
      while (endIndex < lines.length) {
        const nextRole = roles[endIndex];
        if (nextRole?.kind !== "content" || nextRole.blockName !== "text") {
          break;
        }
        endIndex++;
      }

      const blockLines = lines.slice(index, endIndex);
      const renderedLines = tokenizeTextBlockLines(blockLines);
      renderedLines.forEach((renderedLine) => tokenLines.push(renderedLine));
      index = endIndex - 1;
      continue;
    }

    const dashAnalysis = analyzeDashListLine(line);
    if (dashAnalysis) {
      tokenLines.push(renderDashListLine(line));
      if (dashAnalysis.isMultiline) scalarIndent = indent;
      continue;
    }

    let endIndex = index;
    while (endIndex < lines.length && isStandaloneTextLine(lines[endIndex], roles[endIndex])) {
      endIndex++;
    }

    const blockLines = lines.slice(index, endIndex);
    const renderedLines = tokenizeTextBlockLines(blockLines);
    renderedLines.forEach((renderedLine) => tokenLines.push(renderedLine));
    index = endIndex - 1;
  }

  return tokenLines;
};
