import type { LanguageRegistration } from "shiki/types";
import { DSL_BLOCK_NAMES } from "@/shared/lib/dsl/extractAtBlocks/types.ts";
import {
  RAW_CAPABLE_RICH_TYPES,
  RICH_TYPES,
  TITLED_BLOCK_TYPES,
} from "@/shared/lib/dsl/BlogRichText/types.ts";
import {
  BUILTIN_LANGUAGE_IDS,
  PROJECT_LANGUAGE_IDS,
  SHIKI_LANGUAGE_IDS,
  type SupportedCodeLang,
} from "@/shared/lib/external/codeLang.ts";

const escapeRegex = (value: string): string => value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");

export const SHIKI_THEME = "github-light-high-contrast" as const;

export { BUILTIN_LANGUAGE_IDS, PROJECT_LANGUAGE_IDS, SHIKI_LANGUAGE_IDS };
export type { SupportedCodeLang };

const tagAlternation = (tags: readonly string[]): string => tags.map(escapeRegex).join("|");
const BLOCK_TAG_PATTERN = tagAlternation(DSL_BLOCK_NAMES);
const RICH_TAG_PATTERN = tagAlternation(RICH_TYPES);
const RICH_RAW_TAG_PATTERN = tagAlternation(RAW_CAPABLE_RICH_TYPES);
const RICH_BLOCK_TAG_PATTERN = tagAlternation(TITLED_BLOCK_TYPES);

const createCaptureMap = (...entries: Array<[number, string]>): Record<number, { name: string }> =>
  Object.fromEntries(entries.map(([index, name]) => [index, { name }]));

