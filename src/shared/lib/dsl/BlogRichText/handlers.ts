import type { BlockType, RichType, TagHandler, TagHandlerMap, TextToken } from "./types";
import { BLOCK_TYPES, RICH_TYPES } from "./types";
import {
  buildLabeledInlineBlock,
  buildPlainRawBlock,
  buildRichBlock,
  normalizeLang,
  parsePipeArgs,
  parsePipeTextArgs,
} from "./builders";

type TitledLabelKey = "labelInfo" | "labelWarning" | "collapseClickToExpand";

const createTitledTagHandler = (
  type: "info" | "warning" | "collapse",
  labelKey: TitledLabelKey,
): TagHandler => ({
  inline: (tokens: TextToken[]) => buildLabeledInlineBlock(type, tokens, labelKey),
  raw: (arg: string | undefined, content: string) =>
    buildPlainRawBlock(type, arg, content, labelKey),
  block: (arg: string | undefined, content: TextToken[]) =>
    buildRichBlock(type, arg, content, labelKey),
});

export const TAG_HANDLERS: Partial<TagHandlerMap> = {
  link: {
    inline: (tokens) => {
      const args = parsePipeArgs(tokens);

      return {
        type: "link",
        url: args.text(0),
        value: args.parts.length > 1 ? args.materializedTailTokens(1) : args.materializedTokens(0),
      };
    },
  },
  fromNow: {
    inline: (tokens: TextToken[]) => {
      const args = parsePipeArgs(tokens);

      return {
        type: "fromNow",
        value: "",
        date: args.text(0),
        timeLang: args.text(1) || undefined,
      };
    },
  },

  date: {
    inline: (tokens: TextToken[]) => {
      const args = parsePipeArgs(tokens);

      return {
        type: "date",
        value: "",
        date: args.text(0),
        format: args.text(1) || undefined,
        timeLang: args.text(2) || undefined,
      };
    },
  },
  info: createTitledTagHandler("info", "labelInfo"),
  warning: createTitledTagHandler("warning", "labelWarning"),
  collapse: createTitledTagHandler("collapse", "collapseClickToExpand"),

  "raw-code": {
    raw: (arg, content) => {
      const args = parsePipeTextArgs(arg ?? "");
      const codeLang = normalizeLang(args.text(0));
      const title = args.text(1);
      const label = args.text(2);

      return {
        type: "raw-code",
        codeLang,
        title: title || "Code:",
        label,
        value: content,
      };
    },
  },
};

const RICH_TYPE_SET: ReadonlySet<RichType> = new Set(RICH_TYPES);
export const BLOCK_TYPES_SET: ReadonlySet<BlockType> = new Set(BLOCK_TYPES);
export const isRichType = (tag: string): tag is RichType => RICH_TYPE_SET.has(tag as RichType);
