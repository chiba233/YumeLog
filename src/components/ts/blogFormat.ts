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

export type BlockType = (typeof BLOCK_TYPES)[number];
export type RichType = (typeof RICH_TYPES)[number];

export interface TextToken {
  type: RichType | "text";
  value: string | TextToken[];
  title?: string;
  url?: string;
}

const TAG_PREFIX = "$$";
const END_TAG = ")$$";
const TAG_OPEN = "(";
const TAG_DIVIDER = "|";

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

const splitTokensByPipe = (tokens: TextToken[]): TextToken[][] => {
  const parts: TextToken[][] = [[]];

  for (const token of tokens) {
    if (token.type !== "text" || typeof token.value !== "string") {
      parts[parts.length - 1].push(token);
      continue;
    }

    const segments = token.value.split(TAG_DIVIDER);

    segments.forEach((seg, i) => {
      if (i > 0) {
        parts.push([]);
      }

      const cleaned = seg.trim();

      if (cleaned !== "") {
        parts[parts.length - 1].push({
          type: "text",
          value: cleaned,
        });
      }
    });
  }

  return parts;
};

const TAG_HANDLERS: Partial<Record<RichType, (tokens: TextToken[]) => TextToken>> = {
  link: (tokens) => {
    const parts = splitTokensByPipe(tokens);
    const titlePart = parts.shift() ?? [];

    return {
      type: "link",
      url: extractText(titlePart).trim(),
      value: parts.length ? parts.flat() : titlePart,
    };
  },

  info: (tokens) => {
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

  warning: (tokens) => {
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

    if (c === TAG_PREFIX[0] && text.startsWith(TAG_PREFIX, i)) {
      let j = i + TAG_PREFIX.length;

      while (j < text.length && isTagChar(text[j])) j++;

      if (text.startsWith(TAG_OPEN, j)) {
        const tag = text.slice(i + TAG_PREFIX.length, j);

        if (stack.length >= depthLimit || ignoredDepth > 0) {
          ignoredDepth++;
          buffer += text.slice(i, j + TAG_OPEN.length);
          if (stack.length === depthLimit && ignoredDepth === 1) {
            console.error(
              `[RichText] Max depth limit (${depthLimit}) reached at index ${i}. Nesting will be flattened.`,
            );
          }
          i = j + TAG_OPEN.length;
          continue;
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
        console.error(
          `[RichText] Unexpected closing tag ")$$" at index ${i}. No matching opening tag found.`,
        );
        buffer += END_TAG;
        i += END_TAG.length;
        continue;
      }

      pushText(buffer);
      buffer = "";

      const node = stack.pop()!;

      if (!isRichType(node.tag)) {
        console.warn(
          `[RichText] Unknown tag "${node.tag}" at index ${i}. Flattening content for compatibility.`,
        );
        current().push(...node.tokens);
        i += END_TAG.length;
        continue;
      }

      const handler = TAG_HANDLERS[node.tag];
      const token: TextToken = handler
        ? handler(node.tokens)
        : {
          type: node.tag,
          value: node.tokens,
        };

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
  if (text.indexOf(TAG_PREFIX) === -1) return text.trim();
  return extractText(parseRichText(text)).trim();
};
