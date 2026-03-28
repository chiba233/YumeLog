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
import { DEFAULT_SYNTAX, readEscapedSequence } from "yume-dsl-rich-text";
import {
  type HighlightToken,
  splitTokensByLineBreak,
  tokenizeRichText as tokenizeRichTextHighlight,
} from "yume-dsl-shiki-highlight";

const ESCAPE_CHAR = DEFAULT_SYNTAX.escapeChar;

export type { HighlightToken };

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
  escape: "#116329",
} as const;

const RICH_TEXT_COLORS = {
  tagName: COLORS.tagName,
  punct: COLORS.punct,
  bracket: COLORS.bracket,
  separator: COLORS.separator,
  operator: COLORS.operator,
  end: COLORS.end,
  escape: COLORS.escape,
  argText: COLORS.property,
  contentText: COLORS.value,
} as const;

type BlockName = (typeof DSL_BLOCK_NAMES)[number];
type LineRole = { kind: "start" | "end" | "content"; blockName: BlockName } | null;
const BLOCK_NAME_SET = new Set<string>(DSL_BLOCK_NAMES);

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
  return renderPropertyAnalysis(analysis, analysis.listMarker);
};

const renderKeyValueLine = (line: string): HighlightToken[] => {
  const analysis = analyzePropertyLine(line);
  if (!analysis) return [{ content: line, color: COLORS.value }];
  return renderPropertyAnalysis(analysis, null);
};

const tokenizeScalarContentLine = (line: string): HighlightToken[] => [
  { content: line, color: COLORS.value },
];

const tokenizeTextLine = (line: string): HighlightToken[] => {
  const richTokens = tokenizeRichTextHighlight(line, { colors: RICH_TEXT_COLORS });
  const hasStructured = richTokens.some((token) => token.color !== undefined);
  return hasStructured ? richTokens : tokenizeDirectiveFragmentLine(line);
};

const tokenizeTextBlockLines = (lines: string[]): HighlightToken[][] => {
  const joined = lines.join("\n");
  const rendered = tokenizeRichTextHighlight(joined, { colors: RICH_TEXT_COLORS });
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

    if (role?.kind === "content" && line.startsWith(ESCAPE_CHAR)) {
      let slashEnd = 0;
      while (line[slashEnd] === ESCAPE_CHAR) slashEnd++;
      if (parseDirective(line.slice(slashEnd), BLOCK_NAME_SET)) {
        tokenLines.push(tokenizeDirectiveFragmentLine(line));
        continue;
      }
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
