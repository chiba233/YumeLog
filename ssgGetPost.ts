// noinspection ES6PreferShortImport,DuplicatedCode

import pLimit from "p-limit";

const limit = pLimit(6);
interface TextToken {
  type: string;
  value: string | TextToken[];
  codeLang?: string;
  label?: string;
  title?: string;
  url?: string;
}
interface BaseBlock<T = string> {
  type: string;
  content?: T;
}
interface PostBlock extends BaseBlock<string | ImageContent[]> {
  tokens?: TextToken[];
}
interface ImageContent {
  src: string;
  spareUrl?: string;
  desc?: string;
}

interface DSLNode {
  name: string;
  content: string;
}
interface SyntaxConfig {
  blockPrefix: string;
  blockEnd: string;
}
type BlockContent = PostBlock["content"];
type DSLTree = DSLNode[];
type BlockParser = (content: string) => BlockContent;

export const parseDashObjectList = (content: string): Record<string, string>[] => {
  const lines = content.split(/\r?\n/);
  const result: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;
  let multiKey: string | null = null;
  let multiBuffer: string[] = [];

  const flushMulti = () => {
    if (current && multiKey && multiBuffer.length > 0) {
      const indents = multiBuffer
        .filter((l) => l.trim() !== "")
        .map((l) => l.match(/^(\s*)/)?.[1].length ?? 0);

      const minIndent = indents.length ? Math.min(...indents) : 0;

      current[multiKey] = multiBuffer
        .map((l) => l.slice(minIndent))
        .join("\n")
        .trimEnd();
    }

    multiKey = null;
    multiBuffer = [];
  };

  const processValue = (raw: string): string => {
    return stripQuotes(raw.trim());
  };
  for (const raw of lines) {
    if (multiKey) {
      if (/^\s+/.test(raw) || raw.trim() === "") {
        if (raw.trim() === "") {
          multiBuffer.push("");
          continue;
        }

        multiBuffer.push(raw);
        continue;
      } else {
        flushMulti();
      }
    }

    if (!raw.trim()) continue;

    if (raw.startsWith("- ") || raw.startsWith("  ")) {
      const isListItem = raw.startsWith("- ");

      if (isListItem) {
        flushMulti();
        if (current && Object.keys(current).length > 0) {
          result.push(current);
        }
        current = {};
      }

      if (!current) {
        console.error("孤立属性，已忽略");
        continue;
      }

      const contentPart = isListItem ? raw.slice(2) : raw.trimStart();
      const i = contentPart.indexOf(": ");
      if (i === -1) {
        console.error("[DSL Warning] 格式错误，已忽略行");
        continue;
      }

      const key = contentPart.slice(0, i).trim();
      const valuePart = contentPart.slice(i + 2);

      if (valuePart.trim() === "|") {
        multiKey = key;
        continue;
      }

      current[key] = processValue(valuePart);
    } else {
      console.error("无法识别的行，已跳过");
    }
  }

  flushMulti();
  if (current && Object.keys(current).length > 0) {
    result.push(current);
  }
  return result;
};

const blockParsers: Record<string, BlockParser> = {
  image(content: string) {
    return parseDashObjectList(content) as unknown as ImageContent[];
  },
};

const syntax: SyntaxConfig = {
  blockPrefix: "@",
  blockEnd: "end",
};

