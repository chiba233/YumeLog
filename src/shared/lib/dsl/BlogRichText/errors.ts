import type { ErrorCode, ParseError } from "yume-dsl-rich-text";
import commonI18n from "@/data/I18N/commonI18n.json";
import { $message } from "@/shared/lib/app/msgUtils.ts";
import { lang } from "@/shared/lib/app/setupLang.ts";
import { isSSR } from "../../app/useHead";

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
  if (isSSR) {
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

const ERROR_CODE_TO_I18N: Record<ErrorCode, keyof typeof commonI18n> = {
  DEPTH_LIMIT: "richTextDepthLimit",
  UNEXPECTED_CLOSE: "richTextUnexpectedClose",
  INLINE_NOT_CLOSED: "richTextInlineNotClosed",
  BLOCK_NOT_CLOSED: "richTextBlockNotClosed",
  BLOCK_CLOSE_MALFORMED: "richTextBlockCloseMalformed",
  RAW_NOT_CLOSED: "richTextRawNotClosed",
  RAW_CLOSE_MALFORMED: "richTextRawCloseMalformed",
};

export const emitLibraryError = (error: ParseError, depthLimit: number) => {
  const i18nKey = ERROR_CODE_TO_I18N[error.code];
  if (!i18nKey) return;

  const entry = commonI18n[i18nKey] as unknown as I18nMap;
  let msg = entry[lang.value] || entry.en;

  const replacements: Record<string, string | number> = {
    line: error.line,
    column: error.column,
    context: error.snippet,
    i: 0,
    depthLimit,
  };

  for (const [k, v] of Object.entries(replacements)) {
    msg = msg.replace(`{${k}}`, () => String(v));
  }

  if (richTextErrorBatchEntries) {
    richTextErrorBatchEntries.push({ key: String(i18nKey), message: msg });
    return;
  }

  if (shouldSilenceRichTextError(String(i18nKey), Date.now())) {
    return;
  }

  $message.error(msg, true, ERROR_SILENCE_WINDOW_MS);
};
