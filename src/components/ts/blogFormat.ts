export interface TextToken {
  type: RichType | "text";
  value: string | TextToken[];
  url?: string;
}

const RICH_TYPES = ["bold", "thin", "underline", "strike", "center", "link"] as const;
const BLOCK_TYPES = ["center"] as const;

export type RichType = (typeof RICH_TYPES)[number];

const TAG_PREFIX = "$$";
const END_TAG = ")$$";

const START_TAG_REGEX = /\$\$([a-z]+)\(/y;

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
      return [
        text.slice(0, i).trim(),
        text.slice(i + 1).trim(),
      ];
    }
  }

  return [text.trim(), null];
};

//提取 AST 中纯文本

const extractText = (ts: TextToken[]): string =>
  ts.map(t => typeof t.value === "string" ? t.value : extractText(t.value)).join("");

// 主解析器
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
      const tagName = match[1];
      const contentStart = START_TAG_REGEX.lastIndex;

      let depth = 1;
      let cur = contentStart;
      let end = -1;

      while (cur < text.length) {
        const nextStart = text.indexOf(TAG_PREFIX, cur);
        const nextEnd = text.indexOf(END_TAG, cur);

        if (nextEnd === -1) break;

        if (nextStart !== -1 && nextStart < nextEnd) {
          START_TAG_REGEX.lastIndex = nextStart;

          const nested = START_TAG_REGEX.exec(text);

          if (nested) {
            depth++;
            cur = START_TAG_REGEX.lastIndex;
            continue;
          }

          cur = nextStart + 2;
        } else {
          depth--;

          if (depth === 0) {
            end = nextEnd;
            break;
          }

          cur = nextEnd + END_TAG.length;
        }
      }

      if (end !== -1) {
        const inner = text.slice(contentStart, end);

        if ((RICH_TYPES as readonly string[]).includes(tagName)) {

          if (tagName === "link") {
            const [urlPart, displayPart] = splitLinkContent(inner);

            if (displayPart !== null) {
              const parsedUrl = parseRichText(urlPart, depthLimit - 1);

              tokens.push({
                type: "link",
                url: extractText(parsedUrl),
                value: parseRichText(displayPart, depthLimit - 1),
              });

            } else {

              const parsed = parseRichText(urlPart, depthLimit - 1);

              tokens.push({
                type: "link",
                url: extractText(parsed),
                value: parsed,
              });
            }

          } else {

            tokens.push({
              type: tagName as RichType,
              value: parseRichText(inner, depthLimit - 1),
            });

          }

        } else {

          const parsedInner = parseRichText(inner, depthLimit - 1);

          for (const t of parsedInner) {
            if (t.type === "text" && typeof t.value === "string") {
              pushText(t.value);
            } else {
              tokens.push(t);
            }
          }

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

//去除所有富文本
export const stripRichText = (text: string): string => {
  const tokens = parseRichText(text);

  const flatten = (ts: TextToken[]): string =>
    ts.map(t => typeof t.value === "string"
      ? t.value
      : flatten(t.value),
    ).join("");

  return flatten(tokens).trim();
};