const projectBlockDslGrammar: LanguageRegistration = {
  name: "blog-block-dsl",
  displayName: "Blog Block DSL",
  scopeName: "source.blog-block-dsl",
  aliases: ["blog-dsl", "block-dsl", "dsl-block", "at-block-dsl"],
  patterns: [
    { include: "#escaped-text-block" },
    { include: "#escaped-meta-block" },
    { include: "#escaped-image-block" },
    { include: "#escaped-divider-block" },
    { include: "#text-block" },
    { include: "#meta-block" },
    { include: "#image-block" },
    { include: "#divider-block" },
    { include: "#block-end" },
    { include: "#escaped-directive" },
  ],
  repository: {
    "escaped-directive-fragment": {
      match: `(\\\\+)(@)(${BLOCK_TAG_PATTERN}|end)\\b`,
      captures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.directive.blog-block-dsl"],
      ),
    },
    "escaped-block-end": {
      match: "^(\\\\+)(@)(end)(\\s*)$",
      captures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.flow.end.blog-block-dsl"],
      ),
    },
    "escaped-directive": {
      match: `^(\\\\+)(@)(${BLOCK_TAG_PATTERN}|end)(\\s*)$`,
      captures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.directive.blog-block-dsl"],
      ),
    },
    "escaped-meta-block": {
      begin: "^(\\\\+)(@)(meta)(\\s*)$",
      beginCaptures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.directive.meta.blog-block-dsl"],
      ),
      end: "^(\\\\+)(@)(end)(\\s*)$",
      endCaptures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.flow.end.blog-block-dsl"],
      ),
      patterns: [{ include: "#meta-property-line" }],
    },
    "escaped-text-block": {
      begin: "^(\\\\+)(@)(text)(\\s*)$",
      beginCaptures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.directive.text.blog-block-dsl"],
      ),
      end: "^(\\\\+)(@)(end)(\\s*)$",
      endCaptures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.flow.end.blog-block-dsl"],
      ),
      patterns: [
        { include: "#escaped-directive-fragment" },
        { include: "source.blog-rich-text-dsl" },
      ],
    },
    "escaped-image-block": {
      begin: "^(\\\\+)(@)(image)(\\s*)$",
      beginCaptures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.directive.image.blog-block-dsl"],
      ),
      end: "^(\\\\+)(@)(end)(\\s*)$",
      endCaptures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.flow.end.blog-block-dsl"],
      ),
      patterns: [
        { include: "#image-block-scalar" },
        { include: "#image-item-line" },
        { include: "#image-property-line" },
      ],
    },
    "escaped-divider-block": {
      begin: "^(\\\\+)(@)(divider)(\\s*)$",
      beginCaptures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.directive.divider.blog-block-dsl"],
      ),
      end: "^(\\\\+)(@)(end)(\\s*)$",
      endCaptures: createCaptureMap(
        [1, "constant.character.escape.blog-block-dsl"],
        [2, "punctuation.definition.directive.blog-block-dsl"],
        [3, "keyword.control.flow.end.blog-block-dsl"],
      ),
    },
    "block-end": {
      match: "^(@)(end)(\\s*)$",
      captures: createCaptureMap(
        [1, "punctuation.definition.directive.blog-block-dsl"],
        [2, "keyword.control.flow.end.blog-block-dsl"],
      ),
    },
    "directive-line": {
      match: `^(@)(${BLOCK_TAG_PATTERN})(\\s*)$`,
      captures: createCaptureMap(
        [1, "punctuation.definition.directive.blog-block-dsl"],
        [2, "keyword.control.directive.blog-block-dsl"],
      ),
    },
    "meta-block": {
      begin: "^(@)(meta)(\\s*)$",
      beginCaptures: createCaptureMap(
        [1, "punctuation.definition.directive.blog-block-dsl"],
        [2, "keyword.control.directive.meta.blog-block-dsl"],
      ),
      end: "^(@)(end)(\\s*)$",
      endCaptures: createCaptureMap(
        [1, "punctuation.definition.directive.blog-block-dsl"],
        [2, "keyword.control.flow.end.blog-block-dsl"],
      ),
      patterns: [{ include: "#meta-property-line" }],
    },
    "text-block": {
      begin: "^(@)(text)(\\s*)$",
      beginCaptures: createCaptureMap(
        [1, "punctuation.definition.directive.blog-block-dsl"],
        [2, "keyword.control.directive.text.blog-block-dsl"],
      ),
      end: "^(@)(end)(\\s*)$",
      endCaptures: createCaptureMap(
        [1, "punctuation.definition.directive.blog-block-dsl"],
        [2, "keyword.control.flow.end.blog-block-dsl"],
      ),
      patterns: [
        { include: "#escaped-directive-fragment" },
        { include: "source.blog-rich-text-dsl" },
      ],
    },
    "image-block": {
      begin: "^(@)(image)(\\s*)$",
      beginCaptures: createCaptureMap(
        [1, "punctuation.definition.directive.blog-block-dsl"],
        [2, "keyword.control.directive.image.blog-block-dsl"],
      ),
      end: "^(@)(end)(\\s*)$",
      endCaptures: createCaptureMap(
        [1, "punctuation.definition.directive.blog-block-dsl"],
        [2, "keyword.control.flow.end.blog-block-dsl"],
      ),
      patterns: [
        { include: "#image-block-scalar" },
        { include: "#image-item-line" },
        { include: "#image-property-line" },
      ],
    },
    "divider-block": {
      begin: "^(@)(divider)(\\s*)$",
      beginCaptures: createCaptureMap(
        [1, "punctuation.definition.directive.blog-block-dsl"],
        [2, "keyword.control.directive.divider.blog-block-dsl"],
      ),
      end: "^(@)(end)(\\s*)$",
      endCaptures: createCaptureMap(
        [1, "punctuation.definition.directive.blog-block-dsl"],
        [2, "keyword.control.flow.end.blog-block-dsl"],
      ),
    },
    "meta-property-line": {
      match: "^(\\s*)([A-Za-z0-9_-]+)(\\s*:\\s*)(.*)$",
      captures: createCaptureMap(
        [2, "variable.other.property.blog-block-dsl"],
        [3, "punctuation.separator.key-value.blog-block-dsl"],
        [4, "string.unquoted.blog-block-dsl"],
      ),
    },
    "image-item-line": {
      match: "^(\\s*)(-)(\\s+)([A-Za-z0-9_-]+)(\\s*:\\s*)(\\|)?(.*)$",
      captures: createCaptureMap(
        [2, "punctuation.definition.list.begin.blog-block-dsl"],
        [4, "variable.other.property.blog-block-dsl"],
        [5, "punctuation.separator.key-value.blog-block-dsl"],
        [6, "keyword.operator.block-scalar.blog-block-dsl"],
        [7, "string.unquoted.blog-block-dsl"],
      ),
    },
    "image-property-line": {
      match: "^(\\s+)([A-Za-z0-9_-]+)(\\s*:\\s*)(\\|)?(.*)$",
      captures: createCaptureMap(
        [2, "variable.other.property.blog-block-dsl"],
        [3, "punctuation.separator.key-value.blog-block-dsl"],
        [4, "keyword.operator.block-scalar.blog-block-dsl"],
        [5, "string.unquoted.blog-block-dsl"],
      ),
    },
    "image-block-scalar": {
      begin: "^(\\s+)([A-Za-z0-9_-]+)(\\s*:\\s*)(\\|)\\s*$",
      beginCaptures: createCaptureMap(
        [2, "variable.other.property.blog-block-dsl"],
        [3, "punctuation.separator.key-value.blog-block-dsl"],
        [4, "keyword.operator.block-scalar.blog-block-dsl"],
      ),
      end: "^(?!\\1\\s+)",
      patterns: [
        {
          match: "^\\s+.*$",
          name: "string.unquoted.block.blog-block-dsl",
        },
      ],
    },
  },
};

