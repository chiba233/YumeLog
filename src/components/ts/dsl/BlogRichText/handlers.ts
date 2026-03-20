import { BLOCK_TYPES, BlockType, RICH_TYPES, RichType, TagHandlerMap } from "../../d";
import {
  buildLabeledInlineBlock,
  buildPlainRawBlock,
  buildRichBlock,
  extractText,
  normalizeLang,
  splitTokensByPipe,
} from "./builders";
import { unescapeInline } from "./escape";
import { createToken } from "@/components/ts/dsl/BlogRichText/createToken";

export const TAG_HANDLERS: Partial<TagHandlerMap> = {
  link: {
    inline: (tokens) => {
      const parts = splitTokensByPipe(tokens);
      const urlPart = parts[0] ?? [];
      const contentPart = parts.length > 1 ? parts.slice(1).flat() : urlPart;

      return createToken({
        type: "link",
        url: unescapeInline(extractText(urlPart)).trim(),
        value: contentPart,
      });
    },
  },

  info: {
    inline: (tokens) => buildLabeledInlineBlock("info", tokens, "labelInfo"),
    raw: (arg, content) => buildPlainRawBlock("info", arg, content, "labelInfo"),
    block: (arg, content) => buildRichBlock("info", arg, content, "labelInfo"),
  },

  warning: {
    inline: (tokens) => buildLabeledInlineBlock("warning", tokens, "labelWarning"),
    raw: (arg, content) => buildPlainRawBlock("warning", arg, content, "labelWarning"),
    block: (arg, content) => buildRichBlock("warning", arg, content, "labelWarning"),
  },

  collapse: {
    inline: (tokens) => buildLabeledInlineBlock("collapse", tokens, "collapseClickToExpand"),
    raw: (arg, content) => buildPlainRawBlock("collapse", arg, content, "collapseClickToExpand"),
    block: (arg, content) => buildRichBlock("collapse", arg, content, "collapseClickToExpand"),
  },

  "raw-code": {
    raw: (arg, content) => {
      const parts = splitTokensByPipe([createToken({ type: "text", value: arg ?? "" })]);
      const codeLang = normalizeLang(unescapeInline(extractText(parts[0] ?? [])).trim());
      const title = unescapeInline(extractText(parts[1] ?? [])).trim();
      const label = unescapeInline(extractText(parts[2] ?? [])).trim();

      return createToken({
        type: "raw-code",
        codeLang,
        title: title || "Code:",
        label,
        value: content.replace(/\r\n/g, "\n").replace(/\n$/, ""),
      });
    },
  },
};

const RICH_TYPE_SET: ReadonlySet<RichType> = new Set(RICH_TYPES);
export const BLOCK_TYPES_SET: ReadonlySet<BlockType> = new Set(BLOCK_TYPES);
export const isRichType = (tag: string): tag is RichType => RICH_TYPE_SET.has(tag as RichType);
