import type { RichType } from "./types";
import type { DslContext, TextToken, TokenDraft } from "yume-dsl-rich-text";
import { createTextToken, extractText, parsePipeArgs, unescapeInline } from "yume-dsl-rich-text";
import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/shared/lib/app/setupLang.ts";
import { $message } from "@/shared/lib/app/msgUtils.ts";
import {
  resolveSupportedCodeLang,
  type SupportedCodeLang,
} from "@/shared/lib/external/codeLang.ts";

type CommonI18nKeys = keyof typeof commonI18n;
type I18nMap = Record<string, string>;

export const buildRichBlock = (
  type: RichType,
  titleToken: TextToken[] | string | undefined,
  content: TextToken[] | string,
  defaultTitleI18nKey: CommonI18nKeys,
  ctx?: DslContext,
): TokenDraft => {
  const titleStr =
    typeof titleToken === "string" ? titleToken : titleToken ? extractText(titleToken) : "";
  const i18nEntry = commonI18n[defaultTitleI18nKey] as unknown as I18nMap;

  const finalContent: TextToken[] =
    typeof content === "string" ? [createTextToken(content, ctx)] : content;

  return {
    type,
    title: unescapeInline(titleStr, ctx).trim() || i18nEntry[lang.value] || i18nEntry.en,
    value: finalContent,
  };
};

export const buildPlainRawBlock = (
  type: RichType,
  arg: string | undefined,
  content: string,
  defaultTitleI18nKey: CommonI18nKeys,
  ctx?: DslContext,
): TokenDraft => {
  return buildRichBlock(type, arg, [createTextToken(content, ctx)], defaultTitleI18nKey, ctx);
};

export const buildLabeledInlineBlock = (
  type: RichType,
  tokens: TextToken[],
  defaultTitleI18nKey: CommonI18nKeys,
  ctx?: DslContext,
): TokenDraft => {
  const args = parsePipeArgs(tokens, ctx);
  const title = args.materializedTokens(0);
  const content = args.materializedTailTokens(1);

  if (args.parts.length <= 1) {
    return buildRichBlock(type, undefined, title, defaultTitleI18nKey, ctx);
  }

  return buildRichBlock(type, title, content, defaultTitleI18nKey, ctx);
};

export const normalizeLang = (codeLang?: string): SupportedCodeLang => {
  if (!codeLang) return "typescript";
  const normalized = resolveSupportedCodeLang(codeLang);
  if (!normalized) {
    const unsupportedCodeLanguage = commonI18n.unsupportedCodeLanguage as I18nMap;
    const unsupportedCodeLanguageMsg = (
      unsupportedCodeLanguage[lang.value] || unsupportedCodeLanguage.en
    ).replace("{language}", String(codeLang));
    $message.error(unsupportedCodeLanguageMsg, true, 3000);
    return "text";
  }
  return normalized;
};