const projectRichTextDslGrammar: LanguageRegistration = {
  name: "blog-rich-text-dsl",
  displayName: "Blog Rich Text DSL",
  scopeName: "source.blog-rich-text-dsl",
  aliases: ["rich-text-dsl", "rich-dsl", "dsl-rich", "blog-rich-dsl"],
  patterns: [
    { include: "#raw-tag" },
    { include: "#block-tag" },
    { include: "#inline-tag" },
    { include: "#escape-sequence" },
  ],
  repository: {
    "escape-sequence": {
      match: "\\\\(?:\\\\|\\(|\\)|\\||\\$\\$|\\*end\\$\\$|%end\\$\\$)",
      name: "constant.character.escape.blog-rich-text-dsl",
    },
    "pipe-divider": {
      match: "\\|",
      name: "punctuation.separator.arguments.blog-rich-text-dsl",
    },
    "tag-name": {
      match: RICH_TAG_PATTERN,
      name: "entity.name.tag.blog-rich-text-dsl",
    },
    "inline-tag": {
      begin: `(\\$\\$)(${RICH_TAG_PATTERN})(\\()`,
      beginCaptures: createCaptureMap(
        [1, "punctuation.definition.tag.begin.blog-rich-text-dsl"],
        [2, "entity.name.tag.blog-rich-text-dsl"],
        [3, "punctuation.section.arguments.begin.blog-rich-text-dsl"],
      ),
      end: "(\\))(\\$\\$)",
      endCaptures: createCaptureMap(
        [1, "punctuation.section.arguments.end.blog-rich-text-dsl"],
        [2, "punctuation.definition.tag.end.blog-rich-text-dsl"],
      ),
      patterns: [
        { include: "#escape-sequence" },
        { include: "#inline-tag" },
        { include: "#paren-group" },
        { include: "#pipe-divider" },
      ],
    },
    "paren-group": {
      begin: "(\\()",
      beginCaptures: createCaptureMap([1, "punctuation.section.group.begin.blog-rich-text-dsl"]),
      end: "(\\))",
      endCaptures: createCaptureMap([1, "punctuation.section.group.end.blog-rich-text-dsl"]),
      patterns: [
        { include: "#escape-sequence" },
        { include: "#inline-tag" },
        { include: "#paren-group" },
        { include: "#pipe-divider" },
      ],
    },
    "raw-tag": {
      begin: `(\\$\\$)(${RICH_RAW_TAG_PATTERN})(\\()((?:\\\\.|[^\\\\)])*)(\\))(%)\\n?`,
      beginCaptures: createCaptureMap(
        [1, "punctuation.definition.tag.begin.blog-rich-text-dsl"],
        [2, "entity.name.tag.raw.blog-rich-text-dsl"],
        [3, "punctuation.section.arguments.begin.blog-rich-text-dsl"],
        [5, "punctuation.section.arguments.end.blog-rich-text-dsl"],
        [6, "keyword.operator.raw.open.blog-rich-text-dsl"],
      ),
      end: "^(%)(end)(\\$\\$)$",
      endCaptures: createCaptureMap(
        [1, "keyword.operator.raw.close.blog-rich-text-dsl"],
        [2, "keyword.control.flow.end.blog-rich-text-dsl"],
        [3, "punctuation.definition.tag.end.blog-rich-text-dsl"],
      ),
      patterns: [
        { include: "#escape-sequence" },
        { include: "#inline-tag" },
        { include: "#paren-group" },
        { include: "#pipe-divider" },
        {
          match: "^.*$",
          name: "string.unquoted.block.blog-rich-text-dsl",
        },
      ],
    },
    "block-tag": {
      begin: `(\\$\\$)(${RICH_BLOCK_TAG_PATTERN})(\\()((?:\\\\.|[^\\\\)])*)(\\))(\\*)\\n?`,
      beginCaptures: createCaptureMap(
        [1, "punctuation.definition.tag.begin.blog-rich-text-dsl"],
        [2, "entity.name.tag.block.blog-rich-text-dsl"],
        [3, "punctuation.section.arguments.begin.blog-rich-text-dsl"],
        [5, "punctuation.section.arguments.end.blog-rich-text-dsl"],
        [6, "keyword.operator.block.open.blog-rich-text-dsl"],
      ),
      end: "^(\\*)(end)(\\$\\$)$",
      endCaptures: createCaptureMap(
        [1, "keyword.operator.block.close.blog-rich-text-dsl"],
        [2, "keyword.control.flow.end.blog-rich-text-dsl"],
        [3, "punctuation.definition.tag.end.blog-rich-text-dsl"],
      ),
      patterns: [
        { include: "#escape-sequence" },
        { include: "#inline-tag" },
        { include: "#paren-group" },
        { include: "#pipe-divider" },
        { include: "#raw-tag" },
        { include: "#block-tag" },
        { include: "#inline-tag" },
        { include: "#escape-sequence" },
      ],
    },
  },
};

const projectUnifiedDslGrammar: LanguageRegistration = {
  name: "yumeDSL",
  displayName: "Yume DSL",
  scopeName: "source.yume-dsl",
  aliases: ["yumedsl"],
  repository: {},
  patterns: [{ include: "source.blog-block-dsl" }, { include: "source.blog-rich-text-dsl" }],
};

export const PROJECT_DSL_LANGUAGES: LanguageRegistration[] = [
  projectUnifiedDslGrammar,
  projectBlockDslGrammar,
  projectRichTextDslGrammar,
];

export { resolveSupportedCodeLang } from "@/shared/lib/external/codeLang.ts";
