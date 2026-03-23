import commonI18n from "@/data/I18N/commonI18n.json";
import { $message } from "@/shared/lib/app/msgUtils.ts";
import { lang } from "@/shared/lib/app/setupLang.ts";

type I18nMap = Record<string, string>;
const ERROR_SILENCE_WINDOW_MS = 5000;
const lastRichTextErrorAtByKey = new Map<string, number>();
type RichTextErrorBatchEntry = {
  key: string;
  message: string;
};

let richTextErrorBatchDepth = 0;
let richTextErrorBatchEntries: RichTextErrorBatchEntry[] | null = null;

const shouldSilenceRichTextError = (key: string, now: number): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const lastShownAt = lastRichTextErrorAtByKey.get(key);
  if (lastShownAt !== undefined && now - lastShownAt < ERROR_SILENCE_WINDOW_MS) {
    return true;
  }

  lastRichTextErrorAtByKey.set(key, now);

  for (const [cachedKey, cachedAt] of lastRichTextErrorAtByKey) {
    if (now - cachedAt >= ERROR_SILENCE_WINDOW_MS) {
      lastRichTextErrorAtByKey.delete(cachedKey);
    }
  }

  return false;
};

const flushRichTextErrorBatch = () => {
  if (!richTextErrorBatchEntries || richTextErrorBatchEntries.length === 0) {
    return;
  }

  const now = Date.now();
  const visibleEntries: RichTextErrorBatchEntry[] = [];
  const seenKeys = new Set<string>();

  for (const entry of richTextErrorBatchEntries) {
    if (seenKeys.has(entry.key)) {
      continue;
    }

    seenKeys.add(entry.key);

    if (shouldSilenceRichTextError(entry.key, now)) {
      continue;
    }

    visibleEntries.push(entry);
  }

  if (visibleEntries.length === 0) {
    return;
  }

  const content =
    visibleEntries.length === 1
      ? visibleEntries[0].message
      : visibleEntries.map((entry, index) => `${index + 1}. ${entry.message}`).join("\n");

  $message.error(content, true, ERROR_SILENCE_WINDOW_MS);
};

export const beginRichTextErrorBatch = (silent: boolean) => {
  if (silent) return;

  if (richTextErrorBatchDepth === 0) {
    richTextErrorBatchEntries = [];
  }

  richTextErrorBatchDepth++;
};

export const endRichTextErrorBatch = (silent: boolean) => {
  if (silent) return;

  richTextErrorBatchDepth = Math.max(richTextErrorBatchDepth - 1, 0);

  if (richTextErrorBatchDepth > 0) {
    return;
  }

  flushRichTextErrorBatch();
  richTextErrorBatchEntries = null;
};

export const withRichTextErrorBatch = <T>(silent: boolean, run: () => T): T => {
  beginRichTextErrorBatch(silent);

  try {
    return run();
  } finally {
    endRichTextErrorBatch(silent);
  }
};

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

  if (richTextErrorBatchEntries) {
    richTextErrorBatchEntries.push({
      key: String(key),
      message: msg,
    });
    return;
  }

  if (shouldSilenceRichTextError(String(key), Date.now())) {
    return;
  }

  $message.error(msg, true, ERROR_SILENCE_WINDOW_MS);
};