const stripQuotes = (value: string): string => {
  const len = value.length;
  if (len < 2) return value;

  const first = value[0];
  if ((first === '"' || first === "'") && value[len - 1] === first) {
    const content = value.slice(1, -1);

    return content.includes("\\")
      ? content.replace(/\\(["\\])/g, (_: string, p1: string) => p1)
      : content;
  }

  return value;
};

const getBlockName = (line: string): string | null => {
  if (!line.startsWith(syntax.blockPrefix)) return null;
  const name = line.slice(syntax.blockPrefix.length);
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return null;
  }

  return name;
};
const parseDSL = (text: string): DSLTree => {
  text = text.replace(/^\uFEFF/, "");
  const lines = text.split(/\r\n|\n|\r/);

  const nodes: DSLNode[] = [];
  let currentName: string | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (!currentName) return;
    nodes.push({ name: currentName, content: buffer.join("\n").replace(/\n+$/, "") });
    buffer = [];
    currentName = null;
  };

  for (const line of lines) {
    const escapeMatch = line.match(/^(\\+)/);
    if (escapeMatch) {
      const remainingContent = line.slice(escapeMatch[1].length);
      if (getBlockName(remainingContent) !== null) {
        const slashCount = escapeMatch[1].length;
        const remainingSlashes = "\\".repeat(Math.max(0, slashCount - 1));
        buffer.push(remainingSlashes + remainingContent);
        continue;
      }
    }

    const name = getBlockName(line);

    if (name !== null) {
      if (name === syntax.blockEnd) {
        flush();
        continue;
      }
      if (currentName) {
        console.error(`Nested DSL block not allowed: ${name}`);
      }
      flush();
      currentName = name;
      continue;
    }

    if (currentName) {
      buffer.push(line);
    }
  }

  flush();
  if (currentName) {
    console.error(`DSL block not closed: ${currentName}`);
  }
  return nodes;
};

const applyMeta = (
  content: string,
  target: Record<string, unknown>,
  reservedKeys: Set<string> = new Set(["blocks"]),
) => {
  const len = content.length;
  let start = 0;
  while (start < len) {
    let nextNewline = -1;
    for (let i = start; i < len; i++) {
      const char = content[i];
      if (char === "\n" || char === "\r") {
        nextNewline = i;
        break;
      }
    }
    const end = nextNewline === -1 ? len : nextNewline;
    if (end > start) {
      const line = content.slice(start, end);
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();

        if (reservedKeys.has(key)) {
          console.error(`[DSL Warning] Reserved key: ${key}`);
          continue;
        }

        if (key in target) {
          console.error(`[DSL Warning] Duplicate key: ${key}`);
        }

        target[key] = value;
      }
    }
    if (nextNewline === -1) {
      break;
    } else {
      if (
        content[nextNewline] === "\r" &&
        nextNewline + 1 < len &&
        content[nextNewline + 1] === "\n"
      ) {
        start = nextNewline + 2;
      } else {
        start = nextNewline + 1;
      }
    }
  }
};
type FinalPost = Record<string, unknown> & { blocks: PostBlock[] };
export const astToPost = (ast: DSLTree): FinalPost => {
  const result = { blocks: [] } as FinalPost;
  for (const node of ast) {
    if (node.name === "meta") {
      applyMeta(node.content, result);
      continue;
    }
    const parser = blockParsers[node.name];
    result.blocks.push({
      type: node.name,
      content: parser ? parser(node.content) : node.content,
    });
  }

  return result;
};

interface BaseContent {
  id?: string;
  time?: string;
  pin?: boolean;
}

interface YamlConfigItem {
  listUrl: string;
  url: string;
  spareUrl?: string;
  spareListUrl?: string;
}

interface PostWithTs extends BaseContent {
  _ts: number;
}

type YamlUrlConfig = Record<string, YamlConfigItem>;

export const loadAllPostsForSSG = async (type: string): Promise<BaseContent[]> => {
  const base = process.env.VITE_SITE_URL ?? "http://localhost:14514";

  const normalize = (p: string) => {
    if (/^https?:\/\//.test(p)) return p;
    return `${base.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;
  };

  const configRes = await fetch(normalize("./data/config/yamlUrl.json"));
  const config = (await configRes.json()) as YamlUrlConfig;

  const item = config[type];
  if (!item) return [];

  const { listUrl, url: baseUrl, spareListUrl, spareUrl } = item;

  let listRes = await fetch(normalize(listUrl));

  if (!listRes.ok && spareListUrl) {
    listRes = await fetch(normalize(spareListUrl));
  }

  if (!listRes.ok) return [];

  const list = (await listRes.json()) as string[];

  const posts = await Promise.all(
    list.map((name) =>
      limit(async () => {
        let res = await fetch(`${baseUrl}${name}`);

        if (!res.ok && spareUrl) {
          res = await fetch(`${spareUrl}${name}`);
        }

        if (!res.ok) return null;

        const text = await res.text();
        const ast = parseDSL(text);
        const parsed = astToPost(ast);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed as BaseContent;
      }),
    ),
  );

  const valid = posts.filter((p): p is BaseContent => p !== null);

  const parseTime = (t?: string): number => {
    if (!t) return 0;

    if (/^\d{8}$/.test(t)) {
      const iso = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
      return Date.parse(iso);
    }

    return Date.parse(t) || 0;
  };

  const withTs: PostWithTs[] = valid.map((p) => ({
    ...p,
    _ts: parseTime(p.time),
  }));

  withTs.sort((a, b) => {
    if (a.pin && !b.pin) return -1;
    if (!a.pin && b.pin) return 1;
    return b._ts - a._ts;
  });

  return withTs;
};
