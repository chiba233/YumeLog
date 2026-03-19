// noinspection DuplicatedCode

import { $message } from "@/components/ts/msgUtils.ts";
import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/components/ts/setupLang.ts";
import { BLOCK_TYPES, BlockType, RICH_TYPES, RichType, TagHandler, TextToken } from "../../d.ts";

type I18nMap = Record<string, string>;
const TAG_PREFIX = "$$";
const TAG_OPEN = "(";
const TAG_CLOSE = ")";
const TAG_DIVIDER = "|";
const END_TAG = ")$$";
const RAW_OPEN = ")%";
const RAW_CLOSE = "%end$$";
const ESCAPE_CHAR = "\\";

const ESCAPABLE_CHARS = new Set(
  [TAG_OPEN, TAG_CLOSE, TAG_DIVIDER, ESCAPE_CHAR]
    .flatMap((str) => str.split(""))
    .filter((char) => !/[a-zA-Z0-9]/.test(char))
    .filter((char, i, self) => self.indexOf(char) === i),
);

const RICH_TYPE_SET: ReadonlySet<RichType> = new Set(RICH_TYPES);
const BLOCK_TYPES_SET: ReadonlySet<BlockType> = new Set(BLOCK_TYPES);

const isRichType = (tag: string): tag is RichType => RICH_TYPE_SET.has(tag as RichType);

const isTagChar = (c: string) =>
  (c >= "a" && c <= "z") ||
  (c >= "A" && c <= "Z") ||
  (c >= "0" && c <= "9") ||
  c === "_" ||
  c === "-";

const unescapeInline = (str: string): string => {
  let result = "";
  let i = 0;
  while (i < str.length) {
    if (str[i] === ESCAPE_CHAR && i + 1 < str.length && ESCAPABLE_CHARS.has(str[i + 1])) {
      result += str[i + 1];
      i += 2;
      continue;
    }
    result += str[i++];
  }
  return result;
};

const readEscaped = (text: string, i: number): [string, number] => {
  if (text[i] === ESCAPE_CHAR && i + 1 < text.length) {
    const nextChar = text[i + 1];
    if (ESCAPABLE_CHARS.has(nextChar)) {
      // 只有遇到 | 和 \ 时保留转义符面具，其他全部直接脱壳
      if (nextChar === TAG_DIVIDER[0] || nextChar === ESCAPE_CHAR) {
        return [ESCAPE_CHAR + nextChar, i + 2];
      }
      return [nextChar, i + 2];
    }
  }
  return [text[i], i + 1];
};

const findRawClose = (text: string, start: number): number => {
  let pos = start;
  while (pos < text.length) {
    let lineEnd = text.indexOf("\n", pos);
    if (lineEnd === -1) {
      lineEnd = text.length;
    } else if (lineEnd > pos && text[lineEnd - 1] === "\r") {
      lineEnd--;
    }
    if (text.startsWith(RAW_CLOSE, pos) && pos + RAW_CLOSE.length === lineEnd) {
      return pos;
    }
    pos = lineEnd + 1;
  }
  return -1;
};

const extractText = (tokens?: TextToken[]): string => {
  if (!tokens?.length) return "";
  return tokens.map((t) => (typeof t.value === "string" ? t.value : extractText(t.value))).join("");
};

