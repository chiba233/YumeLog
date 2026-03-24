import type { RichType, TextToken, TitledBlockType, TokenDraft } from "./types";
import commonI18n from "@/data/I18N/commonI18n.json";
import { readEscapedSequence, unescapeInline } from "./escape";
import { ESCAPE_CHAR, TAG_DIVIDER } from "./constants";
import { lang } from "@/shared/lib/app/setupLang.ts";
import { $message } from "@/shared/lib/app/msgUtils.ts";
import { createToken } from "@/shared/lib/dsl/BlogRichText/createToken.ts";
import {
  resolveSupportedCodeLang,
  type SupportedCodeLang,
} from "@/shared/lib/external/codeLang.ts";

type CommonI18nKeys = keyof typeof commonI18n;
type I18nMap = Record<string, string>;
const createTextToken = (value: string): TextToken => createToken({ type: "text", value });

export const extractText = (tokens?: TextToken[]): string => {
  if (!tokens?.length) return "";
  return tokens.map((t) => (typeof t.value === "string" ? t.value : extractText(t.value))).join("");
};

export const materializeTextTokens = (tokens: TextToken[]): TextToken[] => {
  return tokens.map((token) => {
    if (typeof token.value === "string") {
      return token.type === "text" ? { ...token, value: unescapeInline(token.value) } : token;
    }

    return {
      ...token,
      value: materializeTextTokens(token.value),
    };
  });
};

export interface PipeArgs {
  parts: TextToken[][];
  text: (index: number) => string;
  materializedTokens: (index: number) => TextToken[];
  materializedTailTokens: (startIndex: number) => TextToken[];
}

export const splitTokensByPipe = (tokens: TextToken[]): TextToken[][] => {
  const parts: TextToken[][] = [[]];

  for (const token of tokens) {
    if (token.type !== "text" || typeof token.value !== "string") {
      parts[parts.length - 1].push(token);
      continue;
    }

    let buffer = "";
    let i = 0;
    const val = token.value;

    const flushText = () => {
      if (buffer) {
        parts[parts.length - 1].push(createTextToken(buffer));
        buffer = "";
      }
    };

    while (i < val.length) {
      const [escaped, next] = readEscapedSequence(val, i);
      if (escaped !== null) {
        buffer += ESCAPE_CHAR + escaped;
        i = next;
        continue;
      }

      if (val[i] === TAG_DIVIDER) {
        flushText();
        parts.push([]);
        i++;
        while (i < val.length && val[i] === " ") i++;
        continue;
      }

      buffer += val[i];
      i++;
    }

    flushText();
  }
  return parts;
};

export const parsePipeArgs = (tokens: TextToken[]): PipeArgs => {
  const parts = splitTokensByPipe(tokens);

  return {
    parts,
    text: (index) => unescapeInline(extractText(parts[index] ?? [])).trim(),
    materializedTokens: (index) => materializeTextTokens(parts[index] ?? []),
    materializedTailTokens: (startIndex) => materializeTextTokens(parts.slice(startIndex).flat()),
  };
};

export const parsePipeTextArgs = (text: string): PipeArgs => parsePipeArgs([createTextToken(text)]);

export const buildRichBlock = (
  type: RichType,
  titleToken: TextToken[] | string | undefined,
  content: TextToken[] | string,
  defaultTitleI18nKey: CommonI18nKeys,
): TokenDraft => {
  const titleStr =
    typeof titleToken === "string" ? titleToken : titleToken ? extractText(titleToken) : "";
  const i18nEntry = commonI18n[defaultTitleI18nKey] as unknown as I18nMap;

  const finalContent: TextToken[] =
    typeof content === "string" ? [createTextToken(content)] : content;

  return {
    type,
    title: unescapeInline(titleStr).trim() || i18nEntry[lang.value] || i18nEntry.en,
    value: finalContent,
  };
};

export const buildPlainRawBlock = (
  type: TitledBlockType,
  arg: string | undefined,
  content: string,
  defaultTitleI18nKey: CommonI18nKeys,
): TokenDraft => {
  return buildRichBlock(type, arg, [createTextToken(content)], defaultTitleI18nKey);
};

export const buildLabeledInlineBlock = (
  type: TitledBlockType,
  tokens: TextToken[],
  defaultTitleI18nKey: CommonI18nKeys,
): TokenDraft => {
  const args = parsePipeArgs(tokens);
  const title = args.materializedTokens(0);
  const content = args.materializedTailTokens(1);

  if (args.parts.length <= 1) {
    return buildRichBlock(type, undefined, title, defaultTitleI18nKey);
  }

  return buildRichBlock(type, title, content, defaultTitleI18nKey);
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
