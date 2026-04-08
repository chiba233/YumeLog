import type { RichTokenDraft, TagHandlerMap } from "./types";
import { BLOG_TAG_GROUPS } from "./types";
import type { TagHandler, TextToken } from "yume-dsl-rich-text";
import {
  createPipeHandlers,
  createSimpleInlineHandlers,
  parsePipeTextList,
} from "yume-dsl-rich-text";
import {
  buildLabeledInlineBlock,
  buildPlainRawBlock,
  buildRichBlock,
  normalizeLang,
} from "./builders";

type TitledLabelKey = "labelInfo" | "labelWarning" | "collapseClickToExpand";

const createTitledTagHandler = (
  type: "info" | "warning" | "collapse",
  labelKey: TitledLabelKey,
): TagHandler => ({
  inline: (tokens: TextToken[], ctx) => buildLabeledInlineBlock(type, tokens, labelKey, ctx),
  raw: (arg: string | undefined, content: string, ctx) =>
    buildPlainRawBlock(type, arg, content, labelKey, ctx),
  block: (arg: string | undefined, content: TextToken[], ctx) =>
    buildRichBlock(type, arg, content, labelKey, ctx),
});

export const TAG_HANDLERS = {
  ...createSimpleInlineHandlers(BLOG_TAG_GROUPS.simpleInline),
  ...createPipeHandlers({
    link: {
      inline: (args): RichTokenDraft<"link"> => ({
        type: "link",
        url: args.text(0),
        value: args.parts.length > 1 ? args.materializedTailTokens(1) : args.materializedTokens(0),
      }),
    },
    fromNow: {
      inline: (args): RichTokenDraft<"fromNow"> => ({
        type: "fromNow",
        value: "",
        date: args.text(0),
        timeLang: args.text(1) || undefined,
      }),
    },
    date: {
      inline: (args): RichTokenDraft<"date"> => ({
        type: "date",
        value: "",
        date: args.text(0),
        format: args.text(1) || undefined,
        timeLang: args.text(2) || undefined,
      }),
    },
  }),
  info: createTitledTagHandler("info", "labelInfo"),
  warning: createTitledTagHandler("warning", "labelWarning"),
  collapse: createTitledTagHandler("collapse", "collapseClickToExpand"),

  "raw-code": {
    raw: (arg, content, ctx) => {
      const [langArg, title = "", label = ""] = parsePipeTextList(arg ?? "", ctx);
      const codeLang = normalizeLang(langArg);

      return {
        type: "raw-code",
        codeLang,
        title: title || "Code:",
        label,
        value: content,
      } satisfies RichTokenDraft<"raw-code">;
    },
  },
} satisfies TagHandlerMap;
