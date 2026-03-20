import { RichType, TextToken, TitledBlockType } from "../../d";
import commonI18n from "@/data/I18N/commonI18n.json";
import { readEscapedSequence, unescapeInline } from "./escape";
import { ESCAPE_CHAR, TAG_DIVIDER } from "./constants";
import { lang } from "../../setupLang";
import { $message } from "@/components/ts/msgUtils.ts";
import { createToken } from "@/components/ts/dsl/BlogRichText/createToken.ts";

type CommonI18nKeys = keyof typeof commonI18n;
type I18nMap = Record<string, string>;
const ALLOWED_LANGS = ["typescript", "bash", "json", "yaml", "vue", "html", "text"] as const;
type SupportedLang = (typeof ALLOWED_LANGS)[number];

const createTextToken = (value: string): TextToken => createToken({ type: "text", value });

export const extractText = (tokens?: TextToken[]): string => {
  if (!tokens?.length) return "";
  return tokens.map((t) => (typeof t.value === "string" ? t.value : extractText(t.value))).join("");
};

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

export const buildRichBlock = (
  type: RichType,
  titleToken: TextToken[] | string | undefined,
  content: TextToken[] | string,
  defaultTitleI18nKey: CommonI18nKeys,
): TextToken => {
  const titleStr =
    typeof titleToken === "string" ? titleToken : titleToken ? extractText(titleToken) : "";
  const i18nEntry = commonI18n[defaultTitleI18nKey] as unknown as I18nMap;

  const finalContent: TextToken[] =
    typeof content === "string" ? [createTextToken(content)] : content;

  return createToken({
    type,
    title: unescapeInline(titleStr).trim() || i18nEntry[lang.value] || i18nEntry.en,
    value: finalContent,
  });
};

export const buildPlainRawBlock = (
  type: TitledBlockType,
  arg: string | undefined,
  content: string,
  defaultTitleI18nKey: CommonI18nKeys,
): TextToken => {
  return buildRichBlock(type, arg, [createTextToken(content)], defaultTitleI18nKey);
};

export const buildLabeledInlineBlock = (
  type: TitledBlockType,
  tokens: TextToken[],
  defaultTitleI18nKey: CommonI18nKeys,
): TextToken => {
  const parts = splitTokensByPipe(tokens);
  const title = parts[0];
  const content = parts.slice(1).flat();

  if (parts.length <= 1) {
    return buildRichBlock(type, undefined, title ?? [], defaultTitleI18nKey);
  }

  return buildRichBlock(type, title, content, defaultTitleI18nKey);
};

export const normalizeLang = (codeLang?: string): SupportedLang => {
  const tsAliases = ["js", "javascript", "ts", "typescript"];
  if (!codeLang) return "typescript";
  const normalized = codeLang.trim().toLowerCase();
  if (tsAliases.includes(normalized)) {
    return "typescript";
  }
  if (!(ALLOWED_LANGS as unknown as string[]).includes(normalized)) {
    const unsupportedCodeLanguage = commonI18n.unsupportedCodeLanguage as I18nMap;
    const unsupportedCodeLanguageMsg = (
      unsupportedCodeLanguage[lang.value] || unsupportedCodeLanguage.en
    ).replace("{language}", String(codeLang));
    $message.error(unsupportedCodeLanguageMsg, true, 3000);
    return "text";
  }
  return normalized as SupportedLang;
};
