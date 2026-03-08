export const RICH_TYPES = [
  "bold",
  "thin",
  "underline",
  "strike",
  "center",
  "link",
  "code",
  "info",
  "warning",
] as const;

export const BLOCK_TYPES = ["info", "warning", "center"] as const;

export type RichType = (typeof RICH_TYPES)[number];

export interface TextToken {
  type: RichType | "text";
  value: string | TextToken[];
  title?: string;
  url?: string;
}

const TAG_PREFIX = "$$";
const END_TAG = ")$$";
const START_TAG_REGEX = /\$\$([a-z][a-z0-9_-]*)\(/y;

const splitLinkContent = (text: string): [string, string | null] => {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") {
      depth++;
      continue;
    }
    if (c === ")") {
      if (depth > 0) depth--;
      continue;
    }
    if (c === "|" && depth === 0) {
      return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
    }
  }
  return [text.trim(), null];
};

//提取 AST 中纯文本
const extractText = (ts: TextToken[]): string =>
  ts.map((t) => (typeof t.value === "string" ? t.value : extractText(t.value))).join("");

const TAG_HANDLERS: Partial<Record<RichType, (inner: string, depth: number) => TextToken>> = {
  link: (inner, depth) => {
    const [urlPart, displayPart] = splitLinkContent(inner);
    const urlTokens = parseRichText(urlPart, depth);
    return {
      type: "link",
      url: extractText(urlTokens),
      value: displayPart !== null ? parseRichText(displayPart, depth) : urlTokens,
    };
  },

  info: (inner, depth) => {
    const [titlePart, contentPart] = splitLinkContent(inner);
    return {
      type: "info",
      title: titlePart,
      value: parseRichText(contentPart ?? titlePart, depth),
    };
  },

  warning: (inner, depth) => {
    const [titlePart, contentPart] = splitLinkContent(inner);
    return {
      type: "warning",
      title: titlePart,
      value: parseRichText(contentPart ?? titlePart, depth),
    };
  },
};

export const parseRichText = (text: string, depthLimit = 50): TextToken[] => {
  const tokens: TextToken[] = [];
  let i = 0;

  if (depthLimit <= 0) return [{ type: "text", value: text }];

  const pushText = (str: string) => {
    if (!str) return;

    const last = tokens[tokens.length - 1];

    if (last && last.type === "text" && typeof last.value === "string") {
      last.value += str;
    } else {
      tokens.push({ type: "text", value: str });
    }
  };

  while (i < text.length) {
    const startIdx = text.indexOf(TAG_PREFIX, i);

    if (startIdx === -1) {
      pushText(text.slice(i));
      break;
    }

    if (startIdx > i) {
      pushText(text.slice(i, startIdx));
    }

    START_TAG_REGEX.lastIndex = startIdx;
    const match = START_TAG_REGEX.exec(text);

    if (match) {
      const contentStart = START_TAG_REGEX.lastIndex;

      let depth = 1;
      let cur = contentStart;
      let end = -1;

      while (cur < text.length) {
        if (text.startsWith(TAG_PREFIX, cur)) {
          START_TAG_REGEX.lastIndex = cur;
          if (START_TAG_REGEX.exec(text)) {
            depth++;
            cur = START_TAG_REGEX.lastIndex;
            continue;
          }

          cur += TAG_PREFIX.length;
        } else if (text.startsWith(END_TAG, cur)) {
          if (--depth === 0) {
            end = cur;
            break;
          }

          cur += END_TAG.length;
        } else cur++;
      }

      if (end !== -1) {
        const inner = text.slice(contentStart, end);
        const tagName = match[1] as RichType;
        if (RICH_TYPES.includes(tagName)) {
          const handler = TAG_HANDLERS[tagName];
          tokens.push(
            handler
              ? handler(inner, depthLimit - 1)
              : { type: tagName, value: parseRichText(inner, depthLimit - 1) },
          );
        } else {
          parseRichText(inner, depthLimit - 1).forEach((t) => {
            if (t.type === "text" && typeof t.value === "string") {
              pushText(t.value);
            } else {
              tokens.push(t);
            }
          });
        }

        i = end + END_TAG.length;
        if ((BLOCK_TYPES as readonly string[]).includes(tagName)) {
          if (text.startsWith("\r\n", i)) i += 2;
          else if (text[i] === "\n") i++;
        }
        continue;
      }
    }

    pushText(text[startIdx]);
    i = startIdx + 1;
  }

  return tokens;
};

export const stripRichText = (text: string): string => {
  return extractText(parseRichText(text)).trim();
};
