import { $message } from "@/components/ts/msgUtils.ts";
import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/components/ts/setupLang.ts";
import { BLOCK_TYPES, BlockType, RICH_TYPES, RichType, TagHandler, TextToken } from "./d";

type I18nMap = Record<string, string>;
const TAG_PREFIX = "$$";
const TAG_OPEN = "(";
const TAG_CLOSE = ")";
const TAG_DIVIDER = "|";
const END_TAG = ")$$";
const RAW_OPEN = ")%";
const RAW_CLOSE = "%end$$";

const RICH_TYPE_SET: ReadonlySet<RichType> = new Set(RICH_TYPES);
const BLOCK_TYPES_SET: ReadonlySet<BlockType> = new Set(BLOCK_TYPES);

const isRichType = (tag: string): tag is RichType => RICH_TYPE_SET.has(tag as RichType);

const isTagChar = (c: string) =>
  (c >= "a" && c <= "z") ||
  (c >= "A" && c <= "Z") ||
  (c >= "0" && c <= "9") ||
  c === "_" ||
  c === "-";

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

    let sPos = 0;
    let pipeIdx: number;
    while ((pipeIdx = token.value.indexOf(TAG_DIVIDER, sPos)) !== -1) {
      let segment = token.value.slice(sPos, pipeIdx);
      segment = segment.replace(/\s+$/, "");
      pushText(segment);
      parts.push([]);
      sPos = pipeIdx + 1;
      while (token.value[sPos] === " ") sPos++;
    }

    const remaining = token.value.slice(sPos);
    pushText(remaining);
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
        url: extractText(titlePart).trim(),
        value: parts.length ? parts.flat() : titlePart,
      };
    },
  },

  info: {
    inline: (tokens) => {
      const parts = splitTokensByPipe(tokens);
      if (parts.length === 1) {
        return {
          type: "info",
          title: "Info:",
          value: parts[0],
        };
      }
      const titlePart = parts.shift() ?? [];
      return {
        type: "info",
        title: extractText(titlePart).trim(),
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
      if (parts.length === 1) {
        return {
          type: "warning",
          title: "Warning:",
          value: parts[0],
        };
      }
      const titlePart = parts.shift() ?? [];

      return {
        type: "warning",
        title: extractText(titlePart).trim(),
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
      const codeLang = normalizeLang(extractText(parts[0] ?? []).trim());
      const title = extractText(parts[1] ?? []).trim();
      const label = extractText(parts[2] ?? []).trim();
      return {
        type: "raw-code",
        codeLang,
        title: title || "Code:",
        label,
        value: content.trim(),
      };
    },
  },
};

export const parseRichText = (text: string, depthLimit = 50): TextToken[] => {
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
    const c = text[i];

    if (text.startsWith(TAG_PREFIX, i)) {
      let j = i + TAG_PREFIX.length;

      while (j < text.length && isTagChar(text[j])) j++;

      if (text.startsWith(TAG_OPEN, j)) {
        const tag = text.slice(i + TAG_PREFIX.length, j);

        if (stack.length >= depthLimit || ignoredDepth > 0) {
          if (stack.length === depthLimit && ignoredDepth === 0) {
            const depthEntry = commonI18n.richTextDepthLimit as I18nMap;
            const depthMsg = (depthEntry[lang.value] || depthEntry.en)
              .replace("{depthLimit}", String(depthLimit))
              .replace("{i}", String(i));
            $message.error(depthMsg, true, 3000);
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
            let end = -1;
            let pos = contentStart;
            while (true) {
              pos = text.indexOf(RAW_CLOSE, pos);
              if (pos === -1) break;
              const before = pos === 0 || text[pos - 1] === "\n";
              const after =
                pos + RAW_CLOSE.length === text.length ||
                text[pos + RAW_CLOSE.length] === "\n" ||
                text.startsWith("\r\n", pos + RAW_CLOSE.length);
              if (before && after) {
                end = pos;
                break;
              }
              pos += RAW_CLOSE.length;
            }
            if (end === -1) {
              const rawEntry = commonI18n.richTextRawNotClosed as I18nMap;
              const rawMsg = (rawEntry[lang.value] || rawEntry.en).replace("{i}", String(i));
              $message.error(rawMsg, true, 3000);
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

        pushText(buffer);
        buffer = "";
        stack.push({ tag, tokens: [] });
        i = j + TAG_OPEN.length;
        continue;
      }
    }

    if (c === END_TAG[0] && text.startsWith(END_TAG, i)) {
      if (ignoredDepth > 0) {
        ignoredDepth--;
        buffer += END_TAG;
        i += END_TAG.length;
        continue;
      }

      if (stack.length === 0) {
        const closeEntry = commonI18n.richTextUnexpectedClose as I18nMap;
        const closeMsg = (closeEntry[lang.value] || closeEntry.en).replace("{i}", String(i));
        $message.error(closeMsg, true, 3000);

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
        $message.error(richTextUnknownTagMsg, true, 3000);
        current().push(...node.tokens);
        i += END_TAG.length;
        continue;
      }

      const handler = TAG_HANDLERS[node.tag];
      let token: TextToken;
      if (handler?.inline) {
        token = handler.inline(node.tokens);
      } else {
        token = {
          type: node.tag,
          value: node.tokens,
        };
      }

      current().push(token);

      i += END_TAG.length;

      if (BLOCK_TYPES_SET.has(node.tag as BlockType)) {
        if (text.startsWith("\r\n", i)) i += 2;
        else if (text[i] === "\n") i++;
      }

      continue;
    }

    buffer += c;
    i++;
  }

  pushText(buffer);

  while (stack.length) {
    const node = stack.pop()!;
    const parent = stack.length ? stack[stack.length - 1].tokens : root;

    const fallback = TAG_PREFIX + node.tag + TAG_OPEN;

    const last = parent[parent.length - 1];

    if (last?.type === "text" && typeof last.value === "string") {
      last.value += fallback;
    } else {
      parent.push({ type: "text", value: fallback });
    }
    parent.push(...node.tokens);
  }
  return root;
};

export const stripRichText = (text?: string): string => {
  if (!text) return "";
  let result = "";
  let i = 0;
  while (i < text.length) {
    let matched = false;
    if (text.startsWith(TAG_PREFIX, i)) {
      let j = i + TAG_PREFIX.length;
      while (j < text.length && isTagChar(text[j])) j++;
      if (text[j] === TAG_OPEN) {
        const tagName = text.slice(i + TAG_PREFIX.length, j);
        let k = j + 1;
        let depth = 1;
        while (k < text.length && depth > 0) {
          if (text[k] === TAG_OPEN) depth++;
          else if (text[k] === TAG_CLOSE) depth--;
          k++;
        }
        if (depth === 0) {
          const closePos = k - 1;
          if (text.startsWith(RAW_OPEN, closePos)) {
            const contentStart = closePos + RAW_OPEN.length;
            let end = -1;
            let pos = contentStart;
            while (true) {
              pos = text.indexOf(RAW_CLOSE, pos);
              if (pos === -1) break;

              const before = pos === 0 || text[pos - 1] === "\n";
              const after =
                pos + RAW_CLOSE.length === text.length ||
                text[pos + RAW_CLOSE.length] === "\n" ||
                text.startsWith("\r\n", pos + RAW_CLOSE.length);
              if (before && after) {
                end = pos;
                break;
              }
              pos += RAW_CLOSE.length;
            }

            if (end !== -1) {
              result += text.slice(contentStart, end);
              i = end + RAW_CLOSE.length;
              if (text.startsWith("\r\n", i)) i += 2;
              else if (text[i] === "\n") i++;

              matched = true;
            }
          } else if (text.startsWith(END_TAG, closePos)) {
            const inner = text.slice(j + 1, closePos);
            result += stripRichText(inner);
            i = closePos + END_TAG.length;
            if (BLOCK_TYPES_SET.has(tagName as BlockType)) {
              if (text.startsWith("\r\n", i)) i += 2;
              else if (text[i] === "\n") i++;
            }
            matched = true;
          }
        }
      }
    }

    if (!matched) {
      result += text[i];
      i++;
    }
  }
  return result.replace(/[\r\n\t]+/g, " ").trim();
};