const ALLOWED_LANGS = ["typescript", "bash", "json", "yaml", "vue", "html", "text"] as const;
type SupportedLang = (typeof ALLOWED_LANGS)[number];
const normalizeLang = (codeLang?: string): SupportedLang => {
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

const splitTokensByPipe = (tokens: TextToken[]): TextToken[][] => {
  const parts: TextToken[][] = [[]];

  const pushText = (text: string) => {
    if (!text) return;
    parts[parts.length - 1].push({ type: "text", value: text });
  };

  for (const token of tokens) {
    if (token.type !== "text" || typeof token.value !== "string") {
      parts[parts.length - 1].push(token);
      continue;
    }

    let buffer = "";
    let i = 0;
    const val = token.value;

    const flush = () => {
      if (buffer) {
        pushText(buffer);
        buffer = "";
      }
    };

    while (i < val.length) {
      if (val[i] === ESCAPE_CHAR && i + 1 < val.length && ESCAPABLE_CHARS.has(val[i + 1])) {
        buffer += val[i + 1];
        i += 2;
        continue;
      }

      if (val[i] === TAG_DIVIDER) {
        flush();
        parts.push([]);
        i++;
        while (i < val.length && val[i] === " ") i++;
        continue;
      }
      buffer += val[i++];
    }
    flush();
  }
  return parts;
};

const TAG_HANDLERS: Record<string, TagHandler> = {
  link: {
    inline: (tokens) => {
      const parts = splitTokensByPipe(tokens);
      const titlePart = parts.shift() ?? [];
      return {
        type: "link",
        url: unescapeInline(extractText(titlePart)).trim(),
        value: parts.length ? parts.flat() : titlePart,
      };
    },
  },
  info: {
    inline: (tokens) => {
      const parts = splitTokensByPipe(tokens);
      if (parts.length === 1) return { type: "info", title: "Info:", value: parts[0] };
      const titlePart = parts.shift() ?? [];
      return {
        type: "info",
        title: unescapeInline(extractText(titlePart)).trim(),
        value: parts.flat(),
      };
    },
    raw: (title, content) => ({
      type: "info",
      title: title || "Info:",
      value: [{ type: "text", value: content }],
    }),
  },
  warning: {
    inline: (tokens) => {
      const parts = splitTokensByPipe(tokens);
      if (parts.length === 1) return { type: "warning", title: "Warning:", value: parts[0] };
      const titlePart = parts.shift() ?? [];
      return {
        type: "warning",
        title: unescapeInline(extractText(titlePart)).trim(),
        value: parts.flat(),
      };
    },
    raw: (title, content) => ({
      type: "warning",
      title: title || "Warning:",
      value: [{ type: "text", value: content }],
    }),
  },
  "raw-code": {
    raw: (arg, content) => {
      const parts = splitTokensByPipe([{ type: "text", value: arg ?? "" }]);
      const codeLang = normalizeLang(unescapeInline(extractText(parts[0] ?? [])).trim());
      const title = unescapeInline(extractText(parts[1] ?? [])).trim();
      const label = unescapeInline(extractText(parts[2] ?? [])).trim();
      return { type: "raw-code", codeLang, title: title || "Code:", label, value: content.trim() };
    },
  },
};

export const parseRichText = (text: string, depthLimit = 50, silent = false): TextToken[] => {
  if (!text) return [];

  const root: TextToken[] = [];
  const stack: { tag: string; tokens: TextToken[] }[] = [];

  let ignoredDepth = 0;
  let buffer = "";
  let i = 0;

  const current = () => (stack.length ? stack[stack.length - 1].tokens : root);

  const pushText = (str: string) => {
    if (!str) return;
    const tokens = current();
    const last = tokens[tokens.length - 1];
    if (last?.type === "text" && typeof last.value === "string") {
      last.value += str;
    } else {
      tokens.push({ type: "text", value: str });
    }
  };

  while (i < text.length) {
    if (text.startsWith(TAG_PREFIX, i)) {
      let j = i + TAG_PREFIX.length;
      while (j < text.length && isTagChar(text[j])) j++;

      if (text.startsWith(TAG_OPEN, j)) {
        pushText(buffer);
        buffer = "";

        const tag = text.slice(i + TAG_PREFIX.length, j);
        if (stack.length >= depthLimit || ignoredDepth > 0) {
          if (stack.length === depthLimit && ignoredDepth === 0) {
            const depthEntry = commonI18n.richTextDepthLimit as I18nMap;
            const depthMsg = (depthEntry[lang.value] || depthEntry.en)
              .replace("{depthLimit}", String(depthLimit))
              .replace("{i}", String(i));
            if (!silent) $message.error(depthMsg, true, 3000);
          }
          ignoredDepth++;
          buffer += text.slice(i, j + TAG_OPEN.length);
          i = j + TAG_OPEN.length;
          continue;
        }

        const handler = TAG_HANDLERS[tag];
        if (handler?.raw) {
          let k = j + 1;
          let depth = 1;
          while (k < text.length && depth > 0) {
            const ch = text[k];
            if (ch === TAG_OPEN) depth++;
            else if (ch === TAG_CLOSE) depth--;
            k++;
          }
          if (depth !== 0) {
            buffer += text.slice(i, j + TAG_OPEN.length);
            i = j + TAG_OPEN.length;
            continue;
          }
          k--;
          if (k < text.length && text.startsWith(RAW_OPEN, k)) {
            pushText(buffer);
            buffer = "";
            const arg = text.slice(j + 1, k).trim();
            const contentStart = k + RAW_OPEN.length;
            const end = findRawClose(text, contentStart);
            if (end === -1) {
              const rawEntry = commonI18n.richTextRawNotClosed as I18nMap;
              const rawMsg = (rawEntry[lang.value] || rawEntry.en).replace("{i}", String(i));
              if (!silent) $message.error(rawMsg, true, 3000);
              buffer += text.slice(i, k + RAW_OPEN.length);
              i = k + RAW_OPEN.length;
              continue;
            }
            const content = text.slice(contentStart, end);
            current().push(handler.raw(arg, content));
            i = end + RAW_CLOSE.length;
            if (text.startsWith("\r\n", i)) i += 2;
            else if (text[i] === "\n") i++;
            continue;
          }
        }

        stack.push({ tag, tokens: [] });
        i = j + TAG_OPEN.length;
        continue;
      }
    }

    if (text.startsWith(END_TAG, i)) {
      if (ignoredDepth > 0) {
        ignoredDepth--;
        buffer += END_TAG;
        i += END_TAG.length;
        continue;
      }
      if (stack.length === 0) {
        const closeEntry = commonI18n.richTextUnexpectedClose as I18nMap;
        const closeMsg = (closeEntry[lang.value] || closeEntry.en).replace("{i}", String(i));
        if (!silent) $message.error(closeMsg, true, 3000);

        buffer += END_TAG;
        i += END_TAG.length;
        continue;
      }

      pushText(buffer);
      buffer = "";
      const node = stack.pop()!;

      if (!isRichType(node.tag)) {
        const richTextUnknownTag = commonI18n.richTextUnknownTag as I18nMap;
        const richTextUnknownTagMsg = (richTextUnknownTag[lang.value] || richTextUnknownTag.en)
          .replace("{tag}", String(node.tag))
          .replace("{i}", String(i));
        if (!silent) $message.error(richTextUnknownTagMsg, true, 3000);

        node.tokens.forEach((t) => {
          if (t.type === "text" && typeof t.value === "string") pushText(unescapeInline(t.value));
          else current().push(t);
        });
      } else {
        const handler = TAG_HANDLERS[node.tag];
        current().push(
          handler?.inline ? handler.inline(node.tokens) : { type: node.tag, value: node.tokens },
        );
      }

      i += END_TAG.length;
      if (BLOCK_TYPES_SET.has(node.tag as BlockType)) {
        if (text.startsWith("\r\n", i)) i += 2;
        else if (text[i] === "\n") i++;
      }
      continue;
    }

    if (text[i] === ESCAPE_CHAR && i + 1 < text.length) {
      const nextChar = text[i + 1];
      if (stack.length > 0) {
        const [char, next] = readEscaped(text, i);
        buffer += char;
        i = next;
        continue;
      } else {
        if (nextChar === TAG_OPEN[0] || nextChar === TAG_CLOSE[0]) {
          buffer += nextChar;
          i += 2;
          continue;
        }
      }
    }

    buffer += text[i];
    i++;
  }

  pushText(buffer);

  while (stack.length) {
    const node = stack.pop()!;
    const fallback = TAG_PREFIX + node.tag + TAG_OPEN;
    const tokens = current();
    const last = tokens[tokens.length - 1];

    if (last?.type === "text" && typeof last.value === "string") {
      last.value += fallback;
    } else {
      tokens.push({ type: "text", value: fallback });
    }

    tokens.push(...node.tokens);
  }

  return root;
};

export const stripRichText = (text?: string): string => {
  if (!text) return "";
  const tokens = parseRichText(text, 50, true);
  return extractText(tokens);
};
