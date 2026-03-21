import type { BlockType, RichType, TagHandler, TagHandlerMap, TextToken } from "./types";
import { BLOCK_TYPES, RICH_TYPES } from "./types";
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

  info: createTitledTagHandler("info", "labelInfo"),
  warning: createTitledTagHandler("warning", "labelWarning"),
  collapse: createTitledTagHandler("collapse", "collapseClickToExpand"),

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
