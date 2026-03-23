import commonI18n from "@/data/I18N/commonI18n.json";
import { $message } from "@/shared/lib/app/msgUtils.ts";
import { lang } from "@/shared/lib/app/setupLang.ts";

type I18nMap = Record<string, string>;

export const getErrorContext = (text: string, index: number, length = 1, range = 15) => {
  const lines = text.slice(0, index).split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  const start = Math.max(0, index - range);
  const end = Math.min(text.length, index + length + range);

  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  const before = text.slice(start, index);
  const content = text.slice(index, index + length);
  const after = text.slice(index + length, end);

  const highlightedSnippet = `${prefix}${before} >>>${content}<<< ${after}${suffix}`;

  return {
    line,
    column,
    snippet: highlightedSnippet.replace(/\n/g, " "),
  };
};

export const emitI18nError = (
  key: keyof typeof commonI18n,
  replacements: Record<string, string | number>,
  silent: boolean,
  text?: string,
  index?: number,
  length?: number,
) => {
  if (silent) return;

  const entry = commonI18n[key] as unknown as I18nMap;
  let msg = entry[lang.value] || entry.en;

  if (text !== undefined && index !== undefined) {
    const { line, column, snippet } = getErrorContext(text, index, length);
    replacements.line = line;
    replacements.column = column;
    replacements.context = snippet;
  }

  for (const [k, v] of Object.entries(replacements)) {
    msg = msg.replace(`{${k}}`, () => String(v));
  }

  $message.error(msg, true, 5000);
};
