interface TextToken {
  type: RichType | "text";
  value: string | TextToken[];
}

const RICH_TYPES = ["bold", "thin", "underline", "strike", "center", "link"] as const;
const BLOCK_TYPES = ["center"];
export type RichType = (typeof RICH_TYPES)[number];

const TAG_PREFIX = "$$";
const END_TAG = ")$$";
const START_TAG_PATTERN = `\\$\\$([a-z]+)\\(`;
const makeTagRegex = () => new RegExp(`${START_TAG_PATTERN}`, "gy");

// 主解析器
export const parseRichText = (text: string, depthLimit = 50): TextToken[] => {
  const TAG_REGEX = makeTagRegex();
  const tokens: TextToken[] = [];
  let i = 0;

  if (depthLimit <= 0) return [{ type: "text", value: text }];

  while (i < text.length) {
    const startIdx = text.indexOf(TAG_PREFIX, i);

    if (startIdx === -1) {
      const remaining = text.slice(i);
      if (remaining) tokens.push({ type: "text", value: remaining });
      break;
    }

    if (startIdx > i) {
      tokens.push({ type: "text", value: text.slice(i, startIdx) });
    }

    TAG_REGEX.lastIndex = startIdx;
    const match = TAG_REGEX.exec(text);

    if (match) {
      const tagName = match[1];
      const contentStartIndex = TAG_REGEX.lastIndex;

      // 寻找对应的结束标签
      let depth = 1;
      let cur = contentStartIndex;
      let contentEndIndex = -1;

      while (cur < text.length) {
        const nextStart = text.indexOf(TAG_PREFIX, cur);
        const nextEnd = text.indexOf(END_TAG, cur);

        if (nextEnd === -1) break;

        if (nextStart !== -1 && nextStart < nextEnd) {
          // 进一步确认是否是有效的起始标签 $$name(
          TAG_REGEX.lastIndex = nextStart;
          if (TAG_REGEX.test(text)) {
            depth++;
            cur = TAG_REGEX.lastIndex;
            continue;
          }
          cur = nextStart + 2;
        } else {
          depth--;
          if (depth === 0) {
            contentEndIndex = nextEnd;
            break;
          }
          cur = nextEnd + END_TAG.length;
        }
      }

      if (contentEndIndex !== -1) {
        const innerText = text.slice(contentStartIndex, contentEndIndex);
        const parsedInner = parseRichText(innerText, depthLimit - 1);

        // 只有在 RICH_TYPES 里的才作为 tag，否则打平
        if ((RICH_TYPES as readonly string[]).includes(tagName)) {
          tokens.push({ type: tagName as RichType, value: parsedInner });
        } else {
          tokens.push(...parsedInner);
        }

        i = contentEndIndex + END_TAG.length;

        // 块级元素换行处理
        if (BLOCK_TYPES.includes(tagName)) {
          if (text[i] === "\n") i++;
          else if (text.startsWith("\r\n", i)) i += 2;
        }
        continue;
      }
    }

    // 如果虽然有 $$ 但不是合法标签，当作普通文本跳过
    tokens.push({ type: "text", value: TAG_PREFIX });
    i = startIdx + TAG_PREFIX.length;
  }

  return tokens;
};
// strip 版本
export const stripRichText = (text: string): string => {
  const tokens = parseRichText(text);

  const flatten = (ts: TextToken[]): string => {
    return ts.map(t => typeof t.value === "string" ? t.value : flatten(t.value)).join("");
  };

  return flatten(tokens).trim();
